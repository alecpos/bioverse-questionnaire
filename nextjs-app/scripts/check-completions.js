// Check and fix questionnaire completions
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function checkCompletions() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Examining questionnaire completions...');
    
    // Check questionnaire_completions table structure
    const completionsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questionnaire_completions';
    `);
    
    console.log('Questionnaire completions table columns:');
    completionsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check existing completions
    const completions = await client.query(`
      SELECT * FROM questionnaire_completions
    `);
    
    console.log(`Found ${completions.rows.length} completion records`);
    
    // Check user responses to determine which questionnaires are actually completed
    console.log('\nChecking user responses to find completed questionnaires...');
    
    const userResponses = await client.query(`
      SELECT DISTINCT user_id, questionnaire_id, COUNT(*) as response_count
      FROM user_responses
      GROUP BY user_id, questionnaire_id
    `);
    
    console.log(`Found ${userResponses.rows.length} user-questionnaire combinations with responses`);
    
    // For each user-questionnaire pair with responses, check if there's a completion record
    for (const response of userResponses.rows) {
      const { user_id, questionnaire_id, response_count } = response;
      
      // Get question count for this questionnaire
      const questionsResult = await client.query(`
        SELECT COUNT(*) as question_count
        FROM questions q
        JOIN questionnaire_questions qq ON q.id = qq.question_id
        WHERE qq.questionnaire_id = $1
      `, [questionnaire_id]);
      
      const questionCount = parseInt(questionsResult.rows[0].question_count);
      
      console.log(`User ${user_id}, Questionnaire ${questionnaire_id}: ${response_count} responses (${questionCount} questions total)`);
      
      // Check if completion record exists
      const completionExists = await client.query(`
        SELECT id FROM questionnaire_completions
        WHERE user_id = $1 AND questionnaire_id = $2
      `, [user_id, questionnaire_id]);
      
      // If responses exist but no completion record, create one
      if (response_count > 0 && completionExists.rows.length === 0) {
        console.log(`Creating missing completion record for User ${user_id}, Questionnaire ${questionnaire_id}`);
        
        await client.query(`
          INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
          VALUES ($1, $2, NOW())
        `, [user_id, questionnaire_id]);
      }
    }
    
    // Check user_responses table data for debugging
    console.log('\nSample of user_responses data:');
    const sampleResponses = await client.query(`
      SELECT * FROM user_responses LIMIT 5
    `);
    
    sampleResponses.rows.forEach(row => {
      console.log(row);
    });
    
    // Check admin API endpoint query
    console.log('\nTesting admin dashboard query...');
    
    const userCompletionsResult = await client.query(`
      SELECT 
        u.id, 
        u.username, 
        COUNT(DISTINCT qc.questionnaire_id) as completed_questionnaires,
        (SELECT COUNT(*) FROM questionnaires) as total_questionnaires
      FROM users u
      LEFT JOIN questionnaire_completions qc ON u.id = qc.user_id
      GROUP BY u.id, u.username
      ORDER BY u.username
    `);
    
    console.log('User completion stats:');
    userCompletionsResult.rows.forEach(user => {
      console.log(`- ${user.username}: ${user.completed_questionnaires}/${user.total_questionnaires} completed`);
    });
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\nCompletions check completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error checking completions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkCompletions(); 