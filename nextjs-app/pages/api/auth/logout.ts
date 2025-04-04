import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // In this implementation, we don't need to do anything server-side
  // since the token will be cleared client-side
  // In a production app, you might want to invalidate the token or session
  
  return res.status(200).json({ 
    success: true,
    message: 'Logged out successfully' 
  });
} 