import { NextApiRequest, NextApiResponse } from 'next';
import db from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all questionnaires
      const { rows } = await db.query(`
        SELECT * FROM questionnaires
        ORDER BY id ASC
      `);
      
      return res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching questionnaires:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method Not Allowed' });
} 