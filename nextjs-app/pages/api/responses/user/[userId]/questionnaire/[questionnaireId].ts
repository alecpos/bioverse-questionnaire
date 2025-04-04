import { NextApiResponse } from 'next';
import db from '../../../../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { userId, questionnaireId } = req.query;
  
  if (!userId || Array.isArray(userId) || !questionnaireId || Array.isArray(questionnaireId)) {
    return res.status(400).json({ error: 'Invalid user ID or questionnaire ID' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check if user is requesting their own data or is an admin
  const requestedUserId = parseInt(userId);
  const authenticatedUserId = req.user?.id;
  const isAdmin = req.user?.is_admin;
  
  if (requestedUserId !== authenticatedUserId && !isAdmin) {
    return res.status(403).json({ error: 'Unauthorized access to user data' });
  }
  
  try {
    // Check if user has completed this questionnaire
    const completionResult = await db.query(`
      SELECT * FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
    `, [userId, questionnaireId]);
    
    const hasCompletedCurrentQuestionnaire = completionResult.rows.length > 0;
    
    // Get the questions for this questionnaire
    const questionsResult = await db.query(`
      SELECT q.id, q.text, q.type
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority
    `, [questionnaireId]);
    
    if (questionsResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No questions found for this questionnaire',
        hasResponses: false 
      });
    }
    
    const questionIds = questionsResult.rows.map(q => q.id);
    
    // Get previously submitted responses for this specific questionnaire
    const responsesResult = await db.query(`
      SELECT question_id, response_text as answer 
      FROM user_responses
      WHERE user_id = $1 AND questionnaire_id = $2
    `, [userId, questionnaireId]);
    
    // If user has direct responses for this questionnaire, use those primarily
    if (responsesResult.rows.length > 0 || hasCompletedCurrentQuestionnaire) {
      // Map responses to questions
      const questions = questionsResult.rows.map(question => {
        // Find response for this question
        const response = responsesResult.rows.find(r => r.question_id === question.id);
        
        if (question.type === 'multiple_choice') {
          // Parse JSON for multiple choice questions
          return {
            ...question,
            answer: response ? JSON.parse(response.answer) : null,
            fromOtherQuestionnaire: false
          };
        }
        
        return {
          ...question,
          answer: response ? response.answer : null,
          fromOtherQuestionnaire: false
        };
      });
      
      // Return the questionnaire with previous responses
      return res.status(200).json({
        hasResponses: responsesResult.rows.length > 0,
        hasCompletedQuestionnaire: hasCompletedCurrentQuestionnaire,
        questions,
      });
    } 
    // If no direct responses, check for similar questions in other questionnaires
    else {
      // Get responses to similar questions from other questionnaires
      // We'll match questions by exact text match (could be improved with fuzzy matching)
      const questionsWithResponses = [];
      
      for (const question of questionsResult.rows) {
        // First check if we already have a direct response for this question
        const directResponse = responsesResult.rows.find(r => r.question_id === question.id);
        
        if (directResponse) {
          // If there's a direct response, use it
          if (question.type === 'multiple_choice') {
            questionsWithResponses.push({
              ...question,
              answer: JSON.parse(directResponse.answer),
              fromOtherQuestionnaire: false
            });
          } else {
            questionsWithResponses.push({
              ...question,
              answer: directResponse.answer,
              fromOtherQuestionnaire: false
            });
          }
          continue;
        }
        
        // If no direct response, look for similar questions from other questionnaires
        const similarQuestionsResult = await db.query(`
          SELECT ur.response_text as answer, ur.question_id, q.type
          FROM user_responses ur
          JOIN questions q ON ur.question_id = q.id
          WHERE ur.user_id = $1 
            AND ur.questionnaire_id != $2
            AND LOWER(q.text) = LOWER($3)
          ORDER BY ur.created_at DESC
          LIMIT 1
        `, [userId, questionnaireId, question.text]);
        
        if (similarQuestionsResult.rows.length > 0) {
          const similarResponse = similarQuestionsResult.rows[0];
          
          if (question.type === 'multiple_choice') {
            questionsWithResponses.push({
              ...question,
              answer: JSON.parse(similarResponse.answer),
              fromOtherQuestionnaire: true
            });
          } else {
            questionsWithResponses.push({
              ...question,
              answer: similarResponse.answer,
              fromOtherQuestionnaire: true
            });
          }
        } else {
          // No similar question found, return with null answer
          questionsWithResponses.push({
            ...question,
            answer: null,
            fromOtherQuestionnaire: false
          });
        }
      }
      
      return res.status(200).json({
        hasResponses: questionsWithResponses.some(q => q.answer !== null),
        hasCompletedQuestionnaire: false,
        questions: questionsWithResponses,
      });
    }
  } catch (error) {
    console.error('Error fetching user responses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler); 