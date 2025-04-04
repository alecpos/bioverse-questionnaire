const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

// Use environment variables for sensitive information in production
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// CSV file paths
const CSV_DIR = path.join(__dirname, '../data');
const QUESTIONNAIRES_CSV = path.join(CSV_DIR, 'questionnaire_questionnaires.csv');
const QUESTIONS_CSV = path.join(CSV_DIR, 'questionnaire_questions.csv');
const JUNCTION_CSV = path.join(CSV_DIR, 'questionnaire_junction.csv');

// Helper function to parse CSV with better quote handling
function parseCSV(filePath) {
  const csvContent = fs.readFileSync(filePath, 'utf8');
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
    skip_records_with_error: true
  });
}

async function resetDatabase() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting database reset process...');
    
    // Read and parse CSV files
    const questionnaires = parseCSV(QUESTIONNAIRES_CSV);
    const questions = parseCSV(QUESTIONS_CSV);
    const junctions = parseCSV(JUNCTION_CSV);
    
    console.log(`Found ${questionnaires.length} questionnaires, ${questions.length} questions, and ${junctions.length} junction records`);
    
    // Clear existing data
    console.log('Clearing existing questionnaire data...');
    
    // Check if tables exist and delete data
    const checkTableExists = async (tableName) => {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName]);
      return result.rows[0].exists;
    };
    
    // Drop pending status first if it exists
    try {
      await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'questionnaires' 
          AND column_name = 'is_pending'
        )
      `).then(async result => {
        if (result.rows[0].exists) {
          console.log('Removing is_pending column from questionnaires table...');
          await client.query('ALTER TABLE questionnaires DROP COLUMN IF EXISTS is_pending');
        }
      });
    } catch (error) {
      console.log('No is_pending column to remove');
    }
    
    // Delete data from tables if they exist
    if (await checkTableExists('user_multiple_choice_responses')) {
      await client.query('DELETE FROM user_multiple_choice_responses');
      console.log('Cleared user_multiple_choice_responses table');
    }
    
    if (await checkTableExists('user_responses')) {
      await client.query('DELETE FROM user_responses');
      console.log('Cleared user_responses table');
    }
    
    if (await checkTableExists('questionnaire_completions')) {
      await client.query('DELETE FROM questionnaire_completions');
      console.log('Cleared questionnaire_completions table');
    }
    
    if (await checkTableExists('questionnaire_questions')) {
      await client.query('DELETE FROM questionnaire_questions');
      console.log('Cleared questionnaire_questions table');
    }
    
    if (await checkTableExists('questions')) {
      await client.query('DELETE FROM questions');
      console.log('Cleared questions table');
    }
    
    if (await checkTableExists('questionnaires')) {
      await client.query('DELETE FROM questionnaires');
      console.log('Cleared questionnaires table');
    }
    
    // Import questionnaires
    console.log('Importing questionnaires...');
    for (const q of questionnaires) {
      await client.query(
        'INSERT INTO questionnaires (id, name, description) VALUES ($1, $2, $3)',
        [q.id, q.name, `${q.name} questionnaire for patient assessment`]
      );
      console.log(`Imported questionnaire: ${q.name} (ID: ${q.id})`);
    }
    
    // Import questions
    console.log('Importing questions...');
    for (const q of questions) {
      const options = q.type === 'multiple_choice' ? 
        JSON.stringify(['Yes', 'No']) : // Default options if not specified
        null;
        
      await client.query(
        'INSERT INTO questions (id, text, type, options) VALUES ($1, $2, $3, $4)',
        [q.id, q.text, q.type, options]
      );
      console.log(`Imported question: ${q.text.substring(0, 30)}... (ID: ${q.id})`);
    }
    
    // Now process the junction records to create the correct associations
    console.log('Creating questionnaire-question associations...');
    for (const junction of junctions) {
      try {
        await client.query(
          'INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority) VALUES ($1, $2, $3)',
          [junction.questionnaire_id, junction.question_id, junction.priority || 0]
        );
        console.log(`Connected question ${junction.question_id} to questionnaire ${junction.questionnaire_id}`);
      } catch (error) {
        console.error(`Error creating junction for question ${junction.question_id} to questionnaire ${junction.questionnaire_id}:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database reset completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error resetting database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the reset
resetDatabase(); 