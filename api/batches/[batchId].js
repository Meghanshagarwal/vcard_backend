const { MongoClient } = require('mongodb');

async function connectToMongo() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('vcards_icul');
}

module.exports = async function handler(req, res) {
  const { batchId } = req.query;

  if (req.method === 'GET') {
    try {
      const db = await connectToMongo();
      const batch = await db.collection('batches').findOne({ batchId });

      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      res.json(batch);
    } catch (error) {
      console.error('Get batch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}