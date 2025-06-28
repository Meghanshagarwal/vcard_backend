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

    if (!contact.qrCodeUrl) {
      return res.status(404).json({ error: 'QR code not found for this contact' });
    }

    // Extract base64 data from data URL
    const base64Data = contact.qrCodeUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `qr-${contact.name?.replace(/[^a-zA-Z0-9]/g, '_') || contactId}.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);

  } catch (error) {
    console.error('QR download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}