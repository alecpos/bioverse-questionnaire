// Fix questionnaire_completions table issue
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function fixCompletionsTable() {
  // Use separate client for better isolation
  const client = await pool.connect();
  
  try {
    console.log('Starting completion records repair...');
    
    // Begin transaction for safety
    await client.query('BEGIN');
    
    // Check if questionnaire_completions table exists
    const tableExistsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_completions'
      )
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('Creating questionnaire_completions table...');
      await client.query(`
        CREATE TABLE questionnaire_completions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          questionnaire_id INTEGER NOT NULL,
          completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          timezone_name VARCHAR(50),
          timezone_offset VARCHAR(10),
          UNIQUE(user_id, questionnaire_id)
        )
      `);
      console.log('Table created successfully');
    } else {
      console.log('questionnaire_completions table already exists');
    }
    
    // Find all user-questionnaire combinations that have responses but no completion record
    console.log('Checking for missing completion records...');
    
    const missingCompletionsResult = await client.query(`
      SELECT DISTINCT ur.user_id, ur.questionnaire_id
      FROM user_responses ur
      LEFT JOIN questionnaire_completions qc 
        ON ur.user_id = qc.user_id AND ur.questionnaire_id = qc.questionnaire_id
      WHERE qc.id IS NULL
      GROUP BY ur.user_id, ur.questionnaire_id
    `);
    
    const missingCompletions = missingCompletionsResult.rows;
    console.log(`Found ${missingCompletions.length} user-questionnaire combinations with missing completion records`);
    
    // Create completion records for each missing combination
    for (const { user_id, questionnaire_id } of missingCompletions) {
      console.log(`Creating completion record for user ${user_id}, questionnaire ${questionnaire_id}`);
      
      await client.query(`
        INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, questionnaire_id) DO NOTHING
      `, [user_id, questionnaire_id]);
    }
    
    // Show current state of questionnaire_completions table
    const completionsResult = await client.query(`
      SELECT qc.user_id, u.username, qc.questionnaire_id, q.name as questionnaire_name, qc.completed_at
      FROM questionnaire_completions qc
      JOIN users u ON qc.user_id = u.id
      JOIN questionnaires q ON qc.questionnaire_id = q.id
      ORDER BY qc.completed_at DESC
    `);
    
    console.log('\nCurrent questionnaire completions:');
    completionsResult.rows.forEach(row => {
      console.log(`User: ${row.username} (ID: ${row.user_id}), Questionnaire: ${row.questionnaire_name} (ID: ${row.questionnaire_id}), Completed: ${row.completed_at}`);
    });
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Repair completed successfully');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error repairing completions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function
fixCompletionsTable()
  .then(() => console.log('Script finished'))
  .catch(err => console.error('Script failed:', err)); 