import { Pool, PoolClient } from 'pg';

// Use environment variables for sensitive information
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bioverse_questionnaire';

// Create a new Pool instance for database connections
const pool = new Pool({
  connectionString,
  // Enable SSL in production (like on Heroku)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Log connection events for debugging
pool.on('connect', () => {
  console.log('Database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database interface for making queries
const db = {
  /**
   * Execute a SQL query with optional parameters
   * @param text - SQL query text
   * @param params - Query parameters
   * @returns Promise with query result
   */
  query: async (text: string, params?: any[]) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (err) {
      console.error('Error executing query', { text, error: err });
      throw err;
    }
  },

  /**
   * Get a dedicated database client from the pool
   * Used for transactions that require multiple queries
   * @returns Client object with release function
   */
  getClient: async () => {
    const client = await pool.connect();
    const originalRelease = client.release;
    
    // Override release method to keep track of releases
    client.release = () => {
      console.log('Client returned to pool');
      originalRelease.call(client);
    };
    
    return {
      client,
      done: () => client.release(),
    };
  },

  /**
   * Execute a transaction with multiple queries
   * @param callback - Function to execute within transaction
   * @returns Result of the callback function
   */
  transaction: async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

export default db; 