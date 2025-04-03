const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function insertTestResponses() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Inserting test responses for admin user...');
    
    // Admin user ID is 1
    const userId = 1;
    // Using questionnaire ID 1 (semaglutide)
    const questionnaireId = 1;
    
    // Insert test response for question 1 (multiple choice)
    await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, question_id, questionnaire_id) 
       DO UPDATE SET response_text = $4, created_at = NOW()`,
      [userId, 1, questionnaireId, '["Weight loss","Improved energy"]']
    );
    console.log('Inserted response for question 1');
    
    // Insert test response for question 2 (text)
    await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, question_id, questionnaire_id) 
       DO UPDATE SET response_text = $4, created_at = NOW()`,
      [userId, 2, questionnaireId, 'I am looking forward to trying this medication.']
    );
    console.log('Inserted response for question 2');
    
    // Insert test response for question 3 (text)
    await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, question_id, questionnaire_id) 
       DO UPDATE SET response_text = $4, created_at = NOW()`,
      [userId, 3, questionnaireId, '185 lbs']
    );
    console.log('Inserted response for question 3');
    
    // Insert test response for question 4 (multiple choice)
    await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, question_id, questionnaire_id) 
       DO UPDATE SET response_text = $4, created_at = NOW()`,
      [userId, 4, questionnaireId, '["Diet modifications","Exercise programs"]']
    );
    console.log('Inserted response for question 4');
    
    // Insert test response for question 5 (multiple choice)
    await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, question_id, questionnaire_id) 
       DO UPDATE SET response_text = $4, created_at = NOW()`,
      [userId, 5, questionnaireId, '["11-20 pounds"]']
    );
    console.log('Inserted response for question 5');
    
    // Insert completion record
    await client.query(
      `INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, questionnaire_id) 
       DO UPDATE SET completed_at = NOW()`,
      [userId, questionnaireId]
    );
    console.log('Inserted questionnaire completion record');
    
    await client.query('COMMIT');
    console.log('Successfully inserted all test responses for admin user!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error inserting test responses:', error);
  } finally {
    client.release();
    pool.end();
  }
}

insertTestResponses().catch(console.error); 