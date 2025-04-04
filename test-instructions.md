# Testing Instructions

This document contains instructions to test the Bioverse Questionnaire application to ensure it meets all requirements.

## Prerequisites

1. PostgreSQL database installed and running
2. Node.js (v18 or higher) installed

## Setup

1. Clone the repository
2. Navigate to the project directory
3. Update database connection in `.nextjs-app/.env.local` to match your setup
4. Run the setup script: `bash run_app.sh`

## Test Scenarios

### 1. User Authentication

Test the login functionality with the following credentials:

- **Admin User**: 
  - Username: `admin`
  - Password: `password123`
  
- **Regular User**:
  - Username: `user`
  - Password: `password123`

Verify that:
- Admin users are directed to the admin dashboard
- Regular users are directed to the questionnaire selection page

### 2. Questionnaire Selection Page

Verify that:
- All available questionnaires are displayed
- Clicking on a questionnaire navigates to the appropriate questionnaire page
- Completed questionnaires are marked or have a visual indicator

### 3. Questionnaire Completion

For each questionnaire, verify that:
- All questions display correctly
- Required validation works (no empty answers)
- Multiple choice questions allow selecting multiple options when applicable
- Previous answers are pre-populated if they exist
- Submitting the form saves all answers to the database
- After completion, the user is redirected back to the questionnaire selection page

### 4. Admin Panel

Log in as an admin and verify that:
- The dashboard shows a summary of users and completed questionnaires
- Admin can see a list of users and how many questionnaires each has completed
- Clicking on a user shows their completed questionnaires
- Admin can view all answers from a specific user for a specific questionnaire

## Database Testing

To verify that data is being saved correctly, you can:

1. Log in as a user and complete a questionnaire
2. Log in as an admin and verify the completion appears in the admin panel
3. Check that the answers match what was submitted

## Deployment Instructions

### Deploying to Vercel

1. **Prerequisites**:
   - A Vercel account (https://vercel.com)
   - A PostgreSQL database accessible from the internet (e.g., Supabase, Heroku Postgres, AWS RDS)

2. **Deploy from GitHub**:
   - Fork or push this repository to your GitHub account
   - Connect your Vercel account to GitHub
   - Select the repository in the Vercel dashboard
   - Click "Import"

3. **Configure Environment Variables**:
   - In the Vercel project settings, add the following environment variables:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `JWT_SECRET`: A strong secret key for JWT token generation

4. **Deploy**:
   - Click "Deploy" to start the build process
   - Vercel will automatically build and deploy the application

5. **Database Setup**:
   - After deployment, you need to set up the database schema
   - You can use the migration files in `db/migrations` folder
   - If your database provider supports running SQL files directly, you can upload and run those files
   - Alternatively, you can connect to your database and run the SQL commands manually

6. **Verify Deployment**:
   - Once deployed, open the provided Vercel URL
   - Test the login functionality with the admin and user credentials
   - Verify that all features work as expected in the deployed environment

### Troubleshooting Deployment

- If you encounter database connection issues, verify that your database is accessible from Vercel's servers
- Check that all environment variables are correctly set in Vercel
- Review Vercel build logs for any errors during the build process

## Common Issues

- If the database connection fails, check the `.env.local` file and ensure your PostgreSQL server is running
- If pre-populated answers don't appear, verify that the user has previously completed the questionnaire
- If the UI looks broken, ensure all required dependencies are installed 