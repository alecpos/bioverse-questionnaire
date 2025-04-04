#!/usr/bin/env ts-node
/**
 * Script to import questionnaires, questions, and junctions from CSV files
 * 
 * Usage:
 *   npx ts-node scripts/import-questionnaires.ts <questionnaires.csv> <questions.csv> <junctions.csv>
 */

import path from 'path';
import { importQuestionnairesFromCSV } from '../utils/csvImport';

async function main() {
  // Check if correct arguments are provided
  if (process.argv.length < 5) {
    console.error('Usage: npx ts-node scripts/import-questionnaires.ts <questionnaires.csv> <questions.csv> <junctions.csv>');
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
    // Import data from CSV files
    const result = await importQuestionnairesFromCSV(
      questionnairesPath,
      questionsPath,
      junctionsPath,
      'http://localhost:3000/api/admin/import-questionnaires'
    );

    console.log('Import completed successfully:');
    console.log(result);
  } catch (error) {
    console.error('Error importing questionnaires:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error); 