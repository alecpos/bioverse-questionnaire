const { Pool } = require('pg');

// Use environment variables for sensitive information in production
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Correct options for each question based on the CSV data
const questionOptions = {
  // Question ID 1: Why are you interested in this product?
  1: [
    "Improve blood pressure",
    "Reduce risk of future cardiac events",
    "Support lifestyle changes",
    "Longevity benefits"
  ],
  
  // Question ID 4: Which of the following have you tried in the past?
  4: [
    "Keto or low carb",
    "Plant-based",
    "Macro or calorie counting",
    "Weight Watchers",
    "Noom",
    "Calibrate",
    "Found",
    "Alpha",
    "Push Health"
  ],
  
  // Question ID 5: What's your weight loss goal?
  5: [
    "Losing 1-15 pounds",
    "Losing 16-50 pounds",
    "Losing 51+ pounds",
    "Not sure, I just need to lose weight"
  ]
};

// Types for each question
const questionTypes = {
  1: "multiple_choice",
  2: "text",
  3: "text",
  4: "multiple_choice",
  5: "multiple_choice",
  6: "text"
};

// Question text mapping
const questionText = {
  1: "Why are you interested in this product? Select all that apply.",
  2: "Tell us anything else you'd like your provider to know when prescribing your medication.",
  3: "What is your current weight?",
  4: "Which of the following have you tried in the past? Select all that apply.",
  5: "What's your weight loss goal?",
  6: "Please list any new medications you are taking."
};

async function updateQuestions() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Updating questions with correct data from CSV...');
    
    // Update each question with correct text, type and options
    for (const [id, text] of Object.entries(questionText)) {
      const type = questionTypes[id];
      const options = questionOptions[id] || null;
      const optionsJson = options ? JSON.stringify(options) : null;
      
      await client.query(
        'UPDATE questions SET text = $1, type = $2, options = $3 WHERE id = $4',
        [text, type, optionsJson, id]
      );
      
      console.log(`Updated question ID ${id} with type ${type}${options ? ' and options' : ''}`);
    }
    
    // Check questionnaire table
    console.log('Checking questionnaire names...');
    
    // Update questionnaire names to match CSV
    const questionnaires = [
      { id: 1, name: "semaglutide", description: "Semaglutide questionnaire for patient assessment" },
      { id: 2, name: "nad-injection", description: "NAD-Injection questionnaire for patient assessment" },
      { id: 3, name: "metformin", description: "Metformin questionnaire for patient assessment" }
    ];
    
    for (const q of questionnaires) {
      await client.query(
        'UPDATE questionnaires SET name = $1, description = $2 WHERE id = $3',
        [q.name, q.description, q.id]
      );
      
      console.log(`Updated questionnaire ID ${q.id} to "${q.name}"`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Successfully updated all questions and questionnaires!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error updating questions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updateQuestions(); 