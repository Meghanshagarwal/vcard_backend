import { storage } from '../../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contactId } = req.query;

  try {
    const contact = await storage.getContactById(parseInt(contactId));
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);

  } catch (error) {
    console.error('Contact retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}