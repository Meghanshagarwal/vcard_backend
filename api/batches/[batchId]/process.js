const { MongoClient } = require('mongodb');
const QRCode = require('qrcode');
const { nanoid } = require('nanoid');

async function connectToMongo() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client.db('vcards_icul');
}

function generateVCard(contact) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  
  if (contact.name) {
    lines.push(`FN:${contact.name}`);
    lines.push(`N:${contact.name};;;;`);
  }
  
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL:${contact.phone.startsWith('0') ? contact.phone : '0' + contact.phone}`);
  }
  
  if (contact.phone2) {
    lines.push(`TEL;TYPE=HOME:${contact.phone2.startsWith('0') ? contact.phone2 : '0' + contact.phone2}`);
  }
  
  if (contact.email) {
    lines.push(`EMAIL:${contact.email}`);
  }
  
  if (contact.company) {
    lines.push(`ORG:${contact.company}`);
  }
  
  if (contact.position) {
    lines.push(`TITLE:${contact.position}`);
  }
  
  if (contact.website) {
    lines.push(`URL:${contact.website}`);
  }
  
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

module.exports = async function handler(req, res) {
  const { batchId } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fieldMapping } = req.body;

    if (!fieldMapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    const db = await connectToMongo();
    const batch = await db.collection('batches').findOne({ batchId });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const rawData = JSON.parse(batch.rawData);
    let processedCount = 0;

    // Process each contact
    for (const row of rawData) {
      const contact = {
        id: parseInt(nanoid(8), 36),
        batchId,
        name: row[fieldMapping.name] || '',
        email: row[fieldMapping.email] || '',
        phone: row[fieldMapping.phone] || '',
        phone2: row[fieldMapping.phone2] || '',
        company: row[fieldMapping.company] || '',
        position: row[fieldMapping.position] || '',
        website: row[fieldMapping.website] || '',
        createdAt: new Date()
      };

      // Generate vCard
      const vCardData = generateVCard(contact);
      
      // Generate QR code URL (pointing to contact page)
      const baseUrl = req.headers.origin || 'https://vcard-frontend.vercel.app';
      const contactUrl = `${baseUrl}/contact/${contact.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(contactUrl);

      // Store contact in database
      await db.collection('contacts').insertOne({
        ...contact,
        vCardData,
        qrCodeUrl: qrCodeDataUrl
      });

      processedCount++;
    }

    // Update batch status
    await db.collection('batches').updateOne(
      { batchId },
      {
        $set: {
          status: 'completed',
          processedContacts: processedCount,
          fieldMapping,
          completedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      processedContacts: processedCount,
      totalContacts: rawData.length
    });

  } catch (error) {
    console.error('Process batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}