// Update question priorities for better logical ordering
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function fixQuestionPriorities() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Updating question priorities for logical ordering...');
    
    // Get all questionnaires
    const questionnaires = await client.query(`
      SELECT id, name FROM questionnaires ORDER BY id
    `);
    
    for (const questionnaire of questionnaires.rows) {
      console.log(`\nFixing question priorities for "${questionnaire.name}" (ID: ${questionnaire.id}):`);
      
      // Get questions for this questionnaire through the junction table
      const questions = await client.query(`
        SELECT 
          q.id, 
          q.text, 
          q.type, 
          qq.priority
        FROM questions q
        JOIN questionnaire_questions qq ON q.id = qq.question_id
        WHERE qq.questionnaire_id = $1
        ORDER BY qq.priority ASC
      `, [questionnaire.id]);
      
      if (questions.rows.length === 0) {
        console.log(`  No questions found for questionnaire ${questionnaire.id}`);
        continue;
      }
      
      console.log(`  Found ${questions.rows.length} questions`);
      
      // Create an array to store new priorities
      const updatedQuestions = [...questions.rows];
      
      // Find the "Tell us anything else" question if it exists
      const tellUsIndex = updatedQuestions.findIndex(q => 
        q.text.toLowerCase().includes('tell us anything else') || 
        q.text.toLowerCase().includes('anything else you')
      );
      
      if (tellUsIndex !== -1) {
        // Move the "Tell us anything else" question to the end
        const tellUsQuestion = updatedQuestions.splice(tellUsIndex, 1)[0];
        updatedQuestions.push(tellUsQuestion);
        console.log(`  Moved "Tell us anything else" question to the end`);
      }
      
      // Reorder other questions logically (main questions first, follow-up/detail questions after)
      // Weight-loss related questions come earlier for weight-related questionnaires
      
      // Sort multiple-choice questions to come before text input questions (except the "tell us" one which stays at the end)
      updatedQuestions.sort((a, b) => {
        // Skip sorting if one is the "tell us" question that we've already moved to the end
        if (a.text.toLowerCase().includes('tell us anything else') || 
            a.text.toLowerCase().includes('anything else you')) return 1;
        if (b.text.toLowerCase().includes('tell us anything else') || 
            b.text.toLowerCase().includes('anything else you')) return -1;
            
        // Put "Why are you interested" questions first
        if (a.text.toLowerCase().includes('why are you interested')) return -1;
        if (b.text.toLowerCase().includes('why are you interested')) return 1;
        
        // Put weight loss goals near the beginning
        if (a.text.toLowerCase().includes('weight loss goal')) return -1;
        if (b.text.toLowerCase().includes('weight loss goal')) return 1;
        
        // Put "have you tried" questions after the interest and goal questions
        if (a.text.toLowerCase().includes('have you tried')) return 0;
        if (b.text.toLowerCase().includes('have you tried')) return -1;
        
        // Put multiple choice before text input (except for special cases handled above)
        if (a.type === 'multiple_choice' && b.type !== 'multiple_choice') return -1;
        if (a.type !== 'multiple_choice' && b.type === 'multiple_choice') return 1;
        
        return 0;
      });
      
      // Assign new priorities (starting from 10, increment by 10 for easier future inserts)
      for (let i = 0; i < updatedQuestions.length; i++) {
        const newPriority = (i + 1) * 10;
        console.log(`  Question: "${updatedQuestions[i].text.substring(0, 30)}..." - New priority: ${newPriority}`);
        
        // Update the priority in the junction table
        await client.query(`
          UPDATE questionnaire_questions 
          SET priority = $1
          WHERE questionnaire_id = $2 AND question_id = $3
        `, [newPriority, questionnaire.id, updatedQuestions[i].id]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\nAll question priorities updated successfully!');
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Error fixing question priorities:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
fixQuestionPriorities(); 