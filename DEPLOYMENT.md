# Deployment Guide for BIOVERSE Questionnaire System

This guide provides instructions for deploying the BIOVERSE Questionnaire System to different hosting environments.

## Prerequisites

Before deploying, ensure you have:

1. A PostgreSQL database accessible from your hosting environment
2. Node.js v14+ installed on your system
3. Access to your chosen hosting platform

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the simplest deployment option for Next.js applications:

1. **Create a Vercel account** at [vercel.com](https://vercel.com) if you don't have one
2. **Install the Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
3. **Login to Vercel**:
   ```bash
   vercel login
   ```
4. **Configure your database**:
   - Create a PostgreSQL database on a provider like AWS RDS, Digital Ocean, or Heroku Postgres
   - Note the connection string
5. **Deploy from the project root**:
   ```bash
   cd nextjs-app
   vercel
   ```
6. **Set environment variables**:
   - In the Vercel dashboard, go to your project
   - Under Settings > Environment Variables, add:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `JWT_SECRET`: A secure random string for JWT token generation
7. **Run database setup**:
   - You'll need to connect to your database and run the schema.sql file
   - You can use any PostgreSQL client to do this
   - Example: `psql -h your-db-host -U your-username -d your-database -f schema.sql`
8. **Import data**:
   - You can run the import script locally, pointing to your deployed database:
   ```bash
   DATABASE_URL=your-connection-string node scripts/import-csv-data.js
   ```

### Option 2: Heroku

1. **Create a Heroku account** at [heroku.com](https://heroku.com)
2. **Install the Heroku CLI**:
   ```bash
   npm install -g heroku
   ```
3. **Login to Heroku**:
   ```bash
   heroku login
   ```
4. **Create a new Heroku app**:
   ```bash
   heroku create bioverse-questionnaire
   ```
5. **Add PostgreSQL**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```
6. **Set config variables**:
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set NODE_ENV=production
   ```
7. **Deploy the application**:
   ```bash
   git push heroku main
   ```
8. **Run database setup**:
   ```bash
   heroku pg:psql < schema.sql
   ```
9. **Import data**:
   ```bash
   heroku run node scripts/import-csv-data.js
   ```

### Option 3: Traditional VPS (AWS, DigitalOcean, etc.)

1. **Provision a server** with:
   - Ubuntu 20.04 LTS or similar
   - Node.js v14+
   - PostgreSQL database
2. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/bioverse-questionnaire.git
   cd bioverse-questionnaire
   ```
3. **Set up the database**:
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE bioverse_questionnaire;"
   sudo -u postgres psql -d bioverse_questionnaire -f schema.sql
   ```
4. **Configure the application**:
   ```bash
   cd nextjs-app
   cp .env.local.example .env.local
   # Edit .env.local with your database details
   ```
5. **Install dependencies**:
   ```bash
   npm install
   ```
6. **Build the application**:
   ```bash
   npm run build
   ```
7. **Import data**:
   ```bash
   node scripts/import-csv-data.js
   ```
8. **Start the application**:
   ```bash
   # For testing
   npm start
   
   # For production (using PM2)
   npm install -g pm2
   pm2 start npm --name "bioverse-questionnaire" -- start
   pm2 startup
   pm2 save
   ```
9. **Set up a reverse proxy** (Nginx recommended):
   ```bash
   sudo apt install nginx
   ```
   Configure Nginx to proxy requests to your Node.js application (port 3000 by default).

## Post-Deployment Steps

1. **Test the application** by navigating to the deployed URL
2. **Log in** with the default credentials:
   - User: username=`user`, password=`user123`
   - Admin: username=`admin`, password=`admin123`
3. **Change default passwords** for production use

## Troubleshooting

- **Database connection issues**: Ensure your database is accessible from your hosting environment and that the connection string is correct
- **Environment variables**: Check that all required environment variables are set correctly
- **Build errors**: Make sure you're using a compatible Node.js version (v14+)
- **Runtime errors**: Check the logs of your hosting platform for specific error messages 