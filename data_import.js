// Script to import CSV data into the database

const fs = require('fs');
const { Pool } = require('pg');
const csv = require('csv-parser');
const path = require('path');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bioverse_questionnaire',
  password: 'postgres',
  port: 5432,
});

// File paths
const questionnairesFile = path.join(__dirname, '../data/questionnaire_questionnaires.csv');
const questionsFile = path.join(__dirname, '../data/questionnaire_questions.csv');
const junctionFile = path.join(__dirname, '../data/questionnaire_junction.csv');

// Parse CSV and return as array of objects
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Import questionnaires
async function importQuestionnaires(questionnairesData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Importing questionnaires...');
    for (const questionnaire of questionnairesData) {
      const { id, name } = questionnaire;
      const query = 'INSERT INTO questionnaires (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = $2';
      await client.query(query, [id, name]);
    }

    await client.query('COMMIT');
    console.log(`Imported ${questionnairesData.length} questionnaires`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing questionnaires:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Import questions
async function importQuestions(questionsData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Importing questions...');
    for (const question of questionsData) {
      const { id, text, type } = question;
      
      // Determine question type based on text content
      let questionType = 'text';
      if (text.toLowerCase().includes('select all that apply')) {
        questionType = 'multiple_choice';
      }
      
      const query = 'INSERT INTO questions (id, text, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET text = $2, type = $3';
      await client.query(query, [id, text, questionType]);
      
      // If it's a multiple choice question, import options
      if (questionType === 'multiple_choice') {
        // Extract options from the question text
        // This is a simplified example - in reality, you would need to parse the options from the actual data
        const potentialOptions = [
          'Improve blood pressure',
          'Reduce risk of future cardiac events',
          'Support lifestyle changes',
          'Longevity benefits',
          'Keto or low carb',
          'Plant-based',
          'Macro or calorie counting',
          'Weight Watchers',
          'Noom',
          'Calibrate',
          'Found',
          'Alpha',
          'Push Health',
          'Losing 1-15 pounds',
          'Losing 16-50 pounds',
          'Losing 51+ pounds',
          'Not sure, I just need to lose weight'
        ];
        
        // For each question, determine which options apply based on question text
        let options = [];
        if (text.includes('Why are you interested')) {
          options = potentialOptions.slice(0, 4);
        } else if (text.includes('tried in the past')) {
          options = potentialOptions.slice(4, 13);
        } else if (text.includes('weight loss goal')) {
          options = potentialOptions.slice(13, 17);
        }
        
        // Insert options
        for (const optionText of options) {
          const optionQuery = 'INSERT INTO question_options (question_id, option_text) VALUES ($1, $2) ON CONFLICT DO NOTHING';
          await client.query(optionQuery, [id, optionText]);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Imported ${questionsData.length} questions`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing questions:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Import junction data
async function importJunctionData(junctionData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Importing junction data...');
    for (const junction of junctionData) {
      const { id, question_id, questionnaire_id, priority } = junction;
      const query = 'INSERT INTO questionnaire_questions (id, question_id, questionnaire_id, priority) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING';
      await client.query(query, [id, question_id, questionnaire_id, priority]);
    }

    await client.query('COMMIT');
    console.log(`Imported ${junctionData.length} junction records`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error importing junction data:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Main function
async function importAllData() {
  try {
    // Parse CSV files
    const questionnairesData = await parseCSV(questionnairesFile);
    const questionsData = await parseCSV(questionsFile);
    const junctionData = await parseCSV(junctionFile);

    // Import data
    await importQuestionnaires(questionnairesData);
    await importQuestions(questionsData);
    await importJunctionData(junctionData);

    console.log('All data imported successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    pool.end();
  }
}

// Run the import
importAllData(); 