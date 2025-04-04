import { NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

interface ResponseData {
  userId: number;
  questionnaireId: number;
  responses: {
    questionId: number;
    answer: string | string[];
  }[];
  timezone: {
    name: string;
    offset: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { questionnaireId, responses, timezone = { name: '', offset: '' } } = req.body;
    const userId = req.user!.id;
    
    console.log(`Submitting responses for user ${userId}, questionnaire ${questionnaireId}`);
    console.log(`Using timezone info: name=${timezone.name}, offset=${timezone.offset}`);
    
    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No responses provided'
      });
    }
    
    // Use db.transaction for clean transaction handling
    await db.transaction(async (client) => {
      // Process each response
      for (const response of responses) {
        const { questionId, answer } = response;
        
        // Check if it's a multiple choice question
        const questionResult = await client.query(`
          SELECT type FROM questions WHERE id = $1
        `, [questionId]);
        
        if (questionResult.rows.length === 0) {
          throw new Error(`Question with ID ${questionId} not found`);
        }
        
        const questionType = questionResult.rows[0].type;
        
        // Format the answer based on question type
        let formattedAnswer: string;
        
        if (questionType === 'multiple_choice' && Array.isArray(answer)) {
          formattedAnswer = JSON.stringify(answer);
        } else {
          formattedAnswer = String(answer);
        }
        
        // Check if a response already exists
        const existingResponse = await client.query(`
          SELECT id FROM user_responses
          WHERE user_id = $1 AND question_id = $2 AND questionnaire_id = $3
        `, [userId, questionId, questionnaireId]);
        
        if (existingResponse.rows.length > 0) {
          // Update existing response
          await client.query(`
            UPDATE user_responses
            SET response_text = $1
            WHERE id = $2
          `, [formattedAnswer, existingResponse.rows[0].id]);
        } else {
          // Insert new response
          await client.query(`
            INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
            VALUES ($1, $2, $3, $4)
          `, [userId, questionnaireId, questionId, formattedAnswer]);
        }
      }
      
      // Record the questionnaire completion with timezone info
      console.log('Storing questionnaire completion with timezone info:');
      console.log('- userId:', userId);
      console.log('- questionnaireId:', questionnaireId);
      
      // Always use EST timezone regardless of what was submitted
      const estTimezone = {
        name: 'America/New_York',
        offset: '-05:00'
      };
      
      await client.query(
        `INSERT INTO questionnaire_completions 
          (user_id, questionnaire_id, completed_at, timezone_name, timezone_offset) 
          VALUES ($1, $2, NOW(), $3, $4)
          ON CONFLICT (user_id, questionnaire_id) 
          DO UPDATE SET completed_at = NOW(), timezone_name = $3, timezone_offset = $4`,
        [userId, questionnaireId, estTimezone.name, estTimezone.offset]
      );
    });
    
    return res.status(200).json({
      success: true,
      message: 'Responses submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting responses:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit responses'
    });
  }
}

export default withAuth(handler); 