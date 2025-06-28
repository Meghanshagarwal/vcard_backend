import { storage } from '../../../lib/storage.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { batchId } = req.query;
  const { mapping } = req.body;

  if (!mapping || typeof mapping !== 'object') {
    return res.status(400).json({ error: 'Invalid mapping data' });
  }

  try {
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await storage.updateBatch(batchId, {
      fieldMapping: mapping,
      status: 'mapped'
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Mapping error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}