import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import db from './db';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret';

console.log('Using JWT_SECRET:', JWT_SECRET ? 'Secret is set' : 'Warning - no secret set');

// Define user interface
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin: boolean;
}

// Define auth token interface
export interface AuthToken {
  id: number;
  username: string;
  is_admin: boolean;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for a user
 * @param user User object to generate token for
 * @returns JWT token string
 */
export const generateToken = (user: User): string => {
  console.log('Generating token for user:', { 
    id: user.id, 
    username: user.username, 
    is_admin: user.is_admin 
  });
  
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '1d' } // Token expires in 1 day
  );
  
  console.log('Token generated:', token.substring(0, 20) + '...');
  return token;
};

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Decoded token data or null if invalid
 */
export const verifyToken = (token: string): AuthToken | null => {
  try {
    console.log('Verifying token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    console.log('Token verified successfully:', decoded);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

/**
 * Get token from request cookie or authorization header
 * @param req Next.js API request
 * @returns Token string or null if not found
 */
export const getTokenFromRequest = (req: NextApiRequest): string | null => {
  // Check for token in cookies
  if (req.cookies?.token) {
    console.log('Token found in cookies');
    return req.cookies.token;
  }

  // Check for token in authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Token found in authorization header');
    return authHeader.substring(7);
  }

  console.log('No token found in request');
  return null;
};

/**
 * Authenticate a user with username and password
 * @param username Username to authenticate
 * @param password Plain text password to verify
 * @returns User object if authenticated, null otherwise
 */
export const authenticateUser = async (
  username: string,
  password: string
): Promise<User | null> => {
  try {
    console.log('Authenticating user:', username);
    
    // Find user by username
    const result = await db.query(
      'SELECT id, username, password_hash, email, first_name, last_name, is_admin FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('User not found:', username);
      return null;
    }

    const user = result.rows[0];
    console.log('User found:', { id: user.id, username: user.username });

    // Verify password
    console.log('Comparing password with hash...');
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      console.log('Password validation failed');
      return null;
    }

    console.log('Password validated successfully');
    
    // Return user without password hash
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_admin: user.is_admin,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
};

/**
 * Get user from database by ID
 * @param id User ID to look up
 * @returns User object or null if not found
 */
export const getUserById = async (id: number): Promise<User | null> => {
  try {
    console.log('Looking up user by ID:', id);
    
    const result = await db.query(
      'SELECT id, username, email, first_name, last_name, is_admin FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      console.log('User not found with ID:', id);
      return null;
    }

    console.log('User found by ID:', { id: result.rows[0].id, username: result.rows[0].username });
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

/**
 * Create a new user
 * @param userData User data to insert
 * @returns Created user or null if failed
 */
export const createUser = async (userData: {
  username: string;
  password: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
}): Promise<User | null> => {
  try {
    console.log('Creating new user:', userData.username);
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);

    // Insert user
    const result = await db.query(
      `INSERT INTO users (username, password_hash, email, first_name, last_name, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, first_name, last_name, is_admin`,
      [
        userData.username,
        passwordHash,
        userData.email || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.is_admin || false,
      ]
    );

    console.log('User created successfully:', { id: result.rows[0].id, username: result.rows[0].username });
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

/**
 * Get authenticated user from request
 * @param req Next.js API request
 * @returns User object or null if not authenticated
 */
export const getAuthenticatedUser = async (
  req: NextApiRequest
): Promise<User | null> => {
  console.log('Getting authenticated user from request');
  
  const token = getTokenFromRequest(req);
  if (!token) {
    console.log('No token found in request');
    return null;
  }

  const decodedToken = verifyToken(token);
  if (!decodedToken) {
    console.log('Token verification failed');
    return null;
  }

  console.log('Token verified, getting user with ID:', decodedToken.id);
  return await getUserById(decodedToken.id);
};

export default {
  generateToken,
  verifyToken,
  authenticateUser,
  getUserById,
  createUser,
  getAuthenticatedUser,
}; 