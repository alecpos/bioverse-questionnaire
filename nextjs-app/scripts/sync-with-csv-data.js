// Synchronize database with CSV data structure
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

// Data from the CSV files
const questionnaires = [
  { id: 1, name: 'Semaglutide' },
  { id: 2, name: 'NAD-Injection' },
  { id: 3, name: 'Metformin' }
];

const questions = [
  { id: 1, text: "Why are you interested in this product? Select all that apply.", type: "multiple_choice" },
  { id: 2, text: "Tell us anything else you'd like your provider to know when prescribing your medication.", type: "text" },
  { id: 3, text: "What is your current weight?", type: "text" },
  { id: 4, text: "Which of the following have you tried in the past? Select all that apply.", type: "multiple_choice" },
  { id: 5, text: "What's your weight loss goal?", type: "multiple_choice" },
  { id: 6, text: "Please list any new medications you are taking.", type: "text" }
];

const junction = [
  { id: 1, question_id: 1, questionnaire_id: 1, priority: 0 },
  { id: 2, question_id: 2, questionnaire_id: 1, priority: 10 },
  { id: 3, question_id: 4, questionnaire_id: 1, priority: 20 },
  { id: 4, question_id: 1, questionnaire_id: 2, priority: 0 },
  { id: 5, question_id: 2, questionnaire_id: 2, priority: 10 },
  { id: 6, question_id: 3, questionnaire_id: 2, priority: 20 },
  { id: 7, question_id: 1, questionnaire_id: 3, priority: 0 },
  { id: 8, question_id: 5, questionnaire_id: 3, priority: 10 },
  { id: 9, question_id: 6, questionnaire_id: 3, priority: 20 }
];

// Options for multiple choice questions
const questionOptions = {
  1: ["Weight loss", "Energy", "Longevity", "Health improvement", "Doctor recommended"],
  4: ["Diet", "Exercise", "Medication", "Supplements", "Fasting"],
  5: ["5-10 lbs", "10-20 lbs", "20-50 lbs", "50+ lbs", "Maintenance only"]
};

async function syncWithCsvData() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Synchronizing database with CSV data...');
    
    // 1. Ensure the questions table is set up correctly
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'questions' AND column_name = 'options'
        ) THEN
          ALTER TABLE questions ADD COLUMN options JSONB;
        END IF;
      END $$;
    `);
    
    console.log('Checking for questionnaire_questions junction table...');
    
    // 2. Ensure the junction table exists
    const junctionTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_questions'
      );
    `);
    
    if (!junctionTableExists.rows[0].exists) {
      console.log('Creating questionnaire_questions junction table...');
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
      // Clear existing junction data
      console.log('Clearing existing junction data...');
      await client.query('TRUNCATE questionnaire_questions RESTART IDENTITY');
    }
    
    // 3. Insert or update questionnaires
    console.log('Updating questionnaires...');
    for (const q of questionnaires) {
      const existsResult = await client.query('SELECT id FROM questionnaires WHERE id = $1', [q.id]);
      
      if (existsResult.rows.length > 0) {
        await client.query(`
          UPDATE questionnaires 
          SET name = $1, description = $2 
          WHERE id = $3
        `, [q.name, `${q.name} questionnaire for patient assessment`, q.id]);
      } else {
        await client.query(`
          INSERT INTO questionnaires (id, name, description, is_active)
          VALUES ($1, $2, $3, true)
        `, [q.id, q.name, `${q.name} questionnaire for patient assessment`]);
      }
    }
    
    // 4. Insert or update questions
    console.log('Updating questions...');
    for (const q of questions) {
      const existsResult = await client.query('SELECT id FROM questions WHERE id = $1', [q.id]);
      
      const options = q.type === 'multiple_choice' ? questionOptions[q.id] : null;
      const optionsJson = options ? JSON.stringify(options) : null;
      
      if (existsResult.rows.length > 0) {
        await client.query(`
          UPDATE questions 
          SET text = $1, type = $2, options = $3
          WHERE id = $4
        `, [q.text, q.type, optionsJson, q.id]);
      } else {
        await client.query(`
          INSERT INTO questions (id, text, type, options)
          VALUES ($1, $2, $3, $4)
        `, [q.id, q.text, q.type, optionsJson]);
      }
    }
    
    // 5. Insert junction data exactly as in the CSV
    console.log('Adding junction data from CSV...');
    for (const item of junction) {
      await client.query(`
        INSERT INTO questionnaire_questions (id, question_id, questionnaire_id, priority)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (question_id, questionnaire_id) DO UPDATE
        SET priority = EXCLUDED.priority
      `, [item.id, item.question_id, item.questionnaire_id, item.priority]);
    }
    
    // 6. Test the updated data
    console.log('Testing the updated data structure...');
    for (let i = 1; i <= 3; i++) {
      const result = await client.query(`
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
      `, [i]);
      
      console.log(`Questionnaire ${i} (${questionnaires[i-1].name}) has ${result.rows.length} questions:`);
      for (const row of result.rows) {
        console.log(`  - (Priority ${row.priority}) ${row.text.substring(0, 40)}... (${row.type})`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database successfully synchronized with CSV data!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error synchronizing with CSV data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
syncWithCsvData(); 