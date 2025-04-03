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
const CSV_DIR = path.join(__dirname, '../../data');
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

async function importCSVData() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Importing questionnaire data from CSV files...');
    
    // Read and parse CSV files
    const questionnaires = parseCSV(QUESTIONNAIRES_CSV);
    const questions = parseCSV(QUESTIONS_CSV);
    const junctions = parseCSV(JUNCTION_CSV);
    
    console.log(`Found ${questionnaires.length} questionnaires, ${questions.length} questions, and ${junctions.length} junction records`);
    
    // Clear existing data
    console.log('Clearing existing questionnaire data...');
    await client.query('DELETE FROM user_responses');
    await client.query('DELETE FROM questionnaire_completions');
    await client.query('DELETE FROM questions');
    await client.query('DELETE FROM questionnaires');
    
    // Import questionnaires
    console.log('Importing questionnaires...');
    for (const q of questionnaires) {
      await client.query(
        'INSERT INTO questionnaires (id, name, description, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, description = $3, is_active = $4',
        [q.id, q.name, `${q.name} questionnaire for patient assessment`, true]
      );
      console.log(`Imported questionnaire: ${q.name} (ID: ${q.id})`);
    }
    
    // Junction data from CSV shows multiple questions can belong to multiple questionnaires
    // We need to import each question once and then create the associations correctly
    
    // First, import all questions
    console.log('Importing questions...');
    for (const q of questions) {
      await client.query(
        'INSERT INTO questions (id, text, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET text = $2, type = $3',
        [q.id, q.text, q.type]
      );
      console.log(`Imported question: ${q.text.substring(0, 30)}... (ID: ${q.id})`);
    }
    
    // Now process the junction records to create the correct associations
    console.log('Creating question-questionnaire associations from junction data...');
    
    // First, get the current questions to check what exists
    const existingQuestions = await client.query('SELECT id FROM questions');
    const questionIds = existingQuestions.rows.map(row => row.id);
    
    for (const junction of junctions) {
      const questionId = parseInt(junction.question_id);
      const questionnaireId = parseInt(junction.questionnaire_id);
      const priority = parseInt(junction.priority) || 0;
      
      // Check if question exists before updating
      if (questionIds.includes(questionId)) {
        await client.query(
          'UPDATE questions SET questionnaire_id = $1, priority = $2 WHERE id = $3',
          [questionnaireId, priority, questionId]
        );
        
        console.log(`Connected question ${questionId} to questionnaire ${questionnaireId} with priority ${priority}`);
      } else {
        console.log(`Warning: Question ID ${questionId} not found, skipping junction record`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('CSV data import completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error importing CSV data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the import
importCSVData(); 