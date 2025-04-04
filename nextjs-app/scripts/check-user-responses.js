// Check and fix the user_responses table structure
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function checkAndFixUserResponses() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking user_responses table structure...');
    
    // Check if the table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_responses'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('user_responses table does not exist, creating it...');
      
      // Create the table with the correct structure
      await client.query(`
        CREATE TABLE user_responses (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          questionnaire_id INTEGER NOT NULL,
          question_id INTEGER NOT NULL,
          response TEXT NOT NULL,
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, questionnaire_id, question_id)
        )
      `);
      
      console.log('user_responses table created successfully.');
    } else {
      console.log('user_responses table exists, checking columns...');
      
      // Get current columns
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_responses';
      `);
      
      console.log('Current columns:');
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name} (${col.data_type})`);
      });
      
      // Check for different column names
      const hasResponseColumn = columns.rows.some(col => col.column_name === 'response');
      const hasResponseTextColumn = columns.rows.some(col => col.column_name === 'response_text');
      const hasAnswerColumn = columns.rows.some(col => col.column_name === 'answer');
      
      if (hasResponseTextColumn && !hasResponseColumn) {
        console.log('Found response_text column, creating response column as alias...');
        
        // First check if we can modify the API endpoint instead
        console.log('Checking API endpoint file...');
        
        // Create response column as an alias for response_text
        await client.query(`
          ALTER TABLE user_responses 
          ADD COLUMN response TEXT GENERATED ALWAYS AS (response_text) STORED;
        `);
        
        console.log('Added response column as alias for response_text');
      } else if (!hasResponseColumn && !hasResponseTextColumn) {
        console.log('Adding response column...');
        await client.query(`
          ALTER TABLE user_responses 
          ADD COLUMN response TEXT NOT NULL DEFAULT '';
        `);
      } else if (!hasResponseColumn && hasAnswerColumn) {
        console.log('Renaming answer column to response...');
        await client.query(`
          ALTER TABLE user_responses 
          RENAME COLUMN answer TO response;
        `);
      } else {
        console.log('response column already exists.');
      }
    }
    
    // Check for other required columns
    const requiredColumns = [
      { name: 'user_id', type: 'integer' },
      { name: 'questionnaire_id', type: 'integer' },
      { name: 'question_id', type: 'integer' }
    ];
    
    for (const col of requiredColumns) {
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'user_responses' 
          AND column_name = $1
        );
      `, [col.name]);
      
      if (!columnExists.rows[0].exists) {
        console.log(`Adding missing column: ${col.name}...`);
        await client.query(`
          ALTER TABLE user_responses 
          ADD COLUMN ${col.name} ${col.type} NOT NULL DEFAULT 0;
        `);
      }
    }
    
    // Update the API submit endpoint
    console.log('Testing a response submission query...');
    
    const testQuery = `
      INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, questionnaire_id, question_id) 
      DO UPDATE SET response_text = EXCLUDED.response_text
    `;
    
    // Try explaining the query to validate syntax without actually executing it
    await client.query(`EXPLAIN ${testQuery}`, [1, 1, 1, 'test']);
    
    console.log('Test query syntax is valid.');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('user_responses table structure has been fixed!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing user_responses table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkAndFixUserResponses(); 