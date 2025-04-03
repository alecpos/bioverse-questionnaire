import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';
import { getAuthenticatedUser } from '../../../lib/auth';

// Helper function to map question types from the JSON format to the database format
const mapQuestionType = (type: string): string => {
  // Map the type names from the JSON format to the database format
  const typeMap: Record<string, string> = {
    'mcq': 'multiple_choice',
    'input': 'text',
    // Add more mappings as needed
  };
  
  return typeMap[type.toLowerCase()] || type;
};

// Helper function to get next available negative ID
async function getNextAvailableNegativeId(tableName: string): Promise<number> {
  try {
    const result = await db.query(`
      SELECT MIN(id) as min_id 
      FROM ${tableName} 
      WHERE id < 0
    `);
    
    const minId = result.rows[0]?.min_id ? parseInt(result.rows[0].min_id) : 0;
    return minId - 1; // Go one lower than the current minimum
  } catch (error) {
    console.error(`Error getting next negative ID for ${tableName}:`, error);
    return -999999; // Fallback to a very low number
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access
    const user = await getAuthenticatedUser(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Extract data from request body
    const questionnaires = req.body;
    
    if (!Array.isArray(questionnaires)) {
      return res.status(400).json({ error: 'Invalid data format. Expected an array of questionnaires.' });
    }

    // Begin a transaction for data integrity
    await db.query('BEGIN');

    try {
      console.log(`Processing ${questionnaires.length} questionnaires`);
      
      // Track similar questionnaires for warning messages
      const similarQuestionnaires = [];
      
      // Import each questionnaire
      for (const questionnaire of questionnaires) {
        // Check if similar questionnaire already exists (by name)
        const similarQuestionnaire = await db.query(
          'SELECT id, name FROM questionnaires WHERE LOWER(name) = LOWER($1) AND id != $2',
          [questionnaire.name, questionnaire.id]
        );

        if (similarQuestionnaire.rows.length > 0) {
          similarQuestionnaires.push({
            importName: questionnaire.name,
            existingName: similarQuestionnaire.rows[0].name,
            existingId: similarQuestionnaire.rows[0].id
          });
        }

        // Check if questionnaire already exists
        const existingQuestionnaire = await db.query(
          'SELECT id FROM questionnaires WHERE id = $1',
          [questionnaire.id]
        );

        let questionnaireId = questionnaire.id;

        // If the questionnaire doesn't exist, insert it
        if (existingQuestionnaire.rows.length === 0) {
          console.log(`Creating new questionnaire: ${questionnaire.name} (ID: ${questionnaire.id})`);
          const result = await db.query(
            'INSERT INTO questionnaires (id, name, description, created_at, updated_at, is_pending) VALUES ($1, $2, $3, NOW(), NOW(), TRUE) RETURNING id',
            [questionnaire.id, questionnaire.name, questionnaire.description]
          );
          questionnaireId = result.rows[0].id;
        } else {
          // Update existing questionnaire - set as pending for admin review instead of direct update
          console.log(`Existing questionnaire found: ${questionnaire.name} (ID: ${questionnaire.id}), marking as pending`);
          
          // Create a pending copy with a temporary ID
          // Get the next available negative ID to avoid conflicts
          const tempId = await getNextAvailableNegativeId('questionnaires');
          
          try {
            const result = await db.query(
              'INSERT INTO questionnaires (id, name, description, created_at, updated_at, is_pending) VALUES ($1, $2, $3, NOW(), NOW(), TRUE) RETURNING id',
              [tempId, `${questionnaire.name} (PENDING UPDATE)`, questionnaire.description]
            );
            questionnaireId = result.rows[0].id;
          } catch (err: any) {
            // If we're getting a duplicate key error, try with an even lower negative ID
            if (err.code === '23505') { // duplicate key error
              const evenLowerTempId = tempId - 1000;
              const result = await db.query(
                'INSERT INTO questionnaires (id, name, description, created_at, updated_at, is_pending) VALUES ($1, $2, $3, NOW(), NOW(), TRUE) RETURNING id',
                [evenLowerTempId, `${questionnaire.name} (PENDING UPDATE)`, questionnaire.description]
              );
              questionnaireId = result.rows[0].id;
            } else {
              throw err;
            }
          }
        }

        // Process questions for this questionnaire
        if (Array.isArray(questionnaire.questions)) {
          for (const question of questionnaire.questions) {
            // Map the question type to the correct database format
            const mappedType = mapQuestionType(question.type);
            console.log(`Processing question ID ${question.id}, type: ${question.type} → ${mappedType}`);
            
            let questionId: number;
            
            // Generate a unique temporary ID for the question if we're creating a pending version
            if (questionnaireId < 0) {
              questionId = await getNextAvailableNegativeId('questions');
              // Make it even more negative to avoid conflicts
              questionId = questionId - question.id;
            } else {
              questionId = question.id;
            }
            
            // Check if question already exists (only for non-pending)
            if (questionnaireId > 0) {
              const existingQuestion = await db.query(
                'SELECT id FROM questions WHERE id = $1',
                [questionId]
              );

              // If the question doesn't exist, insert it
              if (existingQuestion.rows.length === 0) {
                const optionsString = question.options ? JSON.stringify(question.options) : null;
                
                await db.query(
                  'INSERT INTO questions (id, text, type, options) VALUES ($1, $2, $3, $4)',
                  [questionId, question.text, mappedType, optionsString]
                );
              } else {
                // Update existing question - removed updated_at as it doesn't exist in schema
                const optionsString = question.options ? JSON.stringify(question.options) : null;
                
                await db.query(
                  'UPDATE questions SET text = $1, type = $2, options = $3 WHERE id = $4',
                  [question.text, mappedType, optionsString, questionId]
                );
              }
            } else {
              // This is a pending version, insert a new question with temporary ID
              const optionsString = question.options ? JSON.stringify(question.options) : null;
              
              try {
                await db.query(
                  'INSERT INTO questions (id, text, type, options) VALUES ($1, $2, $3, $4)',
                  [questionId, question.text, mappedType, optionsString]
                );
              } catch (err: any) {
                // If we get a duplicate key error, try with an even more negative ID
                if (err.code === '23505') {
                  questionId = questionId - 1000;
                  await db.query(
                    'INSERT INTO questions (id, text, type, options) VALUES ($1, $2, $3, $4)',
                    [questionId, question.text, mappedType, optionsString]
                  );
                } else {
                  console.log(`Error inserting pending question: ${err.message}`);
                  throw err;
                }
              }
            }

            // Create junction entry
            try {
              // For junction table, generate a unique ID to avoid conflicts
              const junctionId = await getNextAvailableNegativeId('questionnaire_questions');
              
              await db.query(
                'INSERT INTO questionnaire_questions (id, questionnaire_id, question_id, priority) VALUES ($1, $2, $3, $4)',
                [junctionId - 100, questionnaireId, questionId, question.priority || 0]
              );
            } catch (err: any) {
              console.error(`Error inserting junction record: ${err.message}`);
              // If it's a unique constraint violation, we can try with a different ID
              if (err.code === '23505') { // 23505 is the code for unique violation
                try {
                  const junctionId = await getNextAvailableNegativeId('questionnaire_questions');
                  await db.query(
                    'INSERT INTO questionnaire_questions (id, questionnaire_id, question_id, priority) VALUES ($1, $2, $3, $4)',
                    [junctionId - 2000, questionnaireId, questionId, question.priority || 0]
                  );
                } catch (innerErr: any) {
                  console.error(`Second attempt at inserting junction failed: ${innerErr.message}`);
                  // Continue without failing the whole import
                }
              }
            }
          }
        }
      }

      // Commit the transaction
      await db.query('COMMIT');

      // Return success response with warnings about similar questionnaires
      return res.status(201).json({
        success: true,
        message: `Imported ${questionnaires.length} questionnaires successfully. They have been marked as pending for review.`,
        similarQuestionnaires: similarQuestionnaires.length > 0 ? similarQuestionnaires : null
      });
    } catch (error) {
      // If any error occurs, rollback the transaction
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error importing questionnaires:', error);
    return res.status(500).json({ 
      error: 'Failed to import questionnaires',
      details: error.message,
      code: error.code,
      hint: error.hint || error.detail || 'Check that question types are valid (must be "text" or "multiple_choice").'
    });
  }
} 