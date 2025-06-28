const { MongoClient } = require('mongodb');

async function connectToMongo() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('vcards_icul');
}

module.exports = async function handler(req, res) {
  const { contactId } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = await connectToMongo();
    const contact = await db.collection('contacts').findOne({ id: parseInt(contactId) });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}