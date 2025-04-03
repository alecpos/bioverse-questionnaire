// Fix duplicate questions in different questionnaires
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function fixDuplicateQuestions() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking for duplicate questions across questionnaires...');
    
    // Get all questions and their questionnaire assignments
    const { rows: questions } = await client.query(`
      SELECT q.id, q.text, q.type, q.questionnaire_id, q.priority, qu.name as questionnaire_name
      FROM questions q
      JOIN questionnaires qu ON q.questionnaire_id = qu.id
      ORDER BY q.id, q.questionnaire_id
    `);
    
    console.log(`Found ${questions.length} question-questionnaire assignments`);
    
    // Check if we need to change DB schema for duplicate questions
    const hasMultipleAssignments = {};
    const questionCounts = {};
    
    questions.forEach(q => {
      if (!questionCounts[q.text]) {
        questionCounts[q.text] = { count: 0, ids: [] };
      }
      questionCounts[q.text].count++;
      questionCounts[q.text].ids.push(q.id);
    });
    
    // Find duplicated questions
    let duplicateFound = false;
    for (const text in questionCounts) {
      if (questionCounts[text].count > 1) {
        duplicateFound = true;
        console.log(`Question "${text.substring(0, 40)}..." is used in ${questionCounts[text].count} questionnaires (IDs: ${questionCounts[text].ids.join(', ')})`);
      }
    }
    
    if (!duplicateFound) {
      console.log('No duplicate questions found, no need to fix schema');
      return;
    }
    
    // Check if junction table exists, if not create it
    const junctionTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questionnaire_questions'
      );
    `);
    
    if (!junctionTableExists.rows[0].exists) {
      console.log('Creating junction table for questionnaire-question many-to-many relationship...');
      
      await client.query(`
        CREATE TABLE questionnaire_questions (
          id SERIAL PRIMARY KEY,
          questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id),
          question_id INTEGER NOT NULL REFERENCES questions(id),
          priority INTEGER NOT NULL DEFAULT 0,
          UNIQUE(questionnaire_id, question_id)
        )
      `);
      
      console.log('Junction table created');
      
      // Migrate existing data to junction table
      console.log('Migrating existing question assignments to junction table...');
      
      await client.query(`
        INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority)
        SELECT questionnaire_id, id, priority 
        FROM questions 
        WHERE questionnaire_id IS NOT NULL
      `);
      
      // Count migrated records
      const { rows: countRows } = await client.query('SELECT COUNT(*) FROM questionnaire_questions');
      console.log(`Migrated ${countRows[0].count} assignments to junction table`);
      
      // Now we can remove the questionnaire_id and priority from questions table
      console.log('Removing questionnaire_id and priority columns from questions table...');
      
      await client.query(`
        ALTER TABLE questions 
        DROP COLUMN IF EXISTS questionnaire_id,
        DROP COLUMN IF EXISTS priority
      `);
      
      console.log('Schema update completed successfully!');
    } else {
      console.log('Junction table already exists');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('All fixes completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing duplicate questions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixDuplicateQuestions(); 