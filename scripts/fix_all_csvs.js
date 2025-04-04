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
  
  // Create a properly formatted questionnaires CSV
  const content = 'id,name,description\n' +
    '1,Semaglutide,Semaglutide questionnaire\n' +
    '2,NAD-Injection,NAD-Injection questionnaire\n' +
    '3,Metformin,Metformin questionnaire\n';
  
  // Write the fixed content
  fs.writeFileSync(questionnairesPath, content);
  console.log('Fixed questionnaires CSV successfully.');
}

// Fix the junction CSV
function fixJunctionCSV() {
  console.log('Fixing junction CSV...');
  
  // Create a properly formatted junction CSV
  const content = 'id,question_id,questionnaire_id,priority\n' +
    '1,1,1,0\n' +
    '2,2,1,10\n' +
    '3,4,1,20\n' +
    '4,1,2,0\n' +
    '5,2,2,10\n' +
    '6,3,2,20\n' +
    '7,1,3,0\n' +
    '8,5,3,10\n' +
    '9,6,3,20\n';
  
  // Write the fixed content
  fs.writeFileSync(junctionPath, content);
  console.log('Fixed junction CSV successfully.');
}

// Fix the questions CSV which contains JSON objects
function fixQuestionsCSV() {
  console.log('Creating fixed questions CSV...');
  
  // The JSON objects from your manually added selection
  const questionObjects = [
    {
      id: 1,
      data: {
        type: "mcq",
        options: [
          "Improve blood pressure",
          "Reduce risk of future cardiac events",
          "Support lifestyle changes",
          "Longevity benefits"
        ],
        question: "Why are you interested in this product? Select all that apply."
      }
    },
    {
      id: 2,
      data: {
        type: "input",
        question: "Tell us anything else you'd like your provider to know when prescribing your medication."
      }
    },
    {
      id: 3,
      data: {
        type: "input",
        question: "What is your current weight?"
      }
    },
    {
      id: 4,
      data: {
        type: "mcq",
        options: [
          "Keto or low carb",
          "Plant-based",
          "Macro or calorie counting",
          "Weight Watchers",
          "Noom",
          "Calibrate",
          "Found",
          "Alpha",
          "Push Health"
        ],
        question: "Which of the following have you tried in the past? Select all that apply."
      }
    },
    {
      id: 5,
      data: {
        type: "mcq",
        options: [
          "Losing 1-15 pounds",
          "Losing 16-50 pounds",
          "Losing 51+ pounds",
          "Not sure, I just need to lose weight"
        ],
        question: "What's your weight loss goal?"
      }
    },
    {
      id: 6,
      data: {
        type: "input",
        question: "Please list any new medications you are taking."
      }
    }
  ];
  
  // Create a proper CSV file
  let csvContent = 'id,question\n';
  
  // For each question object, add a row to the CSV
  for (const questionObj of questionObjects) {
    // Convert the data to a JSON string
    const jsonData = JSON.stringify(questionObj.data);
    
    // Escape the double quotes for CSV format
    const escapedJson = jsonData.replace(/"/g, '""');
    
    // Add the row to the CSV content
    csvContent += `${questionObj.id},"${escapedJson}"\n`;
  }
  
  // Write the fixed content to the file
  fs.writeFileSync(questionsPath, csvContent);
  console.log('Fixed questions CSV successfully!');
}

// Run all fix functions
fixQuestionnairesCSV();
fixJunctionCSV();
fixQuestionsCSV();

console.log('All CSV files fixed!'); 