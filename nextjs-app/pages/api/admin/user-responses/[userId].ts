import { NextApiResponse } from 'next';
import db from '../../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { userId } = req.query;
  const format = req.headers.accept?.includes('text/csv') ? 'csv' : 'json';
  
  if (!userId || Array.isArray(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get user info
    const userResult = await db.query(`
      SELECT id, username, email
      FROM users
      WHERE id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Get completed questionnaires
    let completedQuestionnaires = [];
    try {
      const questionnairesResult = await db.query(`
        SELECT 
          q.id,
          q.name,
          qc.completed_at,
          qc.timezone_name,
          qc.timezone_offset
        FROM questionnaire_completions qc
        JOIN questionnaires q ON qc.questionnaire_id = q.id
        WHERE qc.user_id = $1
        ORDER BY qc.completed_at DESC
      `, [userId]);
      
      completedQuestionnaires = questionnairesResult.rows;
    } catch (error: any) {
      console.error('Error fetching questionnaire completions:', error.message);
      // If table doesn't exist, return empty completions
      if (error.message.includes("questionnaire_completions")) {
        console.log('Returning empty completions due to missing table');
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }
    
    // Get all user responses
    let responses = [];
    try {
      const responsesResult = await db.query(`
        SELECT 
          ur.questionnaire_id,
          qn.name as questionnaire_name,
          ur.question_id,
          q.text as question_text,
          q.type as question_type,
          ur.response_text,
          ur.created_at,
          qc.timezone_name,
          qc.timezone_offset
        FROM user_responses ur
        JOIN questions q ON ur.question_id = q.id
        JOIN questionnaires qn ON ur.questionnaire_id = qn.id
        LEFT JOIN questionnaire_completions qc 
          ON ur.user_id = qc.user_id AND ur.questionnaire_id = qc.questionnaire_id
        WHERE ur.user_id = $1
        ORDER BY ur.questionnaire_id, q.id
      `, [userId]);
      
      // Process responses
      responses = responsesResult.rows.map(row => {
        // For multiple choice, parse the JSON array
        if (row.question_type === 'multiple_choice') {
          try {
            return {
              ...row,
              response_text: JSON.parse(row.response_text)
            };
          } catch (e) {
            return row;
          }
        }
        return row;
      });
    } catch (error: any) {
      console.error('Error fetching user responses:', error.message);
      // If table doesn't exist, return empty responses
      if (error.message.includes("user_responses")) {
        console.log('Returning empty responses due to missing table');
      } else {
        // Re-throw if it's a different error
        throw error;
      }
    }
    
    // If CSV format is requested, format the data as CSV
    if (format === 'csv') {
      // Generate CSV content
      // Group responses by questionnaire
      const responsesByQuestionnaire = responses.reduce((acc, response) => {
        const key = response.questionnaire_id;
        if (!acc[key]) {
          acc[key] = {
            questionnaire_id: response.questionnaire_id,
            questionnaire_name: response.questionnaire_name,
            responses: []
          };
        }
        acc[key].responses.push(response);
        return acc;
      }, {});
      
      // Create CSV rows
      let csvRows = [];
      
      // Add header row
      csvRows.push(['User ID', 'Username', 'Questionnaire', 'Question', 'Response', 'Date']);
      
      // Add data rows for each questionnaire
      Object.values(responsesByQuestionnaire).forEach((questionnaire: any) => {
        questionnaire.responses.forEach((response: any) => {
          // Format response text for CSV
          let responseText = response.response_text;
          if (Array.isArray(responseText)) {
            responseText = responseText.join(', ');
          }
          
          // Format date for CSV
          const date = new Date(response.created_at);
          const formattedDate = date.toISOString().split('T')[0];
          
          csvRows.push([
            user.id,
            user.username,
            response.questionnaire_name,
            response.question_text,
            responseText,
            formattedDate
          ]);
        });
      });
      
      // Convert rows to CSV string
      const csvContent = csvRows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap with quotes if needed
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ).join('\n');
      
      // Set CSV headers and return CSV content
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="user_${user.username}_responses.csv"`);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.status(200).send(csvContent);
    }
    
    // Otherwise return JSON data
    return res.status(200).json({
      user,
      completedQuestionnaires,
      responses
    });
  } catch (error) {
    console.error('Error fetching user response details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Use withAuth middleware with adminOnly flag
export default withAuth(handler, true); 