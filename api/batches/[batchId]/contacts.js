const { MongoClient } = require('mongodb');

async function connectToMongo() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('vcards_icul');
}

module.exports = async function handler(req, res) {
  const { batchId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToMongo();
    const contacts = await db.collection('contacts').find({ batchId }).toArray();

    res.json(contacts);
  } catch (error) {
    console.error('Get batch contacts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}