# Bioverse Questionnaire System

A platform for creating, managing, and analyzing questionnaires.

## Features

- User authentication and authorization
- Questionnaire creation and management
- Questionnaire form filling with progress tracking
- Admin dashboard with analytics
- CSV data import and export

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your database connection in `.env.local`:
   ```
   DATABASE_URL=postgres://user:password@localhost:5432/bioverse_questionnaire
   JWT_SECRET=your_jwt_secret
   ```
4. Run database migrations (if needed)
5. Start the development server:
   ```bash
   npm run dev
   ```

## CSV Import Format

You can import questionnaires using the admin dashboard or via command line.

### CSV File Structure

Three CSV files are needed:

1. **questionnaires.csv** - List of questionnaires
   ```
   id,name,description
   1,Medical History,"Medical history questionnaire to gather patient information."
   ```

2. **questions.csv** - All questions
   ```
   id,text,type,options
   101,"What is your age?",text_input,
   102,"Do you have allergies?",multiple_choice,"[""Yes"",""No""]"
   ```
   - Valid types: `text_input`, `multiple_choice`
   - Options should be a JSON array string

3. **junctions.csv** - Links questionnaires to questions with priority
   ```
   questionnaire_id,question_id,priority
   1,101,1
   1,102,2
   ```
   - Priority determines question order (lower numbers shown first)

### Importing via Admin Dashboard

1. Log in as admin
2. Go to the Admin Dashboard
3. Click "Import Questionnaires from CSV"
4. Upload all three CSV files
5. Click Import

### Importing via Command Line

```bash
# Using Node.js directly (recommended)
node scripts/import-questionnaires.js path/to/questionnaires.csv path/to/questions.csv path/to/junctions.csv

# Using TypeScript (if ts-node is properly configured)
npx ts-node scripts/import-questionnaires.ts path/to/questionnaires.csv path/to/questions.csv path/to/junctions.csv
```

## License

[MIT License](LICENSE) 