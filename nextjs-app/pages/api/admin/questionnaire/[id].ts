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
    
    if (!id) {
      return res.status(400).json({ error: 'Missing questionnaire ID' });
    }
    
    // Parse ID as number
    const questionnaireId = parseInt(String(id), 10);
    
    if (isNaN(questionnaireId)) {
      return res.status(400).json({ error: 'Invalid questionnaire ID' });
    }

    // Fetch questionnaire details
    const questionnaire = await db.query(
      'SELECT id, name, description FROM questionnaires WHERE id = $1',
      [questionnaireId]
    );

    if (questionnaire.rows.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Fetch all questions for this questionnaire with their priority
    const questions = await db.query(`
      SELECT 
        q.id,
        q.text,
        q.type,
        q.options,
        qq.priority
      FROM 
        questions q
      JOIN 
        questionnaire_questions qq ON q.id = qq.question_id
      WHERE 
        qq.questionnaire_id = $1
      ORDER BY 
        qq.priority ASC, q.id ASC
    `, [questionnaireId]);

    // Return combined data
    return res.status(200).json({
      ...questionnaire.rows[0],
      questions: questions.rows
    });
  } catch (error: any) {
    console.error('Error fetching questionnaire details:', error);
    return res.status(500).json({ error: 'Failed to fetch questionnaire details' });
  }
} 