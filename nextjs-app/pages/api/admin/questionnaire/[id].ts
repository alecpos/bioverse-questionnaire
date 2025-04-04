import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { getAuthenticatedUser } from '../../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const user = await getAuthenticatedUser(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'Invalid questionnaire ID' });
    }
    
    // Get questionnaire details
    const questionnaire = await db.query(`
      SELECT 
        id, 
        name, 
        description 
      FROM 
        questionnaires 
      WHERE 
        id = $1
    `, [id]);

    if (questionnaire.rows.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Get questions
    const questions = await db.query(`
      SELECT 
        q.id, 
        q.text, 
        q.type, 
        qq.priority
      FROM 
        questions q
      JOIN 
        questionnaire_questions qq ON q.id = qq.question_id
      WHERE 
        qq.questionnaire_id = $1
      ORDER BY 
        qq.priority ASC, q.id ASC
    `, [id]);

    // For each multiple choice question, fetch its options
    const questionsWithOptions = await Promise.all(questions.rows.map(async (question) => {
      if (question.type === 'multiple_choice') {
        const optionsResult = await db.query(`
          SELECT id, option_text 
          FROM question_options 
          WHERE question_id = $1
        `, [question.id]);
        
        return {
          ...question,
          options: optionsResult.rows.map(opt => opt.option_text)
        };
      }
      
      return question;
    }));

    // Return combined data
    return res.status(200).json({
      ...questionnaire.rows[0],
      questions: questionsWithOptions
    });
  } catch (error: any) {
    console.error('Error fetching questionnaire:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 