import { NextApiResponse } from 'next';
import db from '../../../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { userId } = req.query;
  
  console.log(`Fetching completed questionnaires for user ID ${userId} (requested by user ID ${req.user?.id}, isAdmin: ${req.user?.is_admin})`);
  console.log('Request URL:', req.url);
  
  // Convert userId to integer
  let requestedUserId: number;
  try {
    requestedUserId = parseInt(userId as string, 10);
    if (isNaN(requestedUserId)) {
      throw new Error('Invalid user ID');
    }
  } catch (error) {
    console.error('Error parsing user ID:', error);
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  // Only allow users to fetch their own data unless they're an admin
  if (requestedUserId !== req.user?.id && !req.user?.is_admin) {
    console.log(`Access denied: User ${req.user?.id} tried to access data for user ${requestedUserId}`);
    return res.status(403).json({ error: 'Unauthorized access to user data' });
  }
  
  try {
    // First check if the questionnaire_completions table exists
    let tableExists = false;
    try {
      const checkResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'questionnaire_completions'
        )
      `);
      tableExists = checkResult.rows[0].exists;
    } catch (err) {
      console.error('Error checking for questionnaire_completions table:', err);
      tableExists = false;
    }
    
    if (!tableExists) {
      console.log('questionnaire_completions table does not exist, returning empty array');
      return res.status(200).json([]);
    }
    
    // Check if timezone columns exist
    let timezoneColumnsExist = false;
    try {
      const columnCheckResult = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'questionnaire_completions'
          AND column_name = 'timezone_name'
        )
      `);
      timezoneColumnsExist = columnCheckResult.rows[0].exists;
    } catch (err) {
      console.error('Error checking for timezone columns:', err);
      timezoneColumnsExist = false;
    }
    
    let query = `
      SELECT 
        q.id,
        q.name,
        qc.completed_at`;
        
    // Only include timezone columns if they exist
    if (timezoneColumnsExist) {
      query += `,
        qc.timezone_name,
        qc.timezone_offset`;
    }
    
    query += `
      FROM questionnaire_completions qc
      JOIN questionnaires q ON qc.questionnaire_id = q.id
      WHERE qc.user_id = $1
      ORDER BY qc.completed_at DESC
    `;
    
    // Get user's completed questionnaires with completion dates and timezone info
    const result = await db.query(query, [requestedUserId]);
    
    console.log(`Found ${result.rows.length} completed questionnaires for user ${requestedUserId}`);
    
    // Return the rows directly, not nested in an object
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching completed questionnaires:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler); 