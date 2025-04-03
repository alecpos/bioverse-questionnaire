// Add test responses for a regular user
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function addTestResponses() {
  const client = await pool.connect();
  
  try {
    console.log('Adding test responses for user ID 2 (regular user)...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Add responses for NAD-Injection questionnaire (ID 2)
    console.log('Adding responses for NAD-Injection questionnaire...');
    
    await client.query(`
      INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
      VALUES 
        (2, 2, 1, '["Energy", "Longevity"]'), 
        (2, 2, 2, 'No allergies or health concerns to report.'), 
        (2, 2, 3, '72kg')
      ON CONFLICT (user_id, questionnaire_id, question_id) 
      DO UPDATE SET response_text = EXCLUDED.response_text
    `);
    
    // Add responses for Metformin questionnaire (ID 3)
    console.log('Adding responses for Metformin questionnaire...');
    
    await client.query(`
      INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
      VALUES 
        (2, 3, 1, '["Weight loss", "Health improvement"]'),
        (2, 3, 5, '["10-20 lbs"]'),
        (2, 3, 6, 'No new medications')
      ON CONFLICT (user_id, questionnaire_id, question_id) 
      DO UPDATE SET response_text = EXCLUDED.response_text
    `);
    
    // Add completion records
    console.log('Adding completion records...');
    
    await client.query(`
      INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
      VALUES 
        (2, 2, NOW()),
        (2, 3, NOW())
      ON CONFLICT (user_id, questionnaire_id)
      DO UPDATE SET completed_at = NOW()
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Test responses added successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding test responses:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addTestResponses(); 