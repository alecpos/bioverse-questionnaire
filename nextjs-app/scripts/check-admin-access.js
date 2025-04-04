// Check admin user privileges
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function checkAdminAccess() {
  const client = await pool.connect();
  
  try {
    console.log('Checking admin user privileges...');
    
    // Get all users
    const usersResult = await client.query(`
      SELECT id, username, is_admin, password_hash 
      FROM users
      ORDER BY id
    `);
    
    console.log('\nUser database entries:');
    usersResult.rows.forEach(user => {
      console.log(`- ID ${user.id}: ${user.username} (Admin: ${user.is_admin ? 'YES' : 'NO'}) Password hash: ${user.password_hash ? 'Present' : 'Missing'}`);
    });
    
    // Check if admin user exists
    const adminResult = await client.query(`
      SELECT * FROM users WHERE username = 'admin'
    `);
    
    if (adminResult.rows.length === 0) {
      console.log('\nERROR: Admin user does not exist!');
      
      // Create admin user
      console.log('Creating admin user...');
      
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await client.query(`
        INSERT INTO users (username, password_hash, email, is_admin)
        VALUES ('admin', $1, 'admin@example.com', true)
      `, [passwordHash]);
      
      console.log('Admin user created successfully.');
    } else {
      const adminUser = adminResult.rows[0];
      
      console.log('\nAdmin user details:');
      console.log(adminUser);
      
      // Check if admin flag is set
      if (!adminUser.is_admin) {
        console.log('\nERROR: Admin user does not have admin privileges!');
        
        // Update admin flag
        console.log('Setting admin privileges...');
        
        await client.query(`
          UPDATE users SET is_admin = true WHERE username = 'admin'
        `);
        
        console.log('Admin privileges set successfully.');
      } else {
        console.log('\nAdmin user has correct admin privileges.');
      }
      
      // Check if password is bcrypt hashed
      if (!adminUser.password_hash || !adminUser.password_hash.startsWith('$2')) {
        console.log('\nWARNING: Admin password is not bcrypt hashed!');
        
        // Update password
        console.log('Updating admin password...');
        
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash('admin123', 10);
        
        await client.query(`
          UPDATE users SET password_hash = $1 WHERE username = 'admin'
        `, [passwordHash]);
        
        console.log('Admin password updated successfully.');
      } else {
        console.log('Admin password is properly hashed.');
      }
    }
    
    console.log('\nAdmin access check completed successfully!');
  } catch (error) {
    console.error('Error checking admin access:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
checkAdminAccess(); 