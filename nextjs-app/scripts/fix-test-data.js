const { Pool } = require('pg');
require('dotenv').config({ path: './.env.local' });

// Log env variables (redacted sensitive info)
console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[REDACTED]' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixTestData() {
  let client;
  
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Connected to database successfully!');
    
    // Check connection by getting database version
    const versionResult = await client.query('SELECT version()');
    console.log('Database version:', versionResult.rows[0].version);
    
    await client.query('BEGIN');
    
    // Check if users exist
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Found ${userCount.rows[0].count} users`);
    
    // Check all tables
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:');
    tableResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check primary key constraints on user_responses
    const constraintResult = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_responses' AND constraint_type = 'PRIMARY KEY'
    `);
    console.log('Primary key constraints on user_responses:');
    constraintResult.rows.forEach(row => console.log(`- ${row.constraint_name}`));
    
    // Check unique constraints on user_responses
    const uniqueResult = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'user_responses' AND constraint_type = 'UNIQUE'
    `);
    console.log('Unique constraints on user_responses:');
    uniqueResult.rows.forEach(row => console.log(`- ${row.constraint_name}`));
    
    // Check columns on user_responses
    const columnResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'user_responses'
    `);
    console.log('Columns in user_responses:');
    columnResult.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));
    
    // Insert a simple test response for admin user
    console.log('Inserting test response for admin user...');
    const insertResult = await client.query(
      `INSERT INTO user_responses (user_id, question_id, questionnaire_id, response_text, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [1, 1, 1, 'Test response']
    );
    
    console.log('Inserted response:', insertResult.rows[0]);
    
    await client.query('COMMIT');
    console.log('Transaction committed successfully!');
    
  } catch (error) {
    console.error('Error in fixTestData:', error);
    if (client) {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back');
    }
  } finally {
    if (client) {
      client.release();
      console.log('Client released');
    }
    await pool.end();
    console.log('Pool ended');
  }
}

fixTestData().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 