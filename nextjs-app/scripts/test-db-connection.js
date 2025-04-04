require('dotenv').config();
const { Pool } = require('pg');

// Get the database connection string from environment variables
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

// Create a new database connection pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Simple function to test the connection
async function testConnection() {
  let client;
  
  try {
    console.log('Attempting to connect to the database...');
    console.log(`Connection string: ${connectionString.replace(/:[^:]*@/, ':***@')}`);
    
    // Get a client from the pool
    client = await pool.connect();
    
    // Run a simple query
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name, version() as pg_version');
    
    console.log('\n✅ Connection successful!');
    console.log('Database:', result.rows[0].db_name);
    console.log('User:', result.rows[0].user_name);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    // Check if our tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('\nExisting tables:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    } else {
      console.log('\nNo tables found in the database.');
      console.log('You may need to run the database initialization script.');
    }
    
  } catch (err) {
    console.error('\n❌ Connection failed:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('The database host could not be found. Check the hostname in your connection string.');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('The connection was refused. Make sure the database server is running and accessible.');
    } else if (err.code === '28P01') {
      console.error('Authentication failed. Check your username and password.');
    } else if (err.code === '3D000') {
      console.error('The database does not exist. You may need to create it first.');
    }
  } finally {
    // Close the client and pool
    if (client) client.release();
    await pool.end();
  }
}

// Run the test
testConnection(); 