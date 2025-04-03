const { Pool } = require('pg');

// Use environment variables for sensitive information in production
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bioverse_questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seed...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create sample questionnaires
    console.log('Creating sample questionnaires...');
    const questionnairesResult = await client.query(`
      INSERT INTO questionnaires (name, description)
      VALUES
        ('Health Assessment', 'Basic health questionnaire to understand your current health status'),
        ('Diet Preferences', 'Questionnaire to capture your dietary preferences and restrictions'),
        ('Exercise Habits', 'Survey about your exercise routines and physical activity')
      RETURNING id, name;
    `);
    
    const questionnaires = questionnairesResult.rows;
    console.log(`Created ${questionnaires.length} questionnaires`);
    
    // Create sample questions
    console.log('Creating sample questions...');
    const questionsResult = await client.query(`
      INSERT INTO questions (text, type)
      VALUES
        ('What are your health goals?', 'multiple_choice'),
        ('Do you have any medical conditions?', 'text'),
        ('How would you rate your current health?', 'multiple_choice'),
        ('What dietary restrictions do you have?', 'multiple_choice'),
        ('How often do you exercise per week?', 'multiple_choice'),
        ('What types of exercise do you enjoy?', 'multiple_choice'),
        ('Describe your ideal meal plan', 'text'),
        ('What are your biggest health challenges?', 'text')
      RETURNING id, text, type;
    `);
    
    const questions = questionsResult.rows;
    console.log(`Created ${questions.length} questions`);
    
    // Add questions to questionnaires
    console.log('Assigning questions to questionnaires...');
    
    // Health Assessment questions
    await client.query(`
      INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority)
      VALUES
        (${questionnaires[0].id}, ${questions[0].id}, 1),
        (${questionnaires[0].id}, ${questions[1].id}, 2),
        (${questionnaires[0].id}, ${questions[2].id}, 3),
        (${questionnaires[0].id}, ${questions[7].id}, 4);
    `);
    
    // Diet Preferences questions
    await client.query(`
      INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority)
      VALUES
        (${questionnaires[1].id}, ${questions[3].id}, 1),
        (${questionnaires[1].id}, ${questions[6].id}, 2);
    `);
    
    // Exercise Habits questions
    await client.query(`
      INSERT INTO questionnaire_questions (questionnaire_id, question_id, priority)
      VALUES
        (${questionnaires[2].id}, ${questions[4].id}, 1),
        (${questionnaires[2].id}, ${questions[5].id}, 2);
    `);
    
    // Add options for multiple choice questions
    console.log('Adding options for multiple choice questions...');
    
    // Health goals options
    await client.query(`
      INSERT INTO question_options (question_id, option_text)
      VALUES
        (${questions[0].id}, 'Weight loss'),
        (${questions[0].id}, 'Muscle gain'),
        (${questions[0].id}, 'General wellbeing'),
        (${questions[0].id}, 'Managing a health condition'),
        (${questions[0].id}, 'Improving energy levels');
    `);
    
    // Health rating options
    await client.query(`
      INSERT INTO question_options (question_id, option_text)
      VALUES
        (${questions[2].id}, 'Excellent'),
        (${questions[2].id}, 'Good'),
        (${questions[2].id}, 'Fair'),
        (${questions[2].id}, 'Poor');
    `);
    
    // Dietary restrictions options
    await client.query(`
      INSERT INTO question_options (question_id, option_text)
      VALUES
        (${questions[3].id}, 'Vegetarian'),
        (${questions[3].id}, 'Vegan'),
        (${questions[3].id}, 'Gluten-free'),
        (${questions[3].id}, 'Dairy-free'),
        (${questions[3].id}, 'Nut allergy'),
        (${questions[3].id}, 'No restrictions');
    `);
    
    // Exercise frequency options
    await client.query(`
      INSERT INTO question_options (question_id, option_text)
      VALUES
        (${questions[4].id}, 'Never'),
        (${questions[4].id}, '1-2 times'),
        (${questions[4].id}, '3-4 times'),
        (${questions[4].id}, '5+ times');
    `);
    
    // Exercise types options
    await client.query(`
      INSERT INTO question_options (question_id, option_text)
      VALUES
        (${questions[5].id}, 'Cardio (running, cycling)'),
        (${questions[5].id}, 'Strength training'),
        (${questions[5].id}, 'Flexibility (yoga, stretching)'),
        (${questions[5].id}, 'Team sports'),
        (${questions[5].id}, 'Swimming'),
        (${questions[5].id}, 'Walking/Hiking');
    `);
    
    // Create sample users if they don't exist
    console.log('Creating sample users...');
    await client.query(`
      INSERT INTO users (username, password, is_admin)
      VALUES
        ('admin', 'admin123', TRUE),
        ('user', 'user123', FALSE)
      ON CONFLICT (username) DO NOTHING;
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Database seed completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seed function
seed().catch(console.error); 