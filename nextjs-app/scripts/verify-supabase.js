#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');
const colors = require('colors');

// Configuration
colors.setTheme({
  info: 'blue',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  highlight: 'cyan'
});

// Check DATABASE_URL environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(colors.error('❌ Error: DATABASE_URL environment variable is not set'));
  console.log('Make sure you have a .env.local file with DATABASE_URL defined, or set it in your environment.');
  process.exit(1);
}

console.log(colors.info('🔍 Verifying Supabase connection...'));
console.log(`Connection string: ${connectionString.replace(/:[^:]*@/, ':***@')}`);

// Check if the connection string looks like a Supabase URL
if (!connectionString.includes('supabase')) {
  console.log(colors.warning('⚠️ Warning: This doesn\'t look like a Supabase connection string.'));
  console.log('Expected format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
}

// Create a database pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkConnection() {
  let client;
  try {
    console.log(colors.info('Connecting to database...'));
    client = await pool.connect();
    
    // Test basic query
    const result = await client.query('SELECT current_database() as db, current_user as user, version() as version');
    console.log(colors.success('✅ Connection successful!'));
    console.log('Database:', colors.highlight(result.rows[0].db));
    console.log('User:', colors.highlight(result.rows[0].user));
    console.log('Version:', result.rows[0].version);
    
    // Check for required tables
    console.log(colors.info('\n🔍 Checking for required tables...'));
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND 
            table_name IN ('users', 'questionnaires', 'questions', 'question_options', 
                          'questionnaire_questions', 'user_responses', 'user_multiple_choice_responses', 
                          'questionnaire_completions')
    `);
    
    const foundTables = tablesResult.rows.map(row => row.table_name);
    const requiredTables = [
      'users', 'questionnaires', 'questions', 'question_options', 
      'questionnaire_questions', 'user_responses', 'user_multiple_choice_responses', 
      'questionnaire_completions'
    ];
    
    const missingTables = requiredTables.filter(table => !foundTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log(colors.success('✅ All required tables exist'));
    } else {
      console.log(colors.warning(`⚠️ Missing tables: ${missingTables.join(', ')}`));
      console.log('You need to initialize the database before deployment.');
      console.log('Use the init-db API endpoint or run SQL scripts directly in Supabase.');
    }
    
    // Check for admin user
    if (foundTables.includes('users')) {
      console.log(colors.info('\n🔍 Checking for admin user...'));
      const adminResult = await client.query(`
        SELECT COUNT(*) FROM users WHERE is_admin = true
      `);
      
      if (parseInt(adminResult.rows[0].count) > 0) {
        console.log(colors.success('✅ Admin user exists'));
      } else {
        console.log(colors.warning('⚠️ No admin user found'));
        console.log('Consider creating an admin user:');
        console.log(`  INSERT INTO users (username, password, email, is_admin) 
  VALUES ('admin', 'admin123', 'admin@example.com', TRUE);`);
      }
    }
    
    console.log(colors.success('\n✅ Supabase verification complete!'));
    
  } catch (err) {
    console.error(colors.error('\n❌ Connection failed:'), err.message);
    
    // Provide helpful error messages based on the error type
    if (err.code === 'ENOTFOUND') {
      console.error(colors.error('The database host could not be found. Check the hostname in your connection string.'));
    } else if (err.code === 'ECONNREFUSED') {
      console.error(colors.error('The connection was refused. Make sure the database server is running and accessible.'));
    } else if (err.code === '28P01') {
      console.error(colors.error('Authentication failed. Check your username and password.'));
    } else if (err.code === '3D000') {
      console.error(colors.error('The database does not exist. You may need to create it first.'));
    }
    
    console.log('\nDouble-check your connection string in .env.local:');
    console.log('DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkConnection(); 