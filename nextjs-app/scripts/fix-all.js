// Run all database fix scripts in sequence
const { exec } = require('child_process');
const path = require('path');

// Helper function to run scripts sequentially
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Running ${path.basename(scriptPath)}...`);
    
    exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ${path.basename(scriptPath)}:`, error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`${path.basename(scriptPath)} stderr:`, stderr);
      }
      
      console.log(stdout);
      console.log(`${path.basename(scriptPath)} completed successfully!`);
      resolve();
    });
  });
}

// Run all scripts in sequence
async function runAllFixScripts() {
  try {
    console.log('Starting database fix process...');
    
    // Run schema fixes first
    await runScript(path.join(__dirname, 'fix-schema.js'));
    
    // Then fix questionnaire data
    await runScript(path.join(__dirname, 'fix-questionnaire-data.js'));
    
    // Finally run password fix
    await runScript(path.join(__dirname, 'fix-passwords.js'));
    
    console.log('All database fixes completed successfully!');
  } catch (error) {
    console.error('Error during database fix process:', error);
    process.exit(1);
  }
}

runAllFixScripts(); 