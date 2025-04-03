// Debug questionnaire completion status
const { Pool } = require('pg');

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';
const pool = new Pool({ connectionString });

async function debugQuestionnaireStatus() {
  const client = await pool.connect();
  
  try {
    console.log('Debugging questionnaire completion status...');
    
    // Get all questionnaires
    const questionnairesResult = await client.query(`
      SELECT * FROM questionnaires ORDER BY id
    `);
    
    console.log(`\nFound ${questionnairesResult.rows.length} questionnaires:`);
    questionnairesResult.rows.forEach(q => {
      console.log(`- ID ${q.id}: ${q.name}`);
    });
    
    // Get all users
    const usersResult = await client.query(`
      SELECT id, username, is_admin FROM users ORDER BY id
    `);
    
    console.log(`\nFound ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(u => {
      console.log(`- ID ${u.id}: ${u.username} (Admin: ${u.is_admin ? 'YES' : 'NO'})`);
    });
    
    // For each user, check if they have completed questionnaires
    console.log('\nChecking questionnaire completions for each user:');
    
    for (const user of usersResult.rows) {
      console.log(`\nUser: ${user.username} (ID: ${user.id})`);
      
      // Check for responses in user_responses table
      const userResponsesResult = await client.query(`
        SELECT DISTINCT questionnaire_id, COUNT(*) as response_count
        FROM user_responses
        WHERE user_id = $1
        GROUP BY questionnaire_id
      `, [user.id]);
      
      console.log(`Found ${userResponsesResult.rows.length} questionnaires with responses:`);
      
      for (const response of userResponsesResult.rows) {
        const questionnaireId = response.questionnaire_id;
        const responseCount = response.response_count;
        
        // Get questionnaire name
        const qResult = await client.query(`
          SELECT name FROM questionnaires WHERE id = $1
        `, [questionnaireId]);
        
        const questionnaireName = qResult.rows.length > 0 ? qResult.rows[0].name : 'Unknown';
        
        // Get total questions for this questionnaire
        const questionCountResult = await client.query(`
          SELECT COUNT(*) as question_count
          FROM questions q
          JOIN questionnaire_questions qq ON q.id = qq.question_id
          WHERE qq.questionnaire_id = $1
        `, [questionnaireId]);
        
        const questionCount = parseInt(questionCountResult.rows[0]?.question_count || '0');
        
        // Check if questionnaire is marked as completed
        const completionResult = await client.query(`
          SELECT * FROM questionnaire_completions
          WHERE user_id = $1 AND questionnaire_id = $2
        `, [user.id, questionnaireId]);
        
        const isCompleted = completionResult.rows.length > 0;
        
        console.log(`- ${questionnaireName} (ID: ${questionnaireId}): ${responseCount}/${questionCount} responses, Marked as completed: ${isCompleted ? 'YES' : 'NO'}`);
        
        // If has responses but not marked as completed, add completion
        if (responseCount > 0 && !isCompleted) {
          console.log(`  Creating missing completion record for User ${user.id}, Questionnaire ${questionnaireId}`);
          
          await client.query(`
            INSERT INTO questionnaire_completions (user_id, questionnaire_id, completed_at)
            VALUES ($1, $2, NOW())
          `, [user.id, questionnaireId]);
          
          console.log(`  Completion record created successfully!`);
        }
      }
      
      // Check for completions without responses (inconsistent data)
      const completionsResult = await client.query(`
        SELECT qc.*, q.name as questionnaire_name
        FROM questionnaire_completions qc
        JOIN questionnaires q ON qc.questionnaire_id = q.id
        WHERE qc.user_id = $1
      `, [user.id]);
      
      console.log(`\nFound ${completionsResult.rows.length} completion records:`);
      
      for (const completion of completionsResult.rows) {
        console.log(`- ${completion.questionnaire_name} (ID: ${completion.questionnaire_id}), Completed at: ${completion.completed_at}`);
        
        // Check if there are actual responses
        const responsesResult = await client.query(`
          SELECT COUNT(*) as response_count
          FROM user_responses
          WHERE user_id = $1 AND questionnaire_id = $2
        `, [user.id, completion.questionnaire_id]);
        
        const responseCount = parseInt(responsesResult.rows[0].response_count);
        
        if (responseCount === 0) {
          console.log(`  WARNING: No responses found for this completion record (inconsistent data)`);
        }
      }
    }
    
    console.log('\nDebug complete!');
  } catch (error) {
    console.error('Error debugging questionnaire status:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
debugQuestionnaireStatus(); 