// Create and populate the questionnaire_questions junction table
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function fixQuestionnaireJunction() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking current schema...');
    
    // 1. Check if junction table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_questions'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Creating questionnaire_questions junction table...');
      
      // Create the junction table
      await client.query(`
        CREATE TABLE questionnaire_questions (
          id SERIAL PRIMARY KEY,
          question_id INTEGER NOT NULL,
          questionnaire_id INTEGER NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          UNIQUE(question_id, questionnaire_id)
        )
      `);
    } else {
      console.log('Junction table already exists, clearing existing data...');
      await client.query('TRUNCATE questionnaire_questions RESTART IDENTITY');
    }
    
    console.log('Loading junction data from questions table...');
    
    // Get all questions with their questionnaire_id
    const questions = await client.query(`
      SELECT id, questionnaire_id, priority FROM questions
      WHERE questionnaire_id IS NOT NULL
    `);
    
    // Insert into junction table
    console.log(`Found ${questions.rows.length} questions to add to junction table`);
    
    for (const q of questions.rows) {
      await client.query(`
        INSERT INTO questionnaire_questions (question_id, questionnaire_id, priority)
        VALUES ($1, $2, $3)
        ON CONFLICT (question_id, questionnaire_id) DO UPDATE
        SET priority = EXCLUDED.priority
      `, [q.id, q.questionnaire_id, q.priority || 0]);
    }
    
    // Define the junction data from CSV
    const junctionData = [
      { question_id: 1, questionnaire_id: 1, priority: 0 },
      { question_id: 2, questionnaire_id: 1, priority: 10 },
      { question_id: 4, questionnaire_id: 1, priority: 20 },
      { question_id: 1, questionnaire_id: 2, priority: 0 },
      { question_id: 2, questionnaire_id: 2, priority: 10 },
      { question_id: 3, questionnaire_id: 2, priority: 20 },
      { question_id: 1, questionnaire_id: 3, priority: 0 },
      { question_id: 5, questionnaire_id: 3, priority: 10 },
      { question_id: 6, questionnaire_id: 3, priority: 20 }
    ];
    
    console.log('Adding CSV junction data...');
    
    // Insert the junction data
    for (const item of junctionData) {
      await client.query(`
        INSERT INTO questionnaire_questions (question_id, questionnaire_id, priority)
        VALUES ($1, $2, $3)
        ON CONFLICT (question_id, questionnaire_id) DO UPDATE
        SET priority = EXCLUDED.priority
      `, [item.question_id, item.questionnaire_id, item.priority]);
    }
    
    console.log('Updating API endpoint for questionnaires...');
    
    // Test the query used by the API
    const testQuery = await client.query(`
      SELECT 
        q.id, 
        q.text, 
        q.type, 
        qq.priority,
        q.options
      FROM questions q
      JOIN questionnaire_questions qq ON q.id = qq.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.priority ASC
    `, [1]);
    
    console.log(`Test query for questionnaire 1 returned ${testQuery.rows.length} questions`);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Junction table setup completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing questionnaire junction:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixQuestionnaireJunction(); 