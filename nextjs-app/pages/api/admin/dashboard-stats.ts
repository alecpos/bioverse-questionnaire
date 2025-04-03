import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware';
import { getAuthenticatedUser } from '../../../lib/auth';
import { PoolClient } from 'pg';

// Define these functions outside the handler
async function getQuestionnairesWithCompletions(): Promise<any[]> {
  try {
    // Check if is_pending column exists
    const columnExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'questionnaires' AND column_name = 'is_pending'
      )
    `);
    
    const hasIsPendingColumn = columnExists.rows[0].exists;
    
    let result;
    
    if (hasIsPendingColumn) {
      // Use is_pending column directly if it exists
      result = await db.query(`
        SELECT 
          q.id,
          q.name,
          q.is_pending,
          COUNT(qc.questionnaire_id) as completions
        FROM 
          questionnaires q
        LEFT JOIN 
          questionnaire_completions qc ON q.id = qc.questionnaire_id
        GROUP BY 
          q.id, q.name, q.is_pending
        ORDER BY 
          q.is_pending DESC, completions DESC
      `);
    } else {
      // Otherwise just get basic questionnaire stats
      result = await db.query(`
        SELECT 
          q.id,
          q.name,
          COUNT(qc.questionnaire_id) as completions
        FROM 
          questionnaires q
        LEFT JOIN 
          questionnaire_completions qc ON q.id = qc.questionnaire_id
        GROUP BY 
          q.id, q.name
        ORDER BY 
          completions DESC
      `);
      
      // Add is_pending based on name
      return result.rows.map(q => ({
        ...q,
        is_pending: q.name.includes('PENDING UPDATE')
      }));
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching questionnaires with completions:', error);
    return [];
  }
}

// Define this function outside the handler
async function getPendingQuestionnairesCount(): Promise<number> {
  try {
    // Check if is_pending column exists
    const columnExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'questionnaires' AND column_name = 'is_pending'
      )
    `);
    
    const hasIsPendingColumn = columnExists.rows[0].exists;
    
    if (hasIsPendingColumn) {
      // Use is_pending column directly if it exists
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM questionnaires 
        WHERE is_pending = TRUE
      `);
      return parseInt(result.rows[0].count);
    } else {
      // Count questionnaires with "PENDING UPDATE" in their name
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM questionnaires 
        WHERE name LIKE '%PENDING UPDATE%'
      `);
      return parseInt(result.rows[0].count);
    }
  } catch (error) {
    console.error('Error counting pending questionnaires:', error);
    return 0;
  }
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  console.log('Dashboard stats API called', {
    method: req.method,
    user: req.user ? { id: req.user.id, username: req.user.username, isAdmin: req.user.is_admin } : 'No user',
    headers: {
      authorization: req.headers.authorization?.substring(0, 20) + '...',
      cookie: req.headers.cookie ? 'present' : 'absent'
    }
  });
  
  // Only allow GET requests to this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }
  
  // Ensure user is authenticated and is an admin
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
  }
  
  console.log('Fetching dashboard statistics for user:', req.user.username);
  
  try {
    // Check if tables exist before proceeding
    try {
      const completionsCheck = await db.query('SELECT 1 FROM questionnaire_completions LIMIT 1');
      console.log('questionnaire_completions table exists and is accessible');
    } catch (error) {
      // Handle case where table doesn't exist
      return res.status(200).json({
        questionnaireStats: [],
        timeSeriesData: [],
        userEngagement: { active_users: 0, completed_questionnaires: 0 },
        demographics: { ageGroups: [], genders: [] },
        questionnaires: [],
        pendingQuestionnairesCount: 0,
        similarQuestionnaires: []
      });
    }
    
    // Fetch questionnaire stats - basic completion metrics
    const questionnaireStatsQuery = await db.query(`
      SELECT 
        q.id,
        q.name,
        COUNT(DISTINCT qc.user_id) as completions,
        COUNT(DISTINCT ur.user_id) as unique_users,
        MIN(qc.completed_at) as first_completion,
        MAX(qc.completed_at) as last_completion,
        COALESCE(
          AVG(
            EXTRACT(EPOCH FROM (qc.completed_at - ur.created_at)) / 60
          ), 0
        ) as avg_completion_time_minutes,
        COUNT(ur.id) as total_responses,
        (
          SELECT COUNT(DISTINCT qq.question_id)
          FROM questionnaire_questions qq
          WHERE qq.questionnaire_id = q.id
        ) as total_questions
      FROM 
        questionnaires q
      LEFT JOIN 
        questionnaire_completions qc ON q.id = qc.questionnaire_id
      LEFT JOIN 
        user_responses ur ON qc.questionnaire_id = ur.questionnaire_id AND qc.user_id = ur.user_id
      GROUP BY 
        q.id, q.name
      ORDER BY 
        completions DESC
    `);
    
    // Enhance the data with derived fields and mark pending status
    const questionnaireStats = questionnaireStatsQuery.rows.map(stat => ({
      id: stat.id,
      name: stat.name,
      completions: parseInt(stat.completions) || 0,
      unique_users: parseInt(stat.unique_users) || 0,
      first_completion: stat.first_completion || null,
      last_completion: stat.last_completion || null,
      avg_completion_time_minutes: parseFloat(stat.avg_completion_time_minutes) || 0,
      total_responses: parseInt(stat.total_responses) || 0,
      unique_questions_answered: parseInt(stat.unique_questions_answered) || 0,
      total_questions: parseInt(stat.total_questions) || 0,
      completion_rate: stat.total_questions > 0 ? 
        (parseInt(stat.total_responses) / parseInt(stat.total_questions)) * 100 : 0,
      is_pending: stat.name.includes('PENDING UPDATE')
    }));
    
    // Fetch user data
    const usersQuery = await db.query(`
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
    
    const users = usersQuery.rows;
    console.log(`Found ${users.length} users`);
    
    // Time series data for completions over past 7 days
    const timeSeriesQuery = await db.query(`
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as count
      FROM 
        questionnaire_completions
      WHERE 
        completed_at > NOW() - INTERVAL '7 days'
      GROUP BY 
        DATE(completed_at)
      ORDER BY 
        date
    `);
    
    // Create time series for the last 7 days with 0 for missing days
    const today = new Date();
    const lastWeekDates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      lastWeekDates.push(date.toISOString().split('T')[0]); // Format as YYYY-MM-DD
    }
    
    // Create a map of date to count
    const dateCountMap = new Map();
    timeSeriesQuery.rows.forEach(row => {
      const dateString = row.date instanceof Date ? 
        row.date.toISOString().split('T')[0] : 
        row.date.split('T')[0];
      dateCountMap.set(dateString, parseInt(row.count));
    });
    
    // Fill in missing dates with zero counts
    const timeSeriesData = lastWeekDates.map(date => ({
      date: date,
      count: dateCountMap.get(date) || 0
    }));
    
    console.log(`Created time series data for ${timeSeriesData.length} days`);
    
    // User engagement metrics
    const userEngagementQuery = await db.query(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(DISTINCT questionnaire_id) as completed_questionnaires
      FROM 
        questionnaire_completions
      WHERE 
        completed_at > NOW() - INTERVAL '30 days'
    `);
    
    const userEngagement = {
      totalUsers: users.length,
      activeUsers: parseInt(userEngagementQuery.rows[0].active_users) || 0,
      completionRate: users.length > 0 ? 
        (parseInt(userEngagementQuery.rows[0].active_users) / users.length) * 100 : 0
    };
    
    console.log('User engagement metrics:', userEngagement);
    
    // For demographics - if we had that data we would query it here
    // For now, just create empty placeholders
    const demographics = {
      ages: [],
      genders: []
    };
    
    // Get questionnaires with completion info
    const questionnaires = await getQuestionnairesWithCompletions();
    const pendingCount = await getPendingQuestionnairesCount();
    
    // Create a filtered set for charts (no pending ones)
    const nonPendingStats = questionnaireStats.filter(stat => !stat.is_pending);
    
    console.log('Dashboard stats fetch completed successfully');
    
    // Compose and return the full dashboard statistics
    return res.status(200).json({
      questionnaireStats,
      timeSeriesData,
      userEngagement,
      demographics,
      questionnaires,
      pendingQuestionnairesCount: pendingCount,
      similarQuestionnaires: [],
      nonPendingStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withAuth(handler); 