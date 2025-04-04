#!/bin/bash

# This script runs the Bioverse Questionnaire application
# To use: bash run_app.sh

echo "Starting Bioverse Questionnaire application..."

# Navigate to the Next.js app directory
cd nextjs-app

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Check if .env.local exists, if not create it with minimal required settings
if [ ! -f ".env.local" ]; then
  echo "Creating .env.local file with default settings..."
  cat > .env.local << EOL
DATABASE_URL=postgresql://localhost:5432/bioverse_questionnaire
JWT_SECRET=bioverse_secret_key_for_jwt_tokens
NEXTAUTH_URL=http://localhost:3000
EOL
  echo "Please update .env.local with your database credentials if needed"
fi

# Ask about database initialization
read -p "Do you want to initialize the database with sample data? (y/n): " init_db

if [[ $init_db == "y" || $init_db == "Y" ]]; then
  echo "Initializing database with sample data..."
  
  # Create scripts directory if it doesn't exist
  mkdir -p scripts
  
  # Check if the initialization script exists
  if [ ! -f "scripts/init-database.js" ]; then
    echo "Database initialization script not found."
    echo "Please ensure scripts/init-database.js exists."
  else
    # Run the database initialization script
    node scripts/init-database.js
  fi
fi

# Run the development server
echo "Starting Next.js development server..."
npm run dev

# Note: Press Ctrl+C to stop the server 