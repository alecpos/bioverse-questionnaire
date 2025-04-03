import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken, getTokenFromRequest } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('ME API called', {
    method: req.method,
    cookies: req.cookies ? Object.keys(req.cookies) : 'none',
    hasAuthHeader: !!req.headers.authorization
  });
  
  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    // Get token from request (either from cookies or authorization header)
    const token = getTokenFromRequest(req);
    
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    console.log('Token found, verifying:', token.substring(0, 20) + '...');
    
    // Verify the token
    const userData = verifyToken(token);
    
    if (!userData) {
      console.log('Token verification failed');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log('User data from token:', userData);
    
    // Return user data from token
    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        username: userData.username,
        is_admin: userData.is_admin
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
} 