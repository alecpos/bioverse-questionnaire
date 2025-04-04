import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getAuthenticatedUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const user = await getAuthenticatedUser(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { questionnaire_id, preserve_responses = false, delete_pending_updates = true } = req.body;
    
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

    // Begin transaction
    await db.query('BEGIN');

    try {
      // Find any pending updates for this questionnaire
      let pendingUpdates: any = { rows: [] };
      if (delete_pending_updates) {
        pendingUpdates = await db.query(
          'SELECT id, name FROM questionnaires WHERE name LIKE $1 AND is_pending = TRUE',
          [`%${questionnaire.rows[0].name.replace(' (PENDING UPDATE)', '')}%`]
        );
      }
      
      // 1. Get all question IDs associated with this questionnaire
      const questionIds = await db.query(
        'SELECT question_id FROM questionnaire_questions WHERE questionnaire_id = $1',
        [questionnaire_id]
      );
      
      const questionIdList = questionIds.rows.map(row => row.question_id);
      
      // 2. Delete junction records
      await db.query(
        'DELETE FROM questionnaire_questions WHERE questionnaire_id = $1',
        [questionnaire_id]
      );
      
      // Also delete junction records for any pending updates
      for (const pendingUpdate of pendingUpdates.rows) {
        await db.query(
          'DELETE FROM questionnaire_questions WHERE questionnaire_id = $1',
          [pendingUpdate.id]
        );
      }
      
      // 3. Delete user responses if not preserving them
      if (!preserve_responses) {
        // Delete multiple choice responses
        await db.query(
          'DELETE FROM user_multiple_choice_responses WHERE questionnaire_id = $1',
          [questionnaire_id]
        );
        
        // Delete text responses
        await db.query(
          'DELETE FROM user_responses WHERE questionnaire_id = $1',
          [questionnaire_id]
        );
        
        // Delete completion records
        await db.query(
          'DELETE FROM questionnaire_completions WHERE questionnaire_id = $1',
          [questionnaire_id]
        );
      }
      
      // 4. Update questionnaire to be non-pending but keep record
      await db.query(
        'UPDATE questionnaires SET is_pending = FALSE WHERE id = $1',
        [questionnaire_id]
      );
      
      // 5. Delete any pending updates if requested
      if (delete_pending_updates) {
        for (const pendingUpdate of pendingUpdates.rows) {
          // Find questions only associated with this pending update
          const pendingQuestionIds = await db.query(
            'SELECT question_id FROM questionnaire_questions WHERE questionnaire_id = $1',
            [pendingUpdate.id]
          );
          
          // Delete the pending questionnaire
          await db.query(
            'DELETE FROM questionnaires WHERE id = $1',
            [pendingUpdate.id]
          );
          
          // Clean up orphaned questions (with negative IDs)
          for (const pendingQuestion of pendingQuestionIds.rows) {
            if (pendingQuestion.question_id < 0) {
              await db.query(
                'DELETE FROM questions WHERE id = $1',
                [pendingQuestion.question_id]
              );
            }
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      return res.status(200).json({
        success: true,
        message: `Questionnaire "${questionnaire.rows[0].name}" has been reset. ${preserve_responses ? 'User responses were preserved.' : 'User responses were deleted.'} ${pendingUpdates.rows.length > 0 ? `${pendingUpdates.rows.length} pending updates were removed.` : ''}`,
        reset_questionnaire_id: questionnaire_id,
        question_count: questionIdList.length,
        pending_updates_removed: pendingUpdates.rows.length
      });
    } catch (error) {
      // Rollback on error
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error resetting questionnaire:', error);
    return res.status(500).json({
      error: 'Failed to reset questionnaire',
      details: error.message
    });
  }
} 