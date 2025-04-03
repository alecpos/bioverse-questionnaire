import { NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, questionnaireId } = req.body;

  if (!userId || !questionnaireId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Ensure user can only delete their own responses unless they're an admin
  const requestedUserId = parseInt(userId.toString());
  const questId = parseInt(questionnaireId.toString());
  const authenticatedUserId = req.user?.id;
  const isAdmin = req.user?.is_admin;
  
  console.log(`Delete request for user ${requestedUserId}, questionnaire ${questId}`);
  console.log('Request body:', req.body);
  console.log('Authenticated user:', { 
    id: authenticatedUserId, 
    username: req.user?.username, 
    isAdmin: isAdmin
  });
  
  // Strict authorization check:
  // 1. Regular users can ONLY delete their own responses
  // 2. Even admins cannot delete other users' responses through the regular questionnaire view
  // (Admin-specific deletion functionality should be in a separate admin API endpoint)
  if (requestedUserId !== authenticatedUserId) {
    console.log(`Authorization failure: User ${authenticatedUserId} attempted to delete responses for user ${requestedUserId}`);
    return res.status(403).json({ 
      error: 'Unauthorized access. You can only delete your own responses.',
      details: `Authenticated as user ${authenticatedUserId}, attempted to delete for user ${requestedUserId}`
    });
  }

  try {
    // Start a transaction
    await db.query('BEGIN');
    
    // Check if completion record exists
    const checkResult = await db.query(`
      SELECT * FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
    `, [requestedUserId, questId]);
    
    console.log(`Found ${checkResult.rows.length} completion records to delete for user ${requestedUserId}, questionnaire ${questId}`);
    
    if (checkResult.rows.length === 0) {
      console.log(`No completions to delete. Checking user_responses table directly.`);
      
      // Check if there are any responses for this user/questionnaire
      const checkResponsesResult = await db.query(`
        SELECT COUNT(*) as count FROM user_responses
        WHERE user_id = $1 AND questionnaire_id = $2
      `, [requestedUserId, questId]);
      
      console.log(`Found ${checkResponsesResult.rows[0].count} response records in user_responses table`);
    }

    // 1. Delete from questionnaire_completions
    const deleteCompletionResult = await db.query(`
      DELETE FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
      RETURNING id
    `, [requestedUserId, questId]);
    
    console.log(`Deleted ${deleteCompletionResult.rows.length} completion records`);

    // 2. Delete from user_responses
    const deleteResponsesResult = await db.query(`
      DELETE FROM user_responses
      WHERE user_id = $1 AND questionnaire_id = $2
      RETURNING id
    `, [requestedUserId, questId]);
    
    console.log(`Deleted ${deleteResponsesResult.rows.length} response records`);

    // Commit the transaction
    await db.query('COMMIT');

    return res.status(200).json({ 
      success: true, 
      message: 'Responses deleted successfully',
      stats: {
        completionsDeleted: deleteCompletionResult.rows.length,
        responsesDeleted: deleteResponsesResult.rows.length
      }
    });
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('Error deleting responses:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler); 