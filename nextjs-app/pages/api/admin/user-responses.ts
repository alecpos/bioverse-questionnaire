import { NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('Admin user-responses API called', {
    method: req.method,
    user: req.user ? { id: req.user.id, username: req.user.username, isAdmin: req.user.is_admin } : 'Not authenticated',
    headers: {
      authorization: req.headers.authorization ? `${req.headers.authorization.substring(0, 20)}...` : 'none',
      cookie: req.headers.cookie ? 'present' : 'none'
    }
  });

  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Fetching all users with questionnaire completion status');
    
    // First check if questionnaire_completions table exists
    try {
      await db.query('SELECT 1 FROM questionnaire_completions LIMIT 1');
      console.log('questionnaire_completions table exists and is accessible');
    } catch (error: any) {
      console.error('Error accessing questionnaire_completions table:', error.message);
      // If the table doesn't exist or can't be accessed, return the users without completion data
      const fallbackResult = await db.query(`
        SELECT 
          u.id, 
          u.username, 
          u.email,
          0 as completed_questionnaires,
          (
            SELECT COUNT(*)
            FROM questionnaires
          ) as total_questionnaires
        FROM 
          users u
        ORDER BY 
          u.username
      `);
      
      console.log(`Returning ${fallbackResult.rows.length} users with fallback completion data`);
      return res.status(200).json(fallbackResult.rows);
    }
    
    // If we get here, the questionnaire_completions table exists, so use the full query
    const result = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email,
        COUNT(DISTINCT qc.questionnaire_id) as completed_questionnaires,
        (
          SELECT COUNT(*)
          FROM questionnaires
        ) as total_questionnaires
      FROM 
        users u
      LEFT JOIN 
        questionnaire_completions qc ON u.id = qc.user_id
      GROUP BY 
        u.id, u.username, u.email
      ORDER BY 
        u.username
    `);
    
    console.log(`Found ${result.rows.length} users`);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Use withAuth middleware with adminOnly flag
export default withAuth(handler, true); 