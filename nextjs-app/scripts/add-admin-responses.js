const { Pool } = require('pg');
require('dotenv').config();

// Use environment variables for sensitive information
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

console.log('Environment variables:');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '[REDACTED]' : 'undefined'}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`Using connection string: ${connectionString.includes('@') ? connectionString.split('@')[1] : connectionString}`);

// Create a new Pool instance for database connections
const pool = new Pool({
  connectionString,
  // Enable SSL in production (like on Heroku)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Log connection events for debugging
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function addAdminResponses() {
  let client;
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Verify database connection
    const versionRes = await client.query('SELECT version()');
    console.log(`Database version: ${versionRes.rows[0].version}`);
    
    console.log('Adding responses for admin user...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Get admin user ID
    const userResult = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    console.log(`User query result: ${JSON.stringify(userResult.rows)}`);
    
    if (userResult.rows.length === 0) {
      // Check if the users table exists and has data
      const tableCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      `);
      
      if (tableCheck.rows.length === 0) {
        throw new Error('Users table does not exist');
      } else {
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        console.log(`Users table exists with ${userCount.rows[0].count} rows`);
        
        // Show sample of users
        const sampleUsers = await client.query('SELECT * FROM users LIMIT 3');
        console.log('Sample users:', JSON.stringify(sampleUsers.rows));
        
        throw new Error('Admin user not found');
      }
    }
    
    const adminUser = userResult.rows[0];
    console.log(`Found admin user with ID: ${adminUser.id}`);
    
    // Get questionnaire
    const questionnaireResult = await client.query('SELECT * FROM questionnaires WHERE id = $1', [1]);
    if (questionnaireResult.rows.length === 0) {
      throw new Error('Questionnaire with ID 1 not found');
    }
    
    // Get questions for questionnaire 1
    const questionsResult = await client.query(`
      SELECT q.* 
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority ASC
    `, [1]);
    
    console.log(`Found ${questionsResult.rows.length} questions for questionnaire 1`);
    
    // Loop through questions and add responses
    for (const question of questionsResult.rows) {
      // Generate a response based on question type
      let responseText;
      
      if (question.type === 'text') {
        responseText = `Admin response to question ${question.id}: Sample text response`;
      } else if (question.type === 'multiple_choice') {
        responseText = 'Option 1';  // Simplified response for multiple choice
      } else {
        responseText = 'Sample response';
      }
      
      // Check if a response already exists
      const existingResponse = await client.query(`
        SELECT * FROM user_responses 
        WHERE user_id = $1 AND question_id = $2 AND questionnaire_id = $3
      `, [adminUser.id, question.id, 1]);
      
      if (existingResponse.rows.length > 0) {
        // Update existing response
        try {
          await client.query(`
            UPDATE user_responses
            SET response_text = $1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $2 AND question_id = $3 AND questionnaire_id = $4
          `, [responseText, adminUser.id, question.id, 1]);
          console.log(`Updated response for question ${question.id}`);
        } catch (updateError) {
          console.error(`Error updating response for question ${question.id}:`, updateError);
          throw updateError;
        }
      } else {
        // Insert new response
        try {
          await client.query(`
            INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text)
            VALUES ($1, $2, $3, $4)
          `, [adminUser.id, question.id, 1, responseText]);
          console.log(`Inserted response for question ${question.id}`);
        } catch (insertError) {
          console.error(`Error inserting response for question ${question.id}:`, insertError);
          throw insertError;
        }
      }
    }
    
    // Add or update questionnaire completion record
    const completionResult = await client.query(`
      SELECT * FROM questionnaire_completions
      WHERE user_id = $1 AND questionnaire_id = $2
    `, [adminUser.id, 1]);
    
    if (completionResult.rows.length > 0) {
      await client.query(`
        UPDATE questionnaire_completions
        SET completed_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND questionnaire_id = $2
      `, [adminUser.id, 1]);
      console.log('Updated completion record');
    } else {
      await client.query(`
        INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [adminUser.id, 1]);
      console.log('Inserted completion record');
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Successfully added all responses for admin user');
  } catch (error) {
    // Roll back the transaction in case of error
    if (client) {
      await client.query('ROLLBACK');
      console.error('Error in addAdminResponses:', error);
    } else {
      console.error('Failed to connect to database:', error);
    }
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
      console.log('Client released');
    }
    // End the pool
    await pool.end();
    console.log('Pool ended');
  }
}

// Run the function
addAdminResponses().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 