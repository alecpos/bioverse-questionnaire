import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getAuthenticatedUser } from '../../../lib/auth';

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

    // Fetch all questionnaires with questions
    const queryResult = await db.query(`
      SELECT 
        q.id AS questionnaire_id,
        q.name AS questionnaire_name,
        q.description AS questionnaire_description,
        q.created_at AS questionnaire_created_at,
        ques.id AS question_id,
        ques.text AS question_text,
        ques.type AS question_type,
        ques.options AS question_options,
        qq.priority AS question_priority
      FROM 
        questionnaires q
      LEFT JOIN 
        questionnaire_questions qq ON q.id = qq.questionnaire_id
      LEFT JOIN 
        questions ques ON qq.question_id = ques.id
      ORDER BY 
        q.id, qq.priority
    `);

    // Group results by questionnaire
    const questionnaires = [];
    let currentQuestionnaire: any = null;

    for (const row of queryResult.rows) {
      // If we're on a new questionnaire or the first one
      if (!currentQuestionnaire || currentQuestionnaire.id !== row.questionnaire_id) {
        // Save the previous questionnaire if it exists
        if (currentQuestionnaire) {
          questionnaires.push(currentQuestionnaire);
        }

        // Create a new questionnaire object
        currentQuestionnaire = {
          id: row.questionnaire_id,
          name: row.questionnaire_name,
          description: row.questionnaire_description,
          created_at: row.questionnaire_created_at,
          questions: []
        };
      }

      // Skip if there are no questions for this questionnaire
      if (row.question_id) {
        // Add the question to the current questionnaire
        currentQuestionnaire.questions.push({
          id: row.question_id,
          text: row.question_text,
          type: row.question_type,
          options: row.question_options,
          priority: row.question_priority
        });
      }
    }

    // Add the last questionnaire if exists
    if (currentQuestionnaire) {
      questionnaires.push(currentQuestionnaire);
    }

    return res.status(200).json(questionnaires);
  } catch (error: any) {
    console.error('Error fetching questionnaires:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch questionnaires',
      details: error.message 
    });
  }
} 