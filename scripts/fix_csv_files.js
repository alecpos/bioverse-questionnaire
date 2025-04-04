const fs = require('fs');
const path = require('path');

// Paths to the CSV files
const dataDir = path.resolve(__dirname, '../data');
const questionnairesPath = path.join(dataDir, 'questionnaire_questionnaires.csv');
const questionsPath = path.join(dataDir, 'questionnaire_questions.csv');
const junctionPath = path.join(dataDir, 'questionnaire_junction.csv');

// Fix the questionnaires CSV
function fixQuestionnairesCSV() {
  console.log('Fixing questionnaires CSV...');
  try {
    let content = fs.readFileSync(questionnairesPath, 'utf8');
    
    // Check if the file uses tabs instead of commas
    if (content.includes('\t')) {
      console.log('Converting tabs to commas in questionnaires file');
      content = content.replace(/\t/g, ',');
    }
    
    // Make sure there's a trailing newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    // Write back the fixed content
    fs.writeFileSync(questionnairesPath, content);
    console.log('Fixed questionnaires CSV successfully.');
  } catch (error) {
    console.error('Error fixing questionnaires CSV:', error);
  }
}

// Fix the junction CSV
function fixJunctionCSV() {
  console.log('Fixing junction CSV...');
  try {
    let content = fs.readFileSync(junctionPath, 'utf8');
    
    // Check if the file uses tabs instead of commas
    if (content.includes('\t')) {
      console.log('Converting tabs to commas in junction file');
      content = content.replace(/\t/g, ',');
    }
    
    // Make sure there's a trailing newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    // Write back the fixed content
    fs.writeFileSync(junctionPath, content);
    console.log('Fixed junction CSV successfully.');
  } catch (error) {
    console.error('Error fixing junction CSV:', error);
  }
}

// Fix the questions CSV which has JSON content
function fixQuestionsCSV() {
  console.log('Fixing questions CSV...');
  try {
    // Read the content of the file
    const content = fs.readFileSync(questionsPath, 'utf8');
    
    // Split into lines
    const lines = content.split(/\r?\n/);
    
    // Prepare the new content
    let newContent = 'id,question\n';
    
    // For each line (skipping header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;  // Skip empty lines
      
      // Try to parse the line based on tab or comma
      let id, questionData;
      
      if (line.includes('\t')) {
        // Tab-separated
        [id, questionData] = line.split('\t', 2);
      } else if (line.includes(',')) {
        // Comma-separated - be careful with commas in the JSON
        id = line.split(',', 1)[0];
        questionData = line.substring(id.length + 1);
      } else {
        console.warn(`Could not parse line ${i + 1}: ${line}`);
        continue;
      }
      
      // Clean up the questionData - this might be a JSON string
      // Remove any leading/trailing quotes if they're enclosing the entire JSON
      questionData = questionData.trim();
      if (questionData.startsWith('"') && questionData.endsWith('"')) {
        questionData = questionData.substring(1, questionData.length - 1);
      }
      
      // Escape any quotes within the JSON to avoid CSV parsing issues
      questionData = questionData.replace(/"/g, '""');
      
      // Add the fixed line to the new content
      newContent += `${id},"${questionData}"\n`;
    }
    
    // Write back the fixed content
    fs.writeFileSync(questionsPath, newContent);
    console.log('Fixed questions CSV successfully.');
  } catch (error) {
    console.error('Error fixing questions CSV:', error);
  }
}

// Run the fix functions
fixQuestionnairesCSV();
fixJunctionCSV();
fixQuestionsCSV();

console.log('All CSV files fixed!'); 