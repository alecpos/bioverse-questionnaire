#!/bin/bash

# BIOVERSE Questionnaire System Setup Script
echo "🔵 BIOVERSE Questionnaire System - Setup Script"
echo "================================================"

echo -e "\n📦 Checking prerequisites..."
# Check for node
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js v14+ and try again."
  exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm is not installed. Please install npm and try again."
  exit 1
fi

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "❌ PostgreSQL is not installed. Please install PostgreSQL and try again."
  exit 1
fi

echo "✅ Prerequisites found: Node.js and PostgreSQL"

# Database setup
echo -e "\n🗄️ Setting up the database..."
read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -s -p "Enter PostgreSQL password: " DB_PASS
echo ""

read -p "Enter PostgreSQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter database name (default: bioverse_questionnaire): " DB_NAME
DB_NAME=${DB_NAME:-bioverse_questionnaire}

# Create .env file
echo -e "\n📝 Creating environment configuration..."
cat > nextjs-app/.env.local << EOF
# Database connection
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# JWT Secret for authentication
JWT_SECRET=bioverse_secret_key_change_me_in_production

# Application settings
NEXT_PUBLIC_API_URL=/api
NODE_ENV=development
EOF

echo "✅ Environment file created at nextjs-app/.env.local"

# Create the database
echo -e "\n🗄️ Creating the database..."
PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Note: Database might already exist"

# Apply database schema
echo -e "\n🗄️ Applying database schema..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql

# Install dependencies
echo -e "\n📦 Installing dependencies..."
cd nextjs-app
npm install

# Import data
echo -e "\n📊 Importing sample data..."
node scripts/import-csv-data.js

echo -e "\n🎉 Setup complete! You can now start the application with:"
echo "   cd nextjs-app"
echo "   npm run dev"
echo ""
echo "   The application will be available at http://localhost:3000"
echo ""
echo "   Default login credentials:"
echo "   - User: username='user', password='user123'"
echo "   - Admin: username='admin', password='admin123'"
echo ""
echo "🔵 BIOVERSE Questionnaire System is ready to use!" 