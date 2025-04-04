// Create the questionnaire_completions table
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function createCompletionTable() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking if questionnaire_completions table exists...');
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_completions'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('questionnaire_completions table already exists');
    } else {
      console.log('Creating questionnaire_completions table...');
      
      // Create the table
      await client.query(`
        CREATE TABLE questionnaire_completions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id),
          completed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, questionnaire_id)
        )
      `);
      
      console.log('Table created successfully');
      
      // Populate the table with data from user_responses
      console.log('Checking for existing user responses to populate completion data...');
      
      const userResponses = await client.query(`
        SELECT DISTINCT user_id, questionnaire_id 
        FROM user_responses
        GROUP BY user_id, questionnaire_id
        HAVING COUNT(*) > 0
      `);
      
      if (userResponses.rows.length > 0) {
        console.log(`Found ${userResponses.rows.length} questionnaire completions to add`);
        
        for (const row of userResponses.rows) {
          await client.query(`
            INSERT INTO questionnaire_completions (user_id, questionnaire_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, questionnaire_id) DO NOTHING
          `, [row.user_id, row.questionnaire_id]);
          
          console.log(`Added completion record for user ${row.user_id}, questionnaire ${row.questionnaire_id}`);
        }
      } else {
        console.log('No existing user responses found to populate completions');
      }
    }
    
    // Check the admin API query to make sure it works
    console.log('Testing the admin dashboard query...');
    
    const testQuery = await client.query(`
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
    
    console.log(`Admin dashboard query returned ${testQuery.rows.length} users`);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('All operations completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error creating completion table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createCompletionTable(); 