 -- Drop tables if they exist (useful for clean reinstalls)
DROP TABLE IF EXISTS user_responses;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS questionnaires;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questionnaires table
CREATE TABLE questionnaires (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'multiple_choice')),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create question options table (for multiple choice questions)
CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL
);

-- Create user responses table
CREATE TABLE user_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, questionnaire_id, question_id)
);

-- Insert sample users
INSERT INTO users (username, password_hash, email, first_name, last_name, is_admin)
VALUES 
    ('admin', '$2b$10$3euPcmQFCiblsZeEu5s7p.9wVTWwyIDVzxcF9tn8K1079UtIb3QIm', 'admin@bioverse.com', 'Admin', 'User', TRUE),
    ('user', '$2b$10$TM3IYYtFpCIyo3SpvKtJreS2H4aIWQ4HymY5K83HM48qJDQIgfBuS', 'user@bioverse.com', 'Regular', 'User', FALSE),
    ('john', '$2b$10$GRnIZ9NRvOS5JHp/U91rW.RvgwJKDU38RQRRJjbLKkhkZfabp0Iju', 'john.doe@example.com', 'John', 'Doe', FALSE),
    ('jane', '$2b$10$DsEoGUFKqVCjAJ9FYU8hB.GeCJWHlbA1JYYgVrEhVkRqQFjrVEIXG', 'jane.doe@example.com', 'Jane', 'Doe', FALSE);
-- Password for all users is 'password123'

-- Insert sample questionnaires
INSERT INTO questionnaires (name, description)
VALUES 
    ('Health Assessment', 'Initial health assessment questionnaire to understand your health goals.'),
    ('Nutrition Survey', 'Survey to understand your dietary preferences and nutritional needs.'),
    ('Exercise Habits', 'Questionnaire about your current exercise habits and goals.');

-- Insert sample questions for Health Assessment
INSERT INTO questions (questionnaire_id, text, type, priority)
VALUES
    (1, 'What are your primary health goals?', 'multiple_choice', 1),
    (1, 'How would you describe your current health status?', 'multiple_choice', 2),
    (1, 'Do you have any existing medical conditions?', 'text', 3),
    (1, 'Are you currently taking any medications?', 'text', 4),
    (1, 'What concerns you most about your health?', 'text', 5);

-- Insert sample question options for Health Assessment
INSERT INTO question_options (question_id, option_text)
VALUES
    (1, 'Weight loss'),
    (1, 'Improved fitness'),
    (1, 'Muscle gain'),
    (1, 'Better sleep'),
    (1, 'Stress reduction'),
    (1, 'More energy'),
    (2, 'Excellent'),
    (2, 'Good'),
    (2, 'Fair'),
    (2, 'Poor');

-- Insert sample questions for Nutrition Survey
INSERT INTO questions (questionnaire_id, text, type, priority)
VALUES
    (2, 'Which diets have you tried in the past?', 'multiple_choice', 1),
    (2, 'Do you have any food allergies or intolerances?', 'text', 2),
    (2, 'How many meals do you typically eat per day?', 'multiple_choice', 3),
    (2, 'What are your favorite foods?', 'text', 4),
    (2, 'How much water do you drink daily?', 'multiple_choice', 5);

-- Insert sample question options for Nutrition Survey
INSERT INTO question_options (question_id, option_text)
VALUES
    (6, 'Keto'),
    (6, 'Paleo'),
    (6, 'Vegan'),
    (6, 'Vegetarian'),
    (6, 'Mediterranean'),
    (6, 'Intermittent fasting'),
    (8, 'Two meals'),
    (8, 'Three meals'),
    (8, 'Three meals with snacks'),
    (8, 'Multiple small meals'),
    (10, 'Less than 1 liter'),
    (10, '1-2 liters'),
    (10, '2-3 liters'),
    (10, 'More than 3 liters');

-- Insert sample questions for Exercise Habits
INSERT INTO questions (questionnaire_id, text, type, priority)
VALUES
    (3, 'What type of exercise do you currently engage in?', 'multiple_choice', 1),
    (3, 'How many times per week do you exercise?', 'multiple_choice', 2),
    (3, 'What are your exercise goals?', 'multiple_choice', 3),
    (3, 'Do you have any limitations that affect your ability to exercise?', 'text', 4),
    (3, 'What time of day do you prefer to exercise?', 'multiple_choice', 5);

-- Insert sample question options for Exercise Habits
INSERT INTO question_options (question_id, option_text)
VALUES
    (11, 'Cardio/aerobic'),
    (11, 'Strength training'),
    (11, 'Yoga/Pilates'),
    (11, 'Team sports'),
    (11, 'No regular exercise'),
    (12, 'Never'),
    (12, '1-2 times'),
    (12, '3-4 times'),
    (12, '5+ times'),
    (13, 'Weight loss'),
    (13, 'Muscle gain'),
    (13, 'Improve cardiovascular health'),
    (13, 'Increase flexibility'),
    (13, 'Reduce stress'),
    (15, 'Morning'),
    (15, 'Afternoon'),
    (15, 'Evening'),
    (15, 'No preference');

-- Create sample responses for John Doe
INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
VALUES
    (3, 1, 1, 'Weight loss,Better sleep'),
    (3, 1, 2, 'Fair'),
    (3, 1, 3, 'High blood pressure'),
    (3, 1, 4, 'Blood pressure medication'),
    (3, 1, 5, 'Maintaining a healthy weight');

-- Create sample responses for Jane Doe
INSERT INTO user_responses (user_id, questionnaire_id, question_id, response_text)
VALUES
    (4, 2, 6, 'Vegan,Intermittent fasting'),
    (4, 2, 7, 'Gluten sensitivity'),
    (4, 2, 8, 'Three meals with snacks'),
    (4, 2, 9, 'Fresh fruits, salads, plant-based protein'),
    (4, 2, 10, '2-3 liters');