# Bioverse Questionnaire

A Next.js application for collecting and managing user questionnaire responses for Bioverse.

## Overview

This application allows users to fill out questionnaires and administrators to view all user responses. It was built as per the requirements of the Bioverse Intake Questionnaire System exercise.

## Live Demo

[Access the deployed application here](#) - Replace with your Vercel deployment URL

**Demo Credentials:**
- Admin User: `admin` / `admin123`
- Regular User: `user` / `user123` 
- Additional Users: `john` / `password123`, `jane` / `password123`

### Features

- User authentication (simple username/password)
- Dynamic questionnaire rendering from CSV data
- Multiple question types support (text, multiple-choice)
- Pre-filled responses for previously answered questions
- Admin dashboard with completion statistics
- Timezone-aware date display
- CSV exports for questionnaire data

## Tech Stack

- **Frontend**: Next.js, TypeScript, Chakra UI
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (local or Supabase)
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Vercel

## Requirements Implemented

All requirements from the exercise prompt have been implemented:

### User Interface (Front-End)
- ✅ Login Page with role-based redirection
- ✅ Questionnaire Selection Page
- ✅ Dynamic Questionnaire Page with validation
- ✅ Admin Panel with user response viewing

### Data Requirements
- ✅ CSV import for questionnaires, questions, and junction data
- ✅ Proper handling of "Select all that apply" questions
- ✅ Pre-population of previously answered questions
- ✅ Input validation (no empty/whitespace-only answers)

### Admin Features
- ✅ Dashboard with completion statistics
- ✅ User management with response viewing
- ✅ Response organization by questionnaire
- ✅ Mobile-responsive design

## Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database (local or Supabase)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/alecpos/bioverse-questionnaire.git
   cd bioverse-questionnaire
   ```

2. Set up the database:
   
   **Option A: Local PostgreSQL**
   ```bash
   # Create database and set up schema
   psql -c "CREATE DATABASE bioverse_questionnaire;"
   psql -d bioverse_questionnaire -f schema.sql
   ```
   
   **Option B: Supabase**
   See [Supabase Migration Guide](SUPABASE-MIGRATION.md) for detailed instructions.

3. Install dependencies:
   ```bash
   cd nextjs-app
   npm install
   ```

4. Create a `.env.local` file:
   ```
   # For local PostgreSQL
   DATABASE_URL=postgresql://username:password@localhost:5432/bioverse_questionnaire
   
   # For Supabase
   # DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   
   JWT_SECRET=your_secret_key_for_jwt
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Or use the provided setup script:
   ```bash
   bash run_app.sh
   ```

## Deployment

For detailed deployment instructions, refer to:
- [Vercel Deployment Guide](deploy-vercel.md)
- [Vercel + Supabase Deployment Guide](VERCEL-SUPABASE-DEPLOYMENT.md)
- [General Deployment Guide](DEPLOYMENT.md)

### Quick Vercel Deployment with Supabase

1. Set up a Supabase project and get your connection string
2. Push your code to GitHub
3. Connect your Vercel account to GitHub
4. Import the repository in Vercel
5. Set environment variables:
   - `DATABASE_URL` (your Supabase connection string)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)
   - `NODE_ENV=production`
   - `DB_INIT_TOKEN` (for database initialization - optional)
6. Deploy and initialize your database using the `/api/init-db?token=your_token` endpoint

## Project Structure

```
bioverse-questionnaire/
├── data/                     # CSV input files
│   ├── questionnaire_questionnaires.csv
│   ├── questionnaire_questions.csv
│   └── questionnaire_junction.csv
├── nextjs-app/
│   ├── components/           # React components
│   ├── contexts/             # React context providers
│   ├── lib/                  # Utility libraries
│   ├── pages/                # Next.js pages and API routes
│   │   ├── api/              # Backend API endpoints
│   │   ├── admin/            # Admin pages
│   │   └── questionnaire/    # Questionnaire pages
│   └── utils/                # Helper utilities
└── scripts/                  # Setup and utility scripts
```

## Database Schema

The application uses the following core tables:
- `users` - User authentication data
- `questionnaires` - Available questionnaires
- `questions` - Question details including type and text
- `questionnaire_questions` - Junction table linking questions to questionnaires
- `question_options` - Options for multiple-choice questions
- `user_responses` - Stored user answers
- `questionnaire_completions` - Tracks completed questionnaires

## Testing

For detailed testing instructions, see [test-instructions.md](test-instructions.md).

## Contributing

Please see the [contributing guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License.

## Acknowledgments

- The Bioverse Team
- All contributors to this project
