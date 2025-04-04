-- Add timezone columns to questionnaire_completions table
ALTER TABLE questionnaire_completions 
ADD COLUMN IF NOT EXISTS timezone_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone_offset VARCHAR(10); 