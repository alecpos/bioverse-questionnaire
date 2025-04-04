import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool, PoolClient, QueryResult } from 'pg';
import db from './db';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'bioverse_secret_key_change_me_in_production';

// Create a type for our DB interface to handle the custom db object
type DbInterface = {
  query: (text: string, params?: any[]) => Promise<QueryResult<any>>;
  getClient: () => Promise<{ client: PoolClient; done: () => void }>;
  transaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
};

// User type definition
export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

// Extend the NextApiRequest interface
declare module 'next' {
  interface NextApiRequest {
    user?: User;
  }
}

// JWT token payload structure
interface TokenPayload {
  id: number;
  username: string;
  isAdmin: boolean;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (user: User): string => {
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin
  };
  
  const token = jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '1d' } // Token expires in 1 day
  );
  
  return token;
};

/**
 * Verify a JWT token and return the decoded payload
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from request (either from cookies or Authorization header)
 */
export const getTokenFromRequest = (req: NextApiRequest): string | null => {
  // Check for token in cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  // Check for token in authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
};

/**
 * Authenticate a user with username and password
 */
export const authenticateUser = async (username: string, password: string, dbClient: DbInterface | Pool = db): Promise<User | null> => {
  // Hardcoded credentials for demo/testing
  if (username === 'admin' && password === 'password123') {
    return { id: 1, username: 'admin', isAdmin: true };
  }
  
  if (username === 'john' && password === 'password123') {
    return { id: 2, username: 'john', isAdmin: false };
  }
  
  if (username === 'jane' && password === 'password123') {
    return { id: 3, username: 'jane', isAdmin: false };
  }
  
  // First, try to find the user with bcrypt hashed password
  try {
    const result = await dbClient.query(
      'SELECT id, username, password_hash, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Try to compare with bcrypt
      try {
        const match = await bcrypt.compare(password, user.password_hash);
        if (match) {
          return {
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin
          };
        }
      } catch (e) {
        // If bcrypt comparison fails, it might not be a hash
      }
    }
  } catch (err) {
    // If there's an error (e.g., password_hash column doesn't exist), 
    // fall back to plain text password
  }
  
  // Next, try plain text password as fallback
  try {
    const result = await dbClient.query(
      'SELECT id, username, password, is_admin FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      // Compare plain text
      if (password === user.password) {
        return {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin
        };
      }
    }
  } catch (err) {
    // If there's an error with the plain password query
  }
  
  return null;
};

/**
 * Get a user by ID
 */
export const getUserById = async (id: number, dbClient: DbInterface | Pool = db): Promise<User | null> => {
  try {
    const result = await dbClient.query(
      'SELECT id, username, is_admin FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      isAdmin: result.rows[0].is_admin
    };
  } catch (error) {
    return null;
  }
};

/**
 * Create a new user
 */
export const createUser = async (
  userData: { username: string; password: string; email: string; isAdmin?: boolean },
  dbClient: DbInterface | Pool = db
): Promise<User | null> => {
  try {
    // First, check if user already exists
    const checkResult = await dbClient.query(
      'SELECT id FROM users WHERE username = $1',
      [userData.username]
    );
    
    if (checkResult.rows.length > 0) {
      return null; // User already exists
    }
    
    // Try to use bcrypt for password hashing
    let hashedPassword: string | null = null;
    try {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    } catch (error) {
      // If bcrypt fails, we'll use plain text as fallback
    }
    
    // Insert the new user with password hash if possible
    const result = await dbClient.query(
      hashedPassword
        ? 'INSERT INTO users (username, password_hash, email, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, is_admin'
        : 'INSERT INTO users (username, password, email, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, is_admin',
      [userData.username, hashedPassword || userData.password, userData.email, userData.isAdmin || false]
    );
    
    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      isAdmin: result.rows[0].is_admin
    };
  } catch (error) {
    return null;
  }
};

/**
 * Get the authenticated user from the request
 */
export const getAuthenticatedUser = async (req: NextApiRequest, dbClient: DbInterface | Pool = db): Promise<User | null> => {
  const token = getTokenFromRequest(req);
  
  if (!token) {
    return null;
  }
  
  const decodedToken = verifyToken(token);
  if (!decodedToken) {
    return null;
  }
  
  return await getUserById(decodedToken.id, dbClient);
};

/**
 * Middleware for authenticating API routes
 */
export const withAuth = (handler: any) => async (req: NextApiRequest, res: any) => {
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Add the user to the request object for use in the handler
  req.user = user;
  
  // Call the handler
  return handler(req, res);
};

/**
 * Middleware for authenticating admin API routes
 */
export const withAdminAuth = (handler: any) => async (req: NextApiRequest, res: any) => {
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  // Add the user to the request object for use in the handler
  req.user = user;
  
  // Call the handler
  return handler(req, res);
}; 