# Migrating to Supabase

This document explains how to migrate the Bioverse Questionnaire database from a local PostgreSQL instance to Supabase.

## Prerequisites

- A [Supabase](https://supabase.com) account
- The Bioverse Questionnaire codebase
- Access to your existing data (if migrating production data)

## Step 1: Set Up Supabase Project

1. Log in to your Supabase account at https://app.supabase.com
2. Click "New Project" and fill in the required information
3. Wait for your database to be provisioned (takes 1-2 minutes)

## Step 2: Update Environment Variables

1. Obtain your database connection string from Supabase:
   - Navigate to Project Settings > Database
   - Copy the Connection String (URI format)
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

2. Update your `.env.local` file:
   ```
   # Database connection
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

   # Other variables remain the same
   JWT_SECRET=your_secure_token
   DB_INIT_TOKEN=your_secure_token
   NEXT_PUBLIC_API_URL=/api
   NODE_ENV=development
   ```

## Step 3: Initialize Database Schema

### Option 1: Using the API Endpoint

1. Start your Next.js application:
   ```
   cd nextjs-app
   npm run dev
   ```

2. Access the initialization endpoint in your browser:
   ```
   http://localhost:3000/api/init-db?token=your_DB_INIT_TOKEN
   ```

### Option 2: Using Direct SQL

1. Go to the SQL Editor in your Supabase dashboard
2. Run the SQL from the `schema.sql` file at the project root

## Step 4: Verify Database Connection

Run the verification script to ensure your database is configured correctly:

```
cd nextjs-app
npm run verify-db
```

The script will:
- Test the connection to Supabase
- Check for required tables
- Verify that an admin user exists

## Step 5: Data Migration (if needed)

### For a New Installation

If this is a fresh installation, use the CSV import functionality:

```
cd nextjs-app
DATABASE_URL="your_supabase_connection_string" node scripts/import-csv-data.js
```

### For Existing Data Migration

If you need to migrate existing data from a local PostgreSQL database:

1. Export data from your local database:
   ```
   pg_dump -U your_user -d bioverse_questionnaire -a -f data_export.sql
   ```

2. Clean up the SQL file if needed (remove any commands not compatible with Supabase)

3. Import into Supabase using the SQL Editor in the Supabase dashboard

## Troubleshooting

### Connection Issues

- Ensure SSL is enabled in your database configuration
- Check that your connection string is formatted correctly
- Verify network access is permitted from your location

### Import Errors

- If you see foreign key constraint errors, you may need to temporarily disable constraints:
  ```sql
  -- Disable foreign key checks
  SET session_replication_role = replica;

  -- Run your import statements
  -- ...

  -- Re-enable foreign key checks
  SET session_replication_role = DEFAULT;
  ```

## Running the Application with Supabase

Once migration is complete, your application should work identically but with data stored in Supabase:

```
cd nextjs-app
npm run dev
```

## Next Steps

For production deployment with Supabase and Vercel, see the [Vercel-Supabase Deployment Guide](VERCEL-SUPABASE-DEPLOYMENT.md). 