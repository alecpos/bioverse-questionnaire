# Bioverse Questionnaire Application

This Next.js application provides a user-friendly interface for questionnaire submission and administration.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Create `.env.local` file based on `.env.example`
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/bioverse_questionnaire
   JWT_SECRET=your_secret_key_for_jwt
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Access the application at http://localhost:3000

## Available Users

| Username | Password    | Role  |
|----------|-------------|-------|
| admin    | admin123    | Admin |
| user     | user123     | User  |
| john     | password123 | User  |
| jane     | password123 | User  |

## Application Structure

- `components/` - Reusable React components
- `contexts/` - React Context providers for state management
- `hooks/` - Custom React hooks
- `lib/` - Utility functions and service modules
- `pages/` - Next.js pages and API routes
- `public/` - Static assets
- `utils/` - Helper utilities

## API Routes

### Authentication
- `POST /api/auth/login` - Authenticates user and returns JWT token
- `GET /api/auth/me` - Returns current user info

### Questionnaires
- `GET /api/questionnaires` - Lists all questionnaires
- `GET /api/questionnaires/:id` - Gets specific questionnaire details
- `POST /api/responses/submit` - Submits questionnaire responses

### Admin
- `GET /api/admin/user-responses` - Gets all user responses (admin only)
- `GET /api/admin/dashboard-stats` - Gets dashboard statistics (admin only)
- `GET /api/admin/user-responses/:userId` - Gets responses for a specific user (admin only)

## Features

1. **Authentication**
   - JWT-based authentication
   - Role-based access control

2. **Questionnaires**
   - Dynamic rendering based on question type
   - Multiple-choice and text input support
   - Pre-population of previously answered questions
   - Validation to prevent empty submissions

3. **Admin Dashboard**
   - Completion statistics
   - User response viewing
   - Time-series data visualization

4. **User Experience**
   - Responsive design for mobile and desktop
   - Clean, intuitive interface
   - Loading states and error handling

## Development

### Database Schema

The application expects these database tables:

- `users` - User authentication data
- `questionnaires` - Available questionnaires
- `questions` - Question details
- `questionnaire_questions` - Junction table for questions to questionnaires
- `question_options` - Options for multiple-choice questions
- `user_responses` - Stored user answers
- `questionnaire_completions` - Records of completed questionnaires

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel Deployment

This application is optimized for Vercel deployment:

1. Connect your GitHub repository to Vercel
2. Set required environment variables
3. Deploy

The `vercel.json` file contains configuration for deployment.

## Troubleshooting

- **Database connection errors**: Ensure PostgreSQL is running and connection string is correct
- **JWT errors**: Check that JWT_SECRET is set and matches between deployments
- **Build failures**: Make sure Node.js v18+ is being used 