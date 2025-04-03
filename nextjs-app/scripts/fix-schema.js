// Fix database schema issues
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

// Schema fixes
async function fixSchema() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking database schema...');
    
    // Check if users table has password_hash column
    const usersResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (usersResult.rows.length === 0) {
      console.log('Adding password_hash column to users table');
      
      // Add password_hash column
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)
      `);
      
      // Rename password column to plain_password for backup
      await client.query(`
        ALTER TABLE users 
        RENAME COLUMN password TO plain_password
      `);
    } else {
      console.log('password_hash column already exists in users table');
    }
    
    // Check user_responses table schema
    try {
      const responsesResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_responses' AND column_name = 'answer'
      `);
      
      if (responsesResult.rows.length === 0) {
        console.log('Adding answer column to user_responses table');
        
        // Add answer column
        await client.query(`
          ALTER TABLE user_responses 
          ADD COLUMN IF NOT EXISTS answer TEXT
        `);
      } else {
        console.log('answer column already exists in user_responses table');
      }
    } catch (error) {
      console.log('Error checking user_responses table:', error.message);
      
      // Create user_responses table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_responses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          question_id INTEGER NOT NULL,
          questionnaire_id INTEGER NOT NULL,
          answer TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log('Created user_responses table');
    }
    
    // Check questionnaire_completions table
    try {
      await client.query(`
        SELECT * FROM questionnaire_completions LIMIT 1
      `);
      console.log('questionnaire_completions table exists');
    } catch (error) {
      console.log('Creating questionnaire_completions table');
      
      // Create table
      await client.query(`
        CREATE TABLE questionnaire_completions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          questionnaire_id INTEGER NOT NULL,
          completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, questionnaire_id)
        )
      `);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Schema fixes completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixSchema(); 