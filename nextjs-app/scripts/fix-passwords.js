// Fix user passwords in the database
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

// User credentials
const users = [
  { username: 'admin', password: 'admin123', is_admin: true },
  { username: 'user', password: 'user123', is_admin: false }
];

async function fixPasswords() {
  try {
    console.log('Starting password fix...');
    
    for (const user of users) {
      // Check if user exists
      const checkResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(user.password, salt);
      
      if (checkResult.rows.length > 0) {
        // Update existing user
        const userId = checkResult.rows[0].id;
        console.log(`Updating password for user: ${user.username} (ID: ${userId})`);
        
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [passwordHash, userId]
        );
      } else {
        // Create new user
        console.log(`Creating new user: ${user.username}`);
        
        await pool.query(
          `INSERT INTO users (username, password_hash, is_admin)
           VALUES ($1, $2, $3)`,
          [user.username, passwordHash, user.is_admin]
        );
      }
    }
    
    console.log('Password fix completed successfully!');
  } catch (error) {
    console.error('Error fixing passwords:', error);
  } finally {
    await pool.end();
  }
}

fixPasswords(); 