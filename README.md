# QR Code Generator Backend

Serverless Node.js backend for QR code generation and contact management, optimized for Vercel deployment.

## API Endpoints

- `POST /api/upload` - Upload CSV/Excel files
- `GET /api/batches/{batchId}` - Get batch information
- `POST /api/batches/{batchId}/process` - Process contacts with field mapping
- `GET /api/batches/{batchId}/contacts` - Get all contacts in batch
- `GET /api/contacts/{contactId}` - Get individual contact
- `GET /api/qr/{contactId}` - Download QR code image
- `GET /api/qr/{contactId}/zip` - Download batch QR codes as ZIP

## Environment Variables

Required for Vercel deployment:

- `MONGODB_URI` - MongoDB Atlas connection string

## Deployment to Vercel

1. Create new Vercel project from this repository
2. Set `MONGODB_URI` environment variable
3. Deploy via Git integration (no build process needed)

## Local Development

```bash
npm install
vercel dev
```

## Technologies

- Node.js serverless functions
- MongoDB for data persistence
- Multer for file uploads
- QRCode generation
- CSV/Excel parsing