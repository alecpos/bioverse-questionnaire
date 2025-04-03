import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getAuthenticatedUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const user = await getAuthenticatedUser(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Extract data from request body
    const { questionnaire_id, approve } = req.body;
    
    if (!questionnaire_id) {
      return res.status(400).json({ error: 'Missing questionnaire ID' });
    }

    // Check if questionnaire exists
    const questionnaire = await db.query(
      'SELECT id, name FROM questionnaires WHERE id = $1',
      [questionnaire_id]
    );

    if (questionnaire.rows.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Check if this is a "pending update" (negative ID) for an existing questionnaire
    const isPendingUpdate = questionnaire_id < 0;
    const originalId = isPendingUpdate ? Math.abs(questionnaire_id) : null;
    
    // Check if the original questionnaire exists
    let originalExists = false;
    if (isPendingUpdate) {
      const originalCheck = await db.query(
        'SELECT id FROM questionnaires WHERE id = $1',
        [originalId]
      );
      originalExists = originalCheck.rows.length > 0;
    }

    if (approve) {
      // Approve the questionnaire
      if (isPendingUpdate && originalExists) {
        // This is an update to an existing questionnaire
        await db.query('BEGIN');
        
        try {
          // Get all questions from the pending version
          const pendingQuestions = await db.query(
            'SELECT q.* FROM questions q JOIN questionnaire_questions qq ON q.id = qq.question_id WHERE qq.questionnaire_id = $1',
            [questionnaire_id]
          );
          
          // For each question in the pending version:
          // 1. Create/update the question with positive ID
          // 2. Create junction with the original questionnaire ID
          for (const question of pendingQuestions.rows) {
            const originalQuestionId = Math.abs(question.id);
            const optionsString = question.options;
            
            // Check if original question exists
            const existingQuestion = await db.query(
              'SELECT id FROM questions WHERE id = $1',
              [originalQuestionId]
            );
            
            if (existingQuestion.rows.length === 0) {
              // Create new question with original ID
              await db.query(
                'INSERT INTO questions (id, text, type, options) VALUES ($1, $2, $3, $4)',
                [originalQuestionId, question.text, question.type, optionsString]
              );
            } else {
              // Update existing question
              await db.query(
                'UPDATE questions SET text = $1, type = $2, options = $3 WHERE id = $4',
                [question.text, question.type, optionsString, originalQuestionId]
              );
            }
            
            // Create junction entry with original questionnaire ID
            try {
              await db.query(
                'INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority) VALUES ($1, $2, $3)',
                [originalId, originalQuestionId, 0]
              );
            } catch (err: any) {
              if (err.code !== '23505') { // Not a duplicate entry
                throw err;
              }
            }
          }
          
          // Update original questionnaire name and description
          await db.query(
            'UPDATE questionnaires SET name = $1, description = $2, is_pending = FALSE, updated_at = NOW() WHERE id = $3',
            [questionnaire.rows[0].name.replace(' (PENDING UPDATE)', ''), 
             questionnaire.rows[0].description, 
             originalId]
          );
          
          // Delete the pending questionnaire
          await db.query(
            'DELETE FROM questionnaire_questions WHERE questionnaire_id = $1',
            [questionnaire_id]
          );
          
          await db.query(
            'DELETE FROM questionnaires WHERE id = $1',
            [questionnaire_id]
          );
          
          await db.query('COMMIT');
          
          return res.status(200).json({
            success: true,
            message: `Questionnaire '${questionnaire.rows[0].name}' updates have been approved.`
          });
        } catch (error) {
          await db.query('ROLLBACK');
          throw error;
        }
      } else {
        // This is a new questionnaire - just set is_pending to false
        await db.query(
          'UPDATE questionnaires SET is_pending = FALSE WHERE id = $1',
          [questionnaire_id]
        );
        
        return res.status(200).json({
          success: true,
          message: `Questionnaire '${questionnaire.rows[0].name}' has been approved.`
        });
      }
    } else {
      // Reject the questionnaire
      if (isPendingUpdate && originalExists) {
        // This is a pending update to an existing questionnaire
        // Just delete the pending version, but keep the original
        await db.query('BEGIN');
        
        try {
          // Delete junction records for pending version
          await db.query(
            'DELETE FROM questionnaire_questions WHERE questionnaire_id = $1',
            [questionnaire_id]
          );
          
          // Delete pending questionnaire
          await db.query(
            'DELETE FROM questionnaires WHERE id = $1',
            [questionnaire_id]
          );
          
          await db.query('COMMIT');
          
          return res.status(200).json({
            success: true,
            message: `Updates to questionnaire ID ${originalId} have been rejected. Original questionnaire preserved.`
          });
        } catch (error) {
          await db.query('ROLLBACK');
          throw error;
        }
      } else {
        // This is a new questionnaire - delete it completely
        await db.query('BEGIN');
        
        try {
          // First remove junction records
          await db.query(
            'DELETE FROM questionnaire_questions WHERE questionnaire_id = $1',
            [questionnaire_id]
          );
          
          // Then remove the questionnaire
          await db.query(
            'DELETE FROM questionnaires WHERE id = $1',
            [questionnaire_id]
          );
          
          await db.query('COMMIT');
          
          return res.status(200).json({
            success: true,
            message: `Questionnaire '${questionnaire.rows[0].name}' has been rejected and removed.`
          });
        } catch (error) {
          await db.query('ROLLBACK');
          throw error;
        }
      }
    }
  } catch (error: any) {
    console.error('Error approving/rejecting questionnaire:', error);
    return res.status(500).json({
      error: 'Failed to process questionnaire',
      details: error.message
    });
  }
} 