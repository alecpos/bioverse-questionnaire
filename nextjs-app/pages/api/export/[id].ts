import { NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid questionnaire ID' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Only admin users should be able to export data
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
  }
  
  try {
    // Get questionnaire data
    const questionnaireResult = await db.query(`
      SELECT * FROM questionnaires
      WHERE id = $1
    `, [id]);
    
    if (questionnaireResult.rows.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }
    
    const questionnaire = questionnaireResult.rows[0];
    
    // Get questionnaire questions through the junction table
    const questionsResult = await db.query(`
      SELECT q.* 
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority ASC
    `, [id]);
    
    const questions = questionsResult.rows;
    console.log(`Found ${questions.length} questions for questionnaire ${id}`);
    
    // Get all user responses for this questionnaire
    const responsesResult = await db.query(`
      SELECT ur.*, u.username 
      FROM user_responses ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.questionnaire_id = $1
      ORDER BY ur.user_id, ur.question_id
    `, [id]);
    
    const responses = responsesResult.rows;
    console.log(`Found ${responses.length} responses for questionnaire ${id}`);
    
    // Format data for CSV
    // Group responses by user
    const userResponses = responses.reduce((acc, response) => {
      if (!acc[response.user_id]) {
        acc[response.user_id] = {
          user_id: response.user_id,
          username: response.username,
          responses: {}
        };
      }
      
      // Check both response_text and response fields
      let responseValue = response.response_text !== null && response.response_text !== undefined 
        ? response.response_text 
        : (response.response || '');
      
      // Parse JSON responses for multiple choice questions
      try {
        if (responseValue && (responseValue.startsWith('[') || responseValue.startsWith('"['))) {
          // If response starts with [ or "[ it might be a JSON array
          const parsed = JSON.parse(responseValue.startsWith('"') ? JSON.parse(responseValue) : responseValue);
          if (Array.isArray(parsed)) {
            responseValue = parsed.join(', ');
          }
        }
      } catch (e) {
        // If parsing fails, keep the original value
        console.log(`Failed to parse response as JSON: ${responseValue}`);
      }
      
      // Store the response text by question_id
      acc[response.user_id].responses[response.question_id] = responseValue;
      
      return acc;
    }, {});
    
    // Create CSV header row
    const headers = ['User ID', 'Username'];
    for (const question of questions) {
      headers.push(question.text);
    }
    
    // Create CSV data rows
    const csvData = [headers];
    
    console.log(`Processing ${Object.keys(userResponses).length} users for CSV export`);
    
    Object.values(userResponses).forEach((user: any) => {
      const row = [
        user.user_id,
        user.username
      ];
      
      // Add responses in the correct order (matching questions)
      for (const question of questions) {
        row.push(user.responses[question.id] || '');
      }
      
      csvData.push(row);
    });
    
    // Simple CSV conversion function
    const escapeCSV = (value: any) => {
      const stringValue = value === null || value === undefined ? '' : String(value);
      // Escape double quotes and wrap in quotes if needed
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    // Convert to CSV string
    const csvString = csvData.map(row => row.map(escapeCSV).join(',')).join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="questionnaire_${id}_responses.csv"`);
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).send(csvString);
  } catch (error: any) {
    console.error('Error exporting questionnaire data:', error);
    return res.status(500).json({ error: 'Failed to export questionnaire data' });
  }
}

export default withAuth(handler, true); // Require admin access 