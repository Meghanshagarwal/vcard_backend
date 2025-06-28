import { MongoClient, Db, Collection } from 'mongodb';
import { IStorage } from './storage.js';
import { Batch, Contact, InsertBatch, InsertContact } from '../shared/schema.js';

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private batchesCollection: Collection;
  private contactsCollection: Collection;
  private isConnected: boolean = false;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    
    // Configure MongoDB client for Atlas compatibility
    this.client = new MongoClient(mongoUri, {
      retryWrites: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      maxPoolSize: 5,
    });
    this.db = this.client.db('vcards_icul');
    this.batchesCollection = this.db.collection('batches');
    this.contactsCollection = this.db.collection('contacts');
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        // Test the connection
        await this.db.admin().ping();
        this.isConnected = true;
        console.log('Connected to MongoDB successfully');
      } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw new Error('Failed to connect to MongoDB. Please check your MONGODB_URI and network connection.');
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    }
  }

  // Batch operations
  async createBatch(batch: InsertBatch): Promise<Batch> {
    await this.connect();
    
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const now = new Date();
    
    const batchDoc = {
      id,
      batchId: batch.batchId,
      fileName: batch.fileName,
      totalContacts: batch.totalContacts,
      status: batch.status || 'pending',
      processedContacts: batch.processedContacts || 0,
      fieldMapping: batch.fieldMapping || null,
      rawData: batch.rawData || null,
      createdAt: now
    };

    await this.batchesCollection.insertOne(batchDoc);
    return batchDoc as Batch;
  }

  async getBatch(batchId: string): Promise<Batch | undefined> {
    await this.connect();
    const batch = await this.batchesCollection.findOne({ batchId });
    return batch ? (batch as any) : undefined;
  }

  async updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch | undefined> {
    await this.connect();
    
    const result = await this.batchesCollection.findOneAndUpdate(
      { batchId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    return result ? (result as any) : undefined;
  }

  // Contact operations
  async createContact(contact: InsertContact): Promise<Contact> {
    await this.connect();
    
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const now = new Date();
    
    const contactDoc = {
      id,
      batchId: contact.batchId,
      name: contact.name,
      email: contact.email || null,
      phone: contact.phone || null,
      phone2: contact.phone2 || null,
      company: contact.company || null,
      position: contact.position || null,
      website: contact.website || null,
      vCardData: contact.vCardData || null,
      qrCodeUrl: contact.qrCodeUrl || null,
      createdAt: now
    };

    await this.contactsCollection.insertOne(contactDoc);
    return contactDoc as Contact;
  }

  async getContactsByBatch(batchId: string): Promise<Contact[]> {
    await this.connect();
    const contacts = await this.contactsCollection.find({ batchId }).toArray();
    return contacts.map((doc: any) => ({
      id: doc.id,
      batchId: doc.batchId,
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      phone2: doc.phone2,
      company: doc.company,
      position: doc.position,
      website: doc.website,
      vCardData: doc.vCardData,
      qrCodeUrl: doc.qrCodeUrl,
      createdAt: doc.createdAt
    })) as Contact[];
  }

  async getContactById(contactId: number): Promise<Contact | undefined> {
    await this.connect();
    const contact = await this.contactsCollection.findOne({ id: contactId });
    if (!contact) return undefined;
    
    return {
      id: contact.id,
      batchId: contact.batchId,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      phone2: contact.phone2,
      company: contact.company,
      position: contact.position,
      website: contact.website,
      vCardData: contact.vCardData,
      qrCodeUrl: contact.qrCodeUrl,
      createdAt: contact.createdAt
    } as Contact;
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact | undefined> {
    await this.connect();
    
    const result = await this.contactsCollection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );

    return result ? (result as any) : undefined;
  }

  async deleteContactsByBatch(batchId: string): Promise<void> {
    await this.connect();
    await this.contactsCollection.deleteMany({ batchId });
  }

  async getAllContacts(): Promise<Contact[]> {
    await this.connect();
    const contacts = await this.contactsCollection.find({}).toArray();
    return contacts.map((doc: any) => ({
      id: doc.id,
      batchId: doc.batchId,
      name: doc.name,
      email: doc.email,
      phone: doc.phone,
      phone2: doc.phone2,
      company: doc.company,
      position: doc.position,
      website: doc.website,
      vCardData: doc.vCardData,
      qrCodeUrl: doc.qrCodeUrl,
      createdAt: doc.createdAt
    })) as Contact[];
  }
}