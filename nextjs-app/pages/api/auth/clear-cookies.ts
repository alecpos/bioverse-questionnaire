import { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Set expired cookies to clear them
    res.setHeader('Set-Cookie', [
      cookie.serialize('token', '', {
        maxAge: -1,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      }),
      cookie.serialize('isLoggedIn', '', {
        maxAge: -1,
        path: '/',
      }),
    ]);

    return res.status(200).json({ success: true, message: 'Cookies cleared' });
  } catch (error) {
    console.error('Error clearing cookies:', error);
    return res.status(500).json({ error: 'Failed to clear cookies' });
  }
} 