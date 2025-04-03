const { Pool } = require('pg');

// Use environment variables for sensitive information in production
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Correct options for each question
const questionOptions = {
  // Question ID 1: Why are you interested in this product?
  1: [
    "Weight loss",
    "Diabetes management",
    "Improved energy",
    "Better overall health",
    "Recommended by friend/family"
  ],
  
  // Question ID 4: Which of the following have you tried in the past?
  4: [
    "Diet modifications",
    "Exercise programs",
    "Other medications",
    "Behavioral therapy",
    "None of the above"
  ],
  
  // Question ID 5: What's your weight loss goal?
  5: [
    "5-10 pounds",
    "11-20 pounds",
    "21-30 pounds",
    "More than 30 pounds",
    "Maintenance only"
  ]
};

async function fixQuestionOptions() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Fixing multiple choice options for questions...');
    
    // Update each question with correct options
    for (const [questionId, options] of Object.entries(questionOptions)) {
      const optionsJson = JSON.stringify(options);
      
      await client.query(
        'UPDATE questions SET options = $1 WHERE id = $2',
        [optionsJson, questionId]
      );
      
      console.log(`Updated options for question ID ${questionId} with: ${optionsJson}`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully fixed all question options!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing question options:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixQuestionOptions(); 