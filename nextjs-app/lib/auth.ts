import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import db from './db';

// JWT Secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'bioverse_secret_key_change_me_in_production';

console.log('Using JWT_SECRET:', JWT_SECRET ? 'Secret is set' : 'Warning - no secret set');
console.log('JWT_SECRET value (first few chars):', JWT_SECRET?.substring(0, 5) + '...');

// Define user interface (matches database schema)
export interface User {
  id: number;
  username: string;
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
    
    // Hard-coded authentication for known users
    // This is temporary and will be replaced with proper DB auth
    if (username === 'admin' && password === 'admin123') {
      console.log('Admin authenticated with hardcoded credentials');
      return {
        id: 1,
        username: 'admin',
        is_admin: true
      };
    }
    
    if (username === 'user' && password === 'user123') {
      console.log('User authenticated with hardcoded credentials');
      return {
        id: 2,
        username: 'user',
        is_admin: false
      };
    }
    
    if ((username === 'john' || username === 'jane') && password === 'password123') {
      console.log(username + ' authenticated with hardcoded credentials');
      const userId = username === 'john' ? 3 : 4;
      return {
        id: userId,
        username: username,
        is_admin: false
      };
    }
    
    // If not using hard-coded credentials, try database authentication
    
    // First try with password_hash (for bcrypt hashes)
    try {
      const hashResult = await db.query(
        'SELECT id, username, password_hash, is_admin FROM users WHERE username = $1',
        [username]
      );

      if (hashResult.rows.length > 0) {
        const user = hashResult.rows[0];
        console.log('User found:', { id: user.id, username: user.username });

        // Try bcrypt verification
        if (user.password_hash) {
          console.log('Comparing password with bcrypt...');
          try {
            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (passwordValid) {
              console.log('Password validated successfully with bcrypt');
              return {
                id: user.id,
                username: user.username,
                is_admin: user.is_admin,
              };
            }
          } catch (e) {
            console.log('Bcrypt comparison failed, might not be a hash:', e);
          }
        }
      }
    } catch (err) {
      console.log('Error querying password_hash, trying plain password field:', err);
    }

    // Try with plain text password field
    try {
      const plainResult = await db.query(
        'SELECT id, username, password, is_admin FROM users WHERE username = $1',
        [username]
      );

      if (plainResult.rows.length > 0) {
        const user = plainResult.rows[0];
        console.log('User found:', { id: user.id, username: user.username });

        // Verify password with plain text comparison
        console.log('Comparing plain text password...');
        const passwordValid = (password === user.password);

        if (passwordValid) {
          console.log('Password validated successfully with plain text comparison');
          return {
            id: user.id,
            username: user.username,
            is_admin: user.is_admin,
          };
        }
      }
    } catch (err) {
      console.log('Error querying plain password:', err);
    }

    console.log('Authentication failed for user:', username);
    return null;
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
      'SELECT id, username, is_admin FROM users WHERE id = $1',
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
  is_admin?: boolean;
}): Promise<User | null> => {
  try {
    console.log('Creating new user:', userData.username);
    
    // Check if the table has password_hash column
    const columnCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        AND column_name = 'password_hash'
      )
    `);
    
    const hasPasswordHashColumn = columnCheck.rows[0].exists;
    
    let result;
    
    if (hasPasswordHashColumn) {
      // For new users with password_hash column, use bcrypt
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(userData.password, salt);

      result = await db.query(
        `INSERT INTO users (username, password_hash, is_admin)
         VALUES ($1, $2, $3)
         RETURNING id, username, is_admin`,
        [
          userData.username,
          passwordHash,
          userData.is_admin || false,
        ]
      );
    } else {
      // For legacy database with password column, use plain text
      result = await db.query(
        `INSERT INTO users (username, password, is_admin)
         VALUES ($1, $2, $3)
         RETURNING id, username, is_admin`,
        [
          userData.username,
          userData.password, // Plain text password
          userData.is_admin || false,
        ]
      );
    }

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