import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, generateToken } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Login API called', {
    method: req.method,
    body: req.body,
    headers: {
      cookie: req.headers.cookie,
      contentType: req.headers['content-type']
    }
  });

  if (req.method !== 'POST') {
    console.log('Login API - Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt for user:', username);
    
    if (!username || !password) {
      console.log('Login API - Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Authenticate user with bcrypt password comparison
    console.log('Authenticating user:', username);
    const user = await authenticateUser(username, password);
    
    if (!user) {
      console.log('Login failed - Invalid credentials for user:', username);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
      });
    }
    
    console.log('User authenticated successfully:', {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    });
    
    // Generate JWT token
    const token = generateToken(user);
    console.log('Generated token (truncated):', token.substring(0, 20) + '...');
    
    // Return success with user data and token
    console.log('Login successful for user:', username);
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal Server Error' 
    });
  }
} 