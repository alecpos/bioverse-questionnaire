import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, User } from './auth';

// Add user property to NextApiRequest
export interface AuthenticatedRequest extends NextApiRequest {
  user?: User;
}

type NextApiHandler = (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>;

/**
 * Authentication middleware for API routes
 * Verifies the JWT token from Authorization header or cookies
 * Adds the user info to the request object
 */
export function withAuth(handler: NextApiHandler, adminOnly: boolean = false): NextApiHandler {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      console.log('Auth middleware checking for token...');
      
      let token: string | undefined;
      
      // Try to get token from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('Found token in Authorization header');
      }
      
      // If no token in header, try to get from cookies
      if (!token && req.cookies) {
        token = req.cookies.token;
        if (token) {
          console.log('Found token in cookies');
        }
      }
      
      // If still no token, return unauthorized
      if (!token) {
        console.log('No token found in request');
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Verify token
      const user = verifyToken(token);
      
      if (!user) {
        console.log('Token verification failed');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      console.log(`Token verified for user: ${user.username} (admin: ${user.is_admin})`);
      
      // Check admin access if required
      if (adminOnly && !user.is_admin) {
        console.log('Admin access required but user is not an admin');
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Add user info to request
      req.user = user;
      
      // Call the original handler
      return handler(req, res);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };
} 