# Deploying to Vercel with Supabase

This guide provides step-by-step instructions for deploying the Bioverse Questionnaire application to Vercel with a Supabase PostgreSQL database.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. A [Supabase](https://supabase.com) account
3. A [GitHub](https://github.com) account (for deployment)

## Step 1: Set Up Your Supabase Database

1. Log in to your Supabase account and create a new project
2. After the project is created, go to **Settings** > **Database** to find your database connection information:
   - Host: `aws-0-us-east-1.pooler.supabase.com` (or similar)
   - Port: `6543` (pooled connections)
   - Database name: `postgres`
   - User: `postgres.[project-ref]`
   - Password: (your database password)
   
3. Construct your database connection string in this format:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

## Step 2: Initialize the Database

There are two options for database initialization:

### Option A: Using the API endpoint (after deployment)

1. Deploy your application first
2. Set the `DB_INIT_TOKEN` environment variable in Vercel (a secure random string)
3. Access the initialization endpoint:
   ```
   https://[your-vercel-domain]/api/init-db?token=[your-DB_INIT_TOKEN]
   ```

### Option B: Direct SQL execution (before deployment)

1. Go to the **SQL Editor** in your Supabase dashboard
2. Execute the following SQL to create tables:

```sql
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questionnaires table
CREATE TABLE questionnaires (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'multiple_choice')),
    options JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create question options table (for multiple choice questions)
CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL
);

-- Create junction table for questionnaires and questions
CREATE TABLE questionnaire_questions (
    id SERIAL PRIMARY KEY,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(questionnaire_id, question_id)
);

-- Create user responses table
CREATE TABLE user_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for multiple choice responses
CREATE TABLE user_multiple_choice_responses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES question_options(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, question_id, option_id, questionnaire_id)
);

-- Create questionnaire completions table
CREATE TABLE questionnaire_completions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    timezone_name VARCHAR(50),
    timezone_offset VARCHAR(10),
    UNIQUE(user_id, questionnaire_id)
);

-- Create initial admin user
INSERT INTO users (username, password, email, is_admin)
VALUES ('admin', 'admin123', 'admin@example.com', TRUE);
```

## Step 3: Deploy to Vercel

1. Push your code to a GitHub repository
2. Connect your Vercel account to GitHub
3. Import your repository in Vercel
4. Configure the following environment variables in Vercel:
   - `DATABASE_URL`: Your Supabase connection string 
   - `JWT_SECRET`: A secure random string for JWT authentication
   - `NODE_ENV`: Set to `production`
   - `DB_INIT_TOKEN`: A secure random string (only if using the API endpoint for initialization)

5. Deploy your application

## Step 4: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the application by:
   - Logging in with the admin account (username: `admin`, password: `admin123`)
   - Creating questionnaires
   - Testing user registration
   - Completing questionnaires as a user

## Troubleshooting

### Database Connection Issues
- Check that your connection string is formatted correctly
- Ensure SSL is enabled in the database configuration
- Verify your IP is not blocked by Supabase network restrictions

### Deployment Issues
- Review Vercel build logs for errors
- Check environment variables are set correctly
- For database initialization errors, try manually creating the tables in Supabase

## Maintenance

### Database Backups
- Supabase automatically creates backups of your database
- You can also export data manually from the Supabase dashboard

### Updating Your Application
- Push changes to your GitHub repository
- Vercel will automatically deploy the updates

### Monitoring
- Use Vercel Analytics to monitor your application performance
- Check Supabase dashboard for database performance metrics 