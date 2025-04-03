#!/usr/bin/env node
/**
 * Script to import questionnaires, questions, and junctions from CSV files
 * 
 * Usage:
 *   node scripts/import-questionnaires.js <questionnaires.csv> <questions.csv> <junctions.csv>
 */

const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const axios = require('axios');

// Helper function to read CSV files
async function readCSV(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    console.error(`Error reading CSV from ${filePath}:`, error);
    throw new Error(`Failed to read CSV: ${error.message}`);
  }
}

async function main() {
  // Check if correct arguments are provided
  if (process.argv.length < 5) {
    console.error('Usage: node scripts/import-questionnaires.js <questionnaires.csv> <questions.csv> <junctions.csv>');
    process.exit(1);
  }

  // Get file paths from command line arguments
  const questionnairesPath = path.resolve(process.argv[2]);
  const questionsPath = path.resolve(process.argv[3]);
  const junctionsPath = path.resolve(process.argv[4]);

  console.log('Importing questionnaires from CSV files:');
  console.log(`- Questionnaires: ${questionnairesPath}`);
  console.log(`- Questions: ${questionsPath}`);
  console.log(`- Junctions: ${junctionsPath}`);

  try {
    // Read CSV files
    console.log('Reading questionnaires CSV...');
    const questionnaires = await readCSV(questionnairesPath);
    console.log(`Found ${questionnaires.length} questionnaires`);

    console.log('Reading questions CSV...');
    const questions = await readCSV(questionsPath);
    console.log(`Found ${questions.length} questions`);

    console.log('Reading junctions CSV...');
    const junctions = await readCSV(junctionsPath);
    console.log(`Found ${junctions.length} junctions`);

    // Create a map of question data
    const questionMap = new Map();
    questions.forEach(question => {
      questionMap.set(question.id, {
        ...question,
        options: question.options ? JSON.parse(question.options) : undefined
      });
    });

    // Group junctions by questionnaire
    const questionnaireQuestions = new Map();
    junctions.forEach(junction => {
      const { questionnaire_id, question_id, priority } = junction;
      if (!questionnaireQuestions.has(questionnaire_id)) {
        questionnaireQuestions.set(questionnaire_id, []);
      }
      
      const question = questionMap.get(question_id);
      if (question) {
        const questionWithPriority = {
          ...question,
          priority: parseInt(priority, 10)
        };
        questionnaireQuestions.get(questionnaire_id).push(questionWithPriority);
      }
    });

    // Create final structured data with questions sorted by priority
    const structuredQuestionnaires = questionnaires.map(questionnaire => {
      const questions = questionnaireQuestions.get(questionnaire.id) || [];
      // Sort questions by priority
      questions.sort((a, b) => a.priority - b.priority);
      
      return {
        ...questionnaire,
        questions
      };
    });

    // Send data to API
    console.log('Structured data ready, but API call is commented out for testing');
    console.log('Questionnaires prepared:', structuredQuestionnaires.length);
    
    // Uncomment this to actually send to the API
    /*
    const apiEndpoint = 'http://localhost:3000/api/admin/import-questionnaires';
    console.log('Sending data to API at:', apiEndpoint);
    const response = await axios.post(apiEndpoint, structuredQuestionnaires);
    console.log('API response:', response.data);
    */
    
    // For testing, just output the first questionnaire
    console.log('\nSample of first questionnaire:');
    console.log(JSON.stringify(structuredQuestionnaires[0], null, 2));
    
    console.log('\nImport validation completed successfully');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error); 