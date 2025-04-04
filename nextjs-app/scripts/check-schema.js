// Check database schema
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Checking database schema...');
    
    // Check questions table schema
    const questionColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questions'
    `);
    
    console.log('Questions table columns:');
    questionColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    // Check questionnaires table schema
    const questionnaireColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questionnaires'
    `);
    
    console.log('\nQuestionnaires table columns:');
    questionnaireColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\nSchema check completed.');
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema(); 