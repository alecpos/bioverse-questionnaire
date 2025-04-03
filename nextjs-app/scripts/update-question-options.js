// Update question options for multiple choice questions
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function updateQuestionOptions() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking for multiple choice questions that need options...');
    
    // Check if questions table has options column
    const hasOptionsColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'options'
      );
    `);
    
    if (!hasOptionsColumn.rows[0].exists) {
      console.log('Adding options column to questions table...');
      await client.query(`
        ALTER TABLE questions 
        ADD COLUMN options JSONB
      `);
      console.log('Added options column');
    }
    
    // Get all multiple choice questions
    const { rows: questions } = await client.query(`
      SELECT id, text, type, options
      FROM questions
      WHERE type = 'multiple_choice'
      ORDER BY id
    `);
    
    console.log(`Found ${questions.length} multiple choice questions`);
    
    // Update options for each question
    for (const question of questions) {
      let options = [];
      
      // Set options based on question text
      if (question.text.includes('interested in this product')) {
        options = ['Weight loss', 'Energy', 'Longevity', 'Health improvement', 'Doctor recommended'];
      } else if (question.text.includes('tried in the past')) {
        options = ['Diet', 'Exercise', 'Medication', 'Supplements', 'Fasting'];
      } else if (question.text.includes('weight loss goal')) {
        options = ['5-10 lbs', '10-20 lbs', '20-50 lbs', '50+ lbs', 'Maintenance only'];
      } else {
        options = ['Option 1', 'Option 2', 'Option 3', 'Option 4', 'Option 5'];
      }
      
      // Update question with options
      await client.query(`
        UPDATE questions
        SET options = $1
        WHERE id = $2
      `, [JSON.stringify(options), question.id]);
      
      console.log(`Updated options for question ${question.id}: "${question.text.substring(0, 30)}..." with options: ${options.join(', ')}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('All question options updated successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error updating question options:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateQuestionOptions(); 