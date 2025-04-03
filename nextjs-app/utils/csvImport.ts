import { parse } from 'csv-parse/sync';
import axios from 'axios';

// Conditionally import fs only in Node.js environment
const fs = typeof window === 'undefined' ? require('fs') : null;

// Define interfaces for CSV data structures
export interface QuestionnaireCSV {
  id: string;
  name: string;
  description: string;
}

export interface QuestionCSV {
  id: string;
  text: string;
  type: string;
  options?: string; // JSON string that will be parsed
}

export interface JunctionCSV {
  questionnaire_id: string;
  question_id: string;
  priority: string;
}

/**
 * Read and parse a CSV file from a file path or URL
 * Works in both Node.js (using fs) and browser (using fetch)
 */
export async function readCSV<T>(source: string): Promise<T[]> {
  let csvContent: string;

  // Check if running in browser or Node.js
  const isBrowser = typeof window !== 'undefined';

  if (isBrowser) {
    // For browser - fetch the file from a URL
    try {
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV from ${source}: ${response.statusText}`);
      }
      csvContent = await response.text();
    } catch (error) {
      console.error('Error reading CSV from URL:', error);
      throw new Error(`Failed to read CSV from URL: ${error}`);
    }
  } else {
    // For Node.js - read from filesystem
    try {
      if (!fs) {
        throw new Error('File system module not available');
      }
      csvContent = fs.readFileSync(source, 'utf-8');
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw new Error(`Failed to read CSV file: ${error}`);
    }
  }

  // Parse CSV content
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    return records;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error(`Failed to parse CSV: ${error}`);
  }
}

/**
 * Import questionnaire data from CSV files
 */
export async function importQuestionnairesFromCSV(
  questionnairesPath: string,
  questionsPath: string,
  junctionsPath: string,
  apiEndpoint: string
): Promise<any> {
  try {
    console.log('Reading questionnaires CSV from:', questionnairesPath);
    const questionnaires = await readCSV<QuestionnaireCSV>(questionnairesPath);
    console.log(`Found ${questionnaires.length} questionnaires`);

    console.log('Reading questions CSV from:', questionsPath);
    const questions = await readCSV<QuestionCSV>(questionsPath);
    console.log(`Found ${questions.length} questions`);

    console.log('Reading junctions CSV from:', junctionsPath);
    const junctions = await readCSV<JunctionCSV>(junctionsPath);
    console.log(`Found ${junctions.length} junctions`);

    // Create a map of question data
    const questionMap = new Map<string, QuestionCSV & { priority?: number }>();
    questions.forEach(question => {
      questionMap.set(question.id, {
        ...question,
        options: question.options ? JSON.parse(question.options) : undefined
      });
    });

    // Group junctions by questionnaire
    const questionnaireQuestions = new Map<string, Array<QuestionCSV & { priority: number }>>();
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
        questionnaireQuestions.get(questionnaire_id)?.push(questionWithPriority);
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
    console.log('Sending data to API at:', apiEndpoint);
    console.log('Sending questionnaires:', structuredQuestionnaires.length);
    
    // Always use axios for HTTP requests to simplify cross-environment compatibility
    const response = await axios.post(apiEndpoint, structuredQuestionnaires);
    
    console.log('API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error importing questionnaires from CSV:', error);
    throw error;
  }
}

// Example usage in Node.js:
// if (typeof require !== 'undefined' && require.main === module) {
//   const args = process.argv.slice(2);
//   if (args.length !== 4) {
//     console.error('Usage: node csvImport.js <questionnaires.csv> <questions.csv> <junctions.csv> <api_endpoint>');
//     process.exit(1);
//   }
//   
//   const [questionnairesPath, questionsPath, junctionsPath, apiEndpoint] = args;
//   importQuestionnairesFromCSV(questionnairesPath, questionsPath, junctionsPath, apiEndpoint)
//     .then(result => console.log('Import completed:', result))
//     .catch(err => {
//       console.error('Import failed:', err);
//       process.exit(1);
//     });
// } 