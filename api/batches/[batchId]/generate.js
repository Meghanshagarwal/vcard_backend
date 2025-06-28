import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { storage } from '../../../lib/storage.js';

function parseCSV(buffer) {
  const csvText = buffer.toString('utf-8');
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  
  return {
    data: result.data,
    headers: result.meta.fields || [],
    errors: result.errors?.map(e => e.message) || []
  };
}

function parseExcel(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      return { data: [], headers: [], errors: ['Empty file'] };
    }
    
    const headers = jsonData[0].map(h => String(h || '').trim()).filter(h => h);
    const data = jsonData.slice(1)
      .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    
    return { data, headers, errors: [] };
  } catch (error) {
    return { data: [], headers: [], errors: [error.message] };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { batchId } = req.query;
  const { fileData } = req.body;

  try {
    const batch = await storage.getBatch(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!batch.fieldMapping) {
      return res.status(400).json({ error: 'Field mapping not set' });
    }

    let parseResult;
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      const fileExtension = batch.fileName.split('.').pop().toLowerCase();
      
      if (fileExtension === 'csv') {
        parseResult = parseCSV(buffer);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        parseResult = parseExcel(buffer);
      } else {
        return res.status(400).json({ error: 'Unsupported file format' });
      }
    } else {
      return res.status(400).json({ error: 'File data not provided' });
    }

    const mapping = batch.fieldMapping;
    let processedCount = 0;

    for (const row of parseResult.data) {
      const contactId = Date.now() + Math.random();
      
      const contact = {
        id: contactId,
        batchId,
        name: row[mapping.name] || '',
        email: row[mapping.email] || '',
        phone: row[mapping.phone] || '',
        phone2: row[mapping.phone2] || '',
        company: row[mapping.company] || '',
        position: row[mapping.position] || '',
        website: row[mapping.website] || '',
      };

      // Format phone numbers
      if (contact.phone) {
        contact.phone = contact.phone.startsWith('0') ? contact.phone : `0${contact.phone}`;
      }
      if (contact.phone2) {
        contact.phone2 = contact.phone2.startsWith('0') ? contact.phone2 : `0${contact.phone2}`;
      }

      // Generate QR code URL (pointing to contact page)
      const contactUrl = `${process.env.FRONTEND_URL || 'https://your-frontend-url.vercel.app'}/contact/${contactId}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(contactUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#FFFFFF',
          light: '#00000000'
        },
        width: 300
      });

      contact.qrCodeUrl = qrCodeDataUrl;
      
      await storage.createContact(contact);
      processedCount++;
    }

    await storage.updateBatch(batchId, {
      status: 'generated',
      processedContacts: processedCount,
      generatedAt: new Date()
    });

    res.json({ 
      success: true, 
      processedContacts: processedCount,
      message: `Generated ${processedCount} QR codes successfully`
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}