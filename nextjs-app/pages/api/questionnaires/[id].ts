import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid questionnaire ID' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get questionnaire info
    const questionnaireResult = await db.query(`
      SELECT id, name, description
      FROM questionnaires
      WHERE id = $1
    `, [id]);
    
    if (questionnaireResult.rows.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }
    
    const questionnaire = questionnaireResult.rows[0];
    
    // Get questions for this questionnaire using the junction table
    // Include the options column which is JSONB format
    const questionsResult = await db.query(`
      SELECT 
        q.id, 
        q.text, 
        q.type, 
        q.options,
        qq.priority
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority ASC
    `, [id]);
    
    // Process questions - for backward compatibility, if options column is null
    // but type is multiple_choice, fetch options from separate table
    const questionsWithOptions = await Promise.all(questionsResult.rows.map(async (question) => {
      // If multiple_choice but no options in the JSONB column
      if (question.type === 'multiple_choice' && (!question.options || question.options.length === 0)) {
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
    
    // Return the questionnaire with its questions
    return res.status(200).json({
      id: questionnaire.id,
      name: questionnaire.name,
      description: questionnaire.description,
      questions: questionsWithOptions
    });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 