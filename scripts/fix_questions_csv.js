const fs = require('fs');
const path = require('path');

// Path to the questions CSV file
const dataDir = path.resolve(__dirname, '../data');
const questionsPath = path.join(dataDir, 'questionnaire_questions.csv');

// The JSON objects as seen in your manually added selection
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

// Recreate the CSV file from scratch
function fixQuestionsCSV() {
  console.log('Creating fixed questions CSV...');
  try {
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
    
    // Print the first few lines for verification
    console.log('\nFirst few lines of the fixed file:');
    console.log(csvContent.split('\n').slice(0, 3).join('\n'));
  } catch (error) {
    console.error('Error fixing questions CSV:', error);
  }
}

// Run the fix
fixQuestionsCSV(); 