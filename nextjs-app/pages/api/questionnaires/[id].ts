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
    const questionsResult = await db.query(`
      SELECT 
        q.id, 
        q.text, 
        q.type, 
        qq.priority,
        q.options
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority ASC
    `, [id]);
    
    // Parse the JSONB options for multiple choice questions
    const questions = questionsResult.rows.map(question => {
      if (question.type === 'multiple_choice' && question.options) {
        try {
          // If options is already a parsed object, use it directly
          // Otherwise, if it's a string, parse it
          const parsedOptions = typeof question.options === 'string' 
            ? JSON.parse(question.options) 
            : question.options;
          
          return {
            ...question,
            options: parsedOptions
          };
        } catch (error) {
          console.error('Error parsing options for question', question.id, error);
          return question;
        }
      }
      
      return question;
    });
    
    // Return the questionnaire with its questions
    return res.status(200).json({
      id: questionnaire.id,
      name: questionnaire.name,
      description: questionnaire.description,
      questions
    });
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 