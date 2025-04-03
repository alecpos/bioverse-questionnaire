# BIOVERSE Intake Questionnaire System

A web application that allows users to answer questionnaires and administrators to view all the answers provided by users. This system meets the requirements of the coding exercise, providing a complete solution for user intake questionnaires with a clean UI aligned with the BIOVERSE brand.

## Features

- **User Authentication:** Simple username/password login system
- **Questionnaire Selection:** Users can select from available questionnaires
- **Dynamic Questionnaire Forms:** Handles multiple-choice and text input questions
- **Answer Pre-population:** Automatically fills in answers from previous questionnaires
- **Answer Validation:** Ensures all questions are answered before submission
- **Admin Dashboard:** Administrators can view all user responses and statistics
- **BIOVERSE Branding:** Consistent styling with BIOVERSE brand colors and logo

## Demo Credentials

### User Login
- Username: `user`
- Password: `user123`

### Admin Login
- Username: `admin`
- Password: `admin123`

## Tech Stack

- **Frontend:** React with Next.js
- **UI Library:** Chakra UI
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **Charting:** Chart.js with React-Chartjs-2
- **Date Handling:** date-fns

## Project Structure

```
bioverse-questionnaire/
├── data/                   # CSV data files for import
│   ├── questionnaire_junction.csv
│   ├── questionnaire_questionnaires.csv
│   └── questionnaire_questions.csv
├── db/                     # Database migrations
│   └── migrations/
│       ├── 01_init.sql
│       └── 002_add_timezone_columns.sql
├── lib/                    # Shared libraries
│   └── db.ts              # Database connection
├── nextjs-app/             # Main application
│   ├── components/        # React components
│   ├── contexts/          # Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   ├── pages/             # Next.js pages and API routes
│   ├── public/            # Static assets
│   ├── scripts/           # Setup scripts
│   └── utils/             # Utility functions
├── schema.sql              # Database schema
├── data_import.js          # Data import script
└── docker-compose.yml      # Docker configuration
```

## Setup Instructions

### Prerequisites

- Node.js (v14+ recommended)
- PostgreSQL

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/alecpos/bioverse-questionnaire.git
cd bioverse-questionnaire
```

2. Set up the database:
```bash
# Create the database
createdb bioverse_questionnaire

# Apply the schema
psql -d bioverse_questionnaire -f schema.sql

# Or use the migrations
psql -d bioverse_questionnaire -f db/migrations/01_init.sql
psql -d bioverse_questionnaire -f db/migrations/002_add_timezone_columns.sql
```

3. Install dependencies:
```bash
cd nextjs-app
npm install
```

4. Configure the database connection:
Create or modify `.env.local` file in the nextjs-app directory:
```
DATABASE_URL=postgresql://yourusername:yourpassword@localhost:5432/bioverse_questionnaire
```

5. Import the CSV data:
```bash
node scripts/import-csv.js
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Using Docker (Alternative)

If you prefer Docker:

1. Update the database configuration in `docker-compose.yml`
2. Start the containers:
```bash
docker-compose up -d
```

## Deployment

To deploy the application:

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

For cloud deployment, this application is ready for platforms like Vercel or Netlify. Make sure to configure your environment variables for database connection.

## Project Requirements Met

- ✅ Login page with username/password
- ✅ Questionnaire selection page
- ✅ Dynamic questionnaire rendering
- ✅ Pre-population of previously answered questions
- ✅ Support for "Select all that apply" questions
- ✅ Admin panel with user completion statistics
- ✅ Detailed view of user responses
- ✅ Professional UI with BIOVERSE branding

## License

This project is MIT licensed. 
