import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import db from '../../../lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'bioverse_secret_key_change_me_in_production';
console.log('Refresh API using JWT_SECRET (first few chars):', JWT_SECRET?.substring(0, 5) + '...');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the current token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      // Verify the existing token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      
      // Get user information
      const userResult = await db.query(
        'SELECT id, username, is_admin FROM users WHERE id = $1',
        [decoded.id]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      
      // Generate a new token
      const newToken = jwt.sign(
        { id: user.id, username: user.username, isAdmin: user.is_admin },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      return res.status(200).json({ token: newToken, user });
    } catch (err) {
      // Token verification failed
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 