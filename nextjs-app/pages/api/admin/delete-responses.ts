import { NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if the authenticated user is an admin
  if (!req.user?.is_admin) {
    console.log(`Admin API access denied for non-admin user: ${req.user?.username} (ID: ${req.user?.id})`);
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { userId, questionnaireId } = req.body;

  if (!userId || !questionnaireId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const targetUserId = parseInt(userId.toString());
  const questId = parseInt(questionnaireId.toString());
  
  console.log(`Admin delete request for user ${targetUserId}, questionnaire ${questId}`);
  console.log('Request body:', req.body);
  console.log('Admin user:', { 
    id: req.user?.id, 
    username: req.user?.username
  });

  try {
    // Start a transaction
    await db.query('BEGIN');
    
    // Check if completion record exists
    const checkResult = await db.query(`
      SELECT * FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
    `, [targetUserId, questId]);
    
    console.log(`Found ${checkResult.rows.length} completion records to delete for user ${targetUserId}, questionnaire ${questId}`);

    // 1. Delete from questionnaire_completions
    const deleteCompletionResult = await db.query(`
      DELETE FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
      RETURNING id
    `, [targetUserId, questId]);
    
    console.log(`Deleted ${deleteCompletionResult.rows.length} completion records`);

    // 2. Delete from user_responses
    const deleteResponsesResult = await db.query(`
      DELETE FROM user_responses
      WHERE user_id = $1 AND questionnaire_id = $2
      RETURNING id
    `, [targetUserId, questId]);
    
    console.log(`Deleted ${deleteResponsesResult.rows.length} response records`);

    // Commit the transaction
    await db.query('COMMIT');

    return res.status(200).json({ 
      success: true, 
      message: 'Responses deleted successfully by admin',
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