// Validate imported data against CSV files
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

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

async function validateImport() {
  const client = await pool.connect();
  
  try {
    console.log('Validating imported data against CSV files...');
    
    // Read and parse CSV files
    const questionnaires = parseCSV(QUESTIONNAIRES_CSV);
    const questions = parseCSV(QUESTIONS_CSV);
    const junctions = parseCSV(JUNCTION_CSV);
    
    console.log(`CSV data: ${questionnaires.length} questionnaires, ${questions.length} questions, and ${junctions.length} junction records`);
    
    // Check questionnaires
    console.log('\nValidating questionnaires...');
    const dbQuestionnaires = await client.query('SELECT id, name FROM questionnaires ORDER BY id');
    console.log(`Database has ${dbQuestionnaires.rows.length} questionnaires`);
    
    const csvQuestionnairesMap = {};
    questionnaires.forEach(q => {
      csvQuestionnairesMap[q.id] = q.name;
    });
    
    let questionnairesMatch = true;
    for (const dbQ of dbQuestionnaires.rows) {
      const csvName = csvQuestionnairesMap[dbQ.id];
      if (csvName === dbQ.name) {
        console.log(`✓ Questionnaire ${dbQ.id}: "${dbQ.name}" matches CSV`);
      } else {
        console.log(`✗ Questionnaire ${dbQ.id}: "${dbQ.name}" does not match CSV "${csvName}"`);
        questionnairesMatch = false;
      }
    }
    
    // Check questions
    console.log('\nValidating questions...');
    const dbQuestions = await client.query('SELECT id, text FROM questions ORDER BY id');
    console.log(`Database has ${dbQuestions.rows.length} questions`);
    
    const csvQuestionsMap = {};
    questions.forEach(q => {
      csvQuestionsMap[q.id] = q.text;
    });
    
    let questionsMatch = true;
    for (const dbQ of dbQuestions.rows) {
      const csvText = csvQuestionsMap[dbQ.id];
      if (csvText === dbQ.text) {
        console.log(`✓ Question ${dbQ.id}: "${dbQ.text.substring(0, 30)}..." matches CSV`);
      } else {
        console.log(`✗ Question ${dbQ.id}: "${dbQ.text.substring(0, 30)}..." does not match CSV "${csvText?.substring(0, 30)}..."`);
        questionsMatch = false;
      }
    }
    
    // Check junction data (question-questionnaire associations)
    console.log('\nValidating question-questionnaire associations...');
    const dbAssociations = await client.query('SELECT id, questionnaire_id, priority FROM questions ORDER BY id');
    
    // Create a map of the expected associations from junction CSV
    const expectedAssociations = {};
    junctions.forEach(j => {
      expectedAssociations[j.question_id] = {
        questionnaire_id: parseInt(j.questionnaire_id),
        priority: parseInt(j.priority) || 0
      };
    });
    
    let associationsMatch = true;
    for (const dbA of dbAssociations.rows) {
      // Since questions can be in multiple questionnaires but DB schema has just one questionnaire_id,
      // we'll only check the last association for each question in the junction file
      const expected = expectedAssociations[dbA.id];
      if (!expected) {
        console.log(`? Question ${dbA.id} has no expected association in junction CSV`);
        continue;
      }
      
      if (expected.questionnaire_id === dbA.questionnaire_id && expected.priority === dbA.priority) {
        console.log(`✓ Question ${dbA.id} correctly associated with questionnaire ${dbA.questionnaire_id} (priority: ${dbA.priority})`);
      } else {
        console.log(`✗ Question ${dbA.id} association wrong: expected questionnaire ${expected.questionnaire_id} (priority: ${expected.priority}), got ${dbA.questionnaire_id} (priority: ${dbA.priority})`);
        associationsMatch = false;
      }
    }
    
    // Final validation result
    console.log('\nValidation Summary:');
    console.log(`Questionnaires: ${questionnairesMatch ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Questions: ${questionsMatch ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Associations: ${associationsMatch ? '✓ PASS' : '✗ FAIL'}`);
    
    if (questionnairesMatch && questionsMatch && associationsMatch) {
      console.log('\n✅ All data validates successfully!');
    } else {
      console.log('\n❌ Some data validation failed.');
    }
    
  } catch (error) {
    console.error('Error validating import:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the validation
validateImport(); 