import { storage } from '../../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { batchId } = req.query;

  try {
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Get contacts for this batch
    const contacts = await storage.getContactsByBatch(batchId);

    res.json({
      batch: {
        ...batch,
        contacts
      }
    });

  } catch (error) {
    console.error('Batch retrieval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}