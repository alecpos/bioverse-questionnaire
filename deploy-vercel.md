# Deploying to Vercel

This guide provides step-by-step instructions for deploying the Bioverse Questionnaire application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A PostgreSQL database accessible from the internet
   - Options include [Supabase](https://supabase.com), [Heroku Postgres](https://www.heroku.com/postgres), [AWS RDS](https://aws.amazon.com/rds/), or [Neon](https://neon.tech)
3. Your project pushed to a GitHub repository

## Step 1: Prepare Your Database

1. Create a PostgreSQL database with your preferred provider
2. Note the connection string, which will be in this format:
   ```
   postgresql://username:password@hostname:port/database_name
   ```
3. Initialize your database schema:
   - Option 1: Manually run the SQL schema from the initialization script
   - Option 2: Use your database provider's interface to execute the SQL commands
   - Option 3: Set up a database migration as part of your deployment process

## Step 2: Deploy to Vercel

### From GitHub

1. Go to [Vercel](https://vercel.com) and log in
2. Click "Add New" > "Project"
3. Connect your GitHub account if you haven't already
4. Select your bioverse-questionnaire repository
5. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: `nextjs-app` (important!)
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Environment Variables

Add the following environment variables to your Vercel project:

1. Click on "Environment Variables" section
2. Add the following variables:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A strong random string for JWT token generation
   - `DB_INIT_TOKEN`: A secure token to protect the database initialization API
   - `NODE_ENV`: Set to `production`

### Deploy

1. Click "Deploy"
2. Wait for the deployment to complete
3. When finished, Vercel will provide you with a URL to access your application

## Step 3: Initialize Database on Vercel

After deployment, you need to initialize your database. The application includes a built-in API route for this purpose:

### Using the Database Initialization API

1. Once deployed, visit the following URL in your browser:
   ```
   https://your-vercel-deployment-url.vercel.app/api/init-db?token=your_db_init_token
   ```
   Replace `your-vercel-deployment-url` with your actual Vercel deployment URL and `your_db_init_token` with the value you set for the `DB_INIT_TOKEN` environment variable.

2. If successful, you'll see a JSON response confirming that the database has been initialized.

3. **Important Security Note**: After initializing the database, consider either:
   - Removing the `DB_INIT_TOKEN` environment variable from Vercel
   - Deleting the `pages/api/init-db.ts` file from your repository and redeploying

### Alternative Manual Approach

If you prefer not to use the API route, you can initialize your database manually:

1. Connect to your database using a PostgreSQL client or the provider's web interface
2. Execute the SQL commands from `nextjs-app/scripts/init-database.js` to create tables and insert sample data

## Step 4: Verify Deployment

1. Visit your deployed application URL
2. Try logging in with the provided credentials:
   - Admin: username `admin`, password `password123`
   - User: username `user`, password `password123`
3. Verify all functionality works:
   - Questionnaire selection and completion
   - Admin dashboard and user response viewing

## Troubleshooting

### Database Connection Issues

- Ensure your database is accessible from the internet
- Check that the connection string is correctly formatted
- Verify your database provider allows connections from Vercel's IP ranges

### Environment Variables

- Double-check that all environment variables are correctly set in Vercel
- If you update environment variables, redeploy your application

### Deployment Failures

- Review the Vercel build logs for specific error messages
- Ensure the root directory is set correctly to `nextjs-app`
- Verify that all dependencies are listed in `package.json`

### Database Initialization

- If you receive a 401 Unauthorized error when accessing the init-db API, check that the token query parameter matches the DB_INIT_TOKEN environment variable
- If you see database errors, check that your database connection string is correct and that the database server is accessible

## Continuous Deployment

Vercel automatically rebuilds and redeploys your application when you push changes to your connected GitHub repository. This ensures your deployed application stays in sync with your codebase. 