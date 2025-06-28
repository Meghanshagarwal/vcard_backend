import { storage } from '../../../lib/storage.js';

function generateVCard(contact) {
  let vcard = 'BEGIN:VCARD\r\n';
  vcard += 'VERSION:3.0\r\n';
  
  if (contact.name) {
    // For better compatibility, put entire name in FN and split for N
    const nameParts = contact.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    vcard += `FN:${contact.name}\r\n`;
    vcard += `N:${lastName};${firstName};;;\r\n`;
  }
  
  if (contact.phone) {
    const formattedPhone = contact.phone.startsWith('0') ? contact.phone : `0${contact.phone}`;
    vcard += `TEL;TYPE=CELL:${formattedPhone}\r\n`;
  }
  
  if (contact.phone2) {
    const formattedPhone2 = contact.phone2.startsWith('0') ? contact.phone2 : `0${contact.phone2}`;
    vcard += `TEL;TYPE=WORK:${formattedPhone2}\r\n`;
  }
  
  if (contact.email) {
    vcard += `EMAIL;TYPE=INTERNET:${contact.email}\r\n`;
  }
  
  if (contact.company) {
    vcard += `ORG:${contact.company}\r\n`;
  }
  
  if (contact.position) {
    vcard += `TITLE:${contact.position}\r\n`;
  }
  
  if (contact.website) {
    const websiteUrl = contact.website.startsWith('http') ? contact.website : `https://${contact.website}`;
    vcard += `URL:${websiteUrl}\r\n`;
  }
  
  vcard += 'END:VCARD\r\n';
  
  return vcard;
}

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

    const vCardData = generateVCard(contact);
    const fileName = `${contact.name || 'contact'}.vcf`;

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    res.send(vCardData);

  } catch (error) {
    console.error('vCard generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}