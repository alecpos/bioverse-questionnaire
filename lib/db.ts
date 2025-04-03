import { Pool } from 'pg';

// Use environment variables for sensitive information in production
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bioverse_questionnaire';

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  getClient: async () => {
    const client = await pool.connect();
    return {
      client,
      done: () => {
        client.release();
      },
    };
  },
}; 