-- Database Schema for BIOVERSE Questionnaire System

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In a real app, store hashed passwords
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questionnaires Table
CREATE TABLE questionnaires (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions Table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'text', 'multiple_choice', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question Options (for multiple choice questions)
CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction Table (linking questions to questionnaires)
CREATE TABLE questionnaire_questions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL, -- Order of questions within questionnaire
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, questionnaire_id) -- Each question can only appear once in a questionnaire
);

-- User Responses Table
CREATE TABLE user_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    response_text TEXT, -- For text inputs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id, questionnaire_id) -- One response per user per question per questionnaire
);

-- User Multiple Choice Responses (for "select all that apply")
CREATE TABLE user_multiple_choice_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES question_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id, option_id, questionnaire_id) -- Each option can only be selected once
);

-- Questionnaire Completions Table
CREATE TABLE questionnaire_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, questionnaire_id) -- Each user can complete each questionnaire only once
);

-- Insert default admin user
INSERT INTO users (username, password, is_admin) 
VALUES ('admin', 'admin123', TRUE);

-- Insert default regular user
INSERT INTO users (username, password, is_admin)
VALUES ('user', 'user123', FALSE); 