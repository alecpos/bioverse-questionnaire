const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Read environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to read CSV files
function readCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function initDatabase() {
  console.log('Starting database initialization...');
  
  try {
    const client = await pool.connect();
    
    console.log('Connected to database.');
    console.log('Creating tables...');
    
    // Create tables
    await client.query(`
      -- Drop tables if they exist (useful for clean reinstalls)
      -- Drop dependent tables first
      DROP TABLE IF EXISTS user_responses;
      DROP TABLE IF EXISTS user_multiple_choice_responses;
      DROP TABLE IF EXISTS questionnaire_completions;
      DROP TABLE IF EXISTS questionnaire_questions;
      DROP TABLE IF EXISTS question_options;
      DROP TABLE IF EXISTS questions;
      DROP TABLE IF EXISTS questionnaires;
      DROP TABLE IF EXISTS users;

      -- Create users table
      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create questionnaires table
      CREATE TABLE questionnaires (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create questions table
      CREATE TABLE questions (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'multiple_choice')),
          options JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create question options table (for multiple choice questions)
      CREATE TABLE question_options (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          option_text TEXT NOT NULL
      );

      -- Create junction table for questionnaires and questions
      CREATE TABLE questionnaire_questions (
          id SERIAL PRIMARY KEY,
          questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          priority INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(questionnaire_id, question_id)
      );

      -- Create user responses table
      CREATE TABLE user_responses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          response_text TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create table for multiple choice responses
      CREATE TABLE user_multiple_choice_responses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
          option_id INTEGER REFERENCES question_options(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, question_id, option_id, questionnaire_id)
      );

      -- Create questionnaire completions table
      CREATE TABLE questionnaire_completions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          timezone_name VARCHAR(50),
          timezone_offset VARCHAR(10),
          UNIQUE(user_id, questionnaire_id)
      );
    `);
    
    console.log('Tables created successfully.');
    console.log('Inserting sample data...');
    
    // Insert sample users with plain text passwords
    await client.query(`
      INSERT INTO users (username, password, email, is_admin)
      VALUES 
          ('admin', 'admin123', 'admin@example.com', TRUE),
          ('user', 'user123', 'user@example.com', FALSE),
          ('john', 'password123', 'john.doe@example.com', FALSE),
          ('jane', 'password123', 'jane.doe@example.com', FALSE);
    `);
    
    // Load data from CSV files
    console.log('Loading data from CSV files...');
    
    // 1. Load questionnaires from CSV
    const questionnairesPath = path.resolve(__dirname, '../../data/questionnaire_questionnaires.csv');
    console.log(`Reading questionnaires from: ${questionnairesPath}`);
    const questionnaires = await readCsvFile(questionnairesPath);
    
    console.log(`Found ${questionnaires.length} questionnaires:`, questionnaires);
    
    // Insert questionnaires into the database
    for (const questionnaire of questionnaires) {
      await client.query(
        `INSERT INTO questionnaires (id, name, description) 
         VALUES ($1, $2, $3)`,
        [questionnaire.id, questionnaire.name, questionnaire.description || `${questionnaire.name} questionnaire`]
      );
    }
    
    // 2. Load questions from CSV
    const questionsPath = path.resolve(__dirname, '../../data/questionnaire_questions.csv');
    console.log(`Reading questions from: ${questionsPath}`);
    const questions = await readCsvFile(questionsPath);
    
    console.log(`Found ${questions.length} questions`);
    
    // Insert questions into the database
    for (const question of questions) {
      // Parse the JSON content from the 'question' field
      try {
        console.log(`Processing question ID: ${question.id}`);
        
        // Try to parse the JSON content
        let questionData;
        try {
          // If the field is already a JSON object, use it directly
          if (typeof question.question === 'object') {
            questionData = question.question;
          } else {
            // Otherwise, parse it as a string
            questionData = JSON.parse(question.question);
          }
        } catch (e) {
          console.error(`Failed to parse JSON for question ${question.id}:`, e);
          console.log(`Raw question data:`, question);
          continue; // Skip this question
        }
        
        // Get the type and map 'mcq' to 'multiple_choice' for the database
        const type = questionData.type === 'mcq' ? 'multiple_choice' : 'text';
        
        // Get the actual question text
        const questionText = questionData.question || 'No question text provided';
        
        console.log(`Question ${question.id}: "${questionText}" (${type})`);
        
        // Insert the question
        await client.query(
          `INSERT INTO questions (id, text, type) 
           VALUES ($1, $2, $3)`,
          [question.id, questionText, type]
        );
        
        // If it's a multiple choice question, add the options from the JSON
        if (type === 'multiple_choice' && questionData.options && Array.isArray(questionData.options)) {
          console.log(`Adding ${questionData.options.length} options for question ${question.id}`);
          
          for (const optionText of questionData.options) {
            await client.query(
              `INSERT INTO question_options (question_id, option_text) 
               VALUES ($1, $2)`,
              [question.id, optionText]
            );
          }
        }
      } catch (err) {
        console.error(`Error processing question ${question.id}:`, err);
      }
    }
    
    // 3. Load junction table data from CSV
    const junctionPath = path.resolve(__dirname, '../../data/questionnaire_junction.csv');
    console.log(`Reading questionnaire-question mappings from: ${junctionPath}`);
    const junctions = await readCsvFile(junctionPath);
    
    console.log(`Found ${junctions.length} question-questionnaire mappings`);
    
    // Insert junction data
    for (const junction of junctions) {
      await client.query(
        `INSERT INTO questionnaire_questions (id, questionnaire_id, question_id, priority) 
         VALUES ($1, $2, $3, $4)`,
        [junction.id, junction.questionnaire_id, junction.question_id, junction.priority]
      );
    }
    
    console.log('Data from CSV files loaded successfully!');
    console.log('Database initialization complete.');
    
    client.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the initialization
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
}); 