// Fix questionnaire data
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

// Sample questionnaire data
const sampleQuestionnaires = [
  {
    title: 'Mood Assessment',
    description: 'Evaluate your current mood and emotional state',
    questions: [
      { text: 'How would you rate your mood today?', options: ['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'] },
      { text: 'Have you felt anxious in the past week?', options: ['Not at all', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
      { text: 'How has your sleep been this week?', options: ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'] }
    ]
  },
  {
    title: 'Daily Activity',
    description: 'Track your daily activities and productivity',
    questions: [
      { text: 'How productive do you feel today?', options: ['Not at all', 'Slightly', 'Moderately', 'Very', 'Extremely'] },
      { text: 'How many hours did you work/study today?', options: ['0-2 hours', '3-5 hours', '6-8 hours', '8+ hours'] },
      { text: 'Did you exercise today?', options: ['Yes', 'No'] },
      { text: 'How would you rate your energy levels?', options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'] }
    ]
  }
];

// Fix questionnaire data
async function fixQuestionnaireData() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Checking questionnaire data...');
    
    // Check if questionnaires exist
    const questionnairesResult = await client.query('SELECT COUNT(*) FROM questionnaires');
    const questionnaireCount = parseInt(questionnairesResult.rows[0].count);
    
    if (questionnaireCount === 0) {
      console.log('No questionnaires found. Adding sample questionnaires...');
      
      // Add sample questionnaires
      for (const questionnaire of sampleQuestionnaires) {
        // Insert questionnaire
        const questionnaireResult = await client.query(
          'INSERT INTO questionnaires (title, description) VALUES ($1, $2) RETURNING id',
          [questionnaire.title, questionnaire.description]
        );
        
        const questionnaireId = questionnaireResult.rows[0].id;
        console.log(`Added questionnaire: ${questionnaire.title} (ID: ${questionnaireId})`);
        
        // Insert questions
        for (const [index, question] of questionnaire.questions.entries()) {
          const questionResult = await client.query(
            'INSERT INTO questions (questionnaire_id, text, options, order_num) VALUES ($1, $2, $3, $4) RETURNING id',
            [questionnaireId, question.text, JSON.stringify(question.options), index + 1]
          );
          
          console.log(`Added question: ${question.text.substring(0, 30)}... (ID: ${questionResult.rows[0].id})`);
        }
      }
      
      console.log('Sample questionnaires added successfully!');
    } else {
      console.log(`Found ${questionnaireCount} existing questionnaires. Skipping sample data creation.`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Questionnaire data fix completed successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing questionnaire data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixQuestionnaireData(); 