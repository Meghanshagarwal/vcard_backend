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

    if (!contact.qrCodeUrl) {
      return res.status(404).json({ error: 'QR code not found' });
    }

    // Extract base64 data from data URL
    const base64Data = contact.qrCodeUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr_${contact.name || contactId}.png"`);
    res.send(buffer);

  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}