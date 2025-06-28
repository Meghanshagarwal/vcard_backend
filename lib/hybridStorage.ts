import { MongoStorage } from './mongoStorage.js';
import { IStorage } from './storage.js';
import { Batch, Contact, InsertBatch, InsertContact } from '../shared/schema.js';

// Simple in-memory storage fallback
class MemoryFallbackStorage implements IStorage {
  private contacts: Map<number, Contact> = new Map();
  private batches: Map<string, Batch> = new Map();
  private currentContactId: number = 1;
  private currentBatchId: number = 1;

  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const id = this.currentBatchId++;
    const batch: Batch = { 
      id,
      batchId: insertBatch.batchId,
      fileName: insertBatch.fileName,
      totalContacts: insertBatch.totalContacts,
      processedContacts: insertBatch.processedContacts || 0,
      status: insertBatch.status || "pending",
      fieldMapping: insertBatch.fieldMapping || null,
      rawData: insertBatch.rawData || null,
      createdAt: new Date()
    };
    this.batches.set(batch.batchId, batch);
    return batch;
  }

  async getBatch(batchId: string): Promise<Batch | undefined> {
    return this.batches.get(batchId);
  }

  async updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch | undefined> {
    const batch = this.batches.get(batchId);
    if (!batch) return undefined;
    const updatedBatch = { ...batch, ...updates };
    this.batches.set(batchId, updatedBatch);
    return updatedBatch;
  }

  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const contact: Contact = { 
      id,
      batchId: insertContact.batchId,
      name: insertContact.name,
      email: insertContact.email || null,
      phone: insertContact.phone || null,
      phone2: insertContact.phone2 || null,
      company: insertContact.company || null,
      position: insertContact.position || null,
      website: insertContact.website || null,
      vCardData: insertContact.vCardData || null,
      qrCodeUrl: insertContact.qrCodeUrl || null,
      createdAt: new Date()
    };
    this.contacts.set(id, contact);
    return contact;
  }

  async getContactsByBatch(batchId: string): Promise<Contact[]> {
    return Array.from(this.contacts.values()).filter(c => c.batchId === batchId);
  }

  async getContactById(contactId: number): Promise<Contact | undefined> {
    return this.contacts.get(contactId);
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    const updatedContact = { ...contact, ...updates };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContactsByBatch(batchId: string): Promise<void> {
    const contactsToDelete: number[] = [];
    this.contacts.forEach((contact, id) => {
      if (contact.batchId === batchId) {
        contactsToDelete.push(id);
      }
    });
    contactsToDelete.forEach(id => this.contacts.delete(id));
  }

  async getAllContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }
}

export class HybridStorage implements IStorage {
  private mongoStorage: MongoStorage;
  private fallbackStorage: MemoryFallbackStorage;
  private useMongoDb: boolean = true;
  private connectionAttempted: boolean = false;

  constructor() {
    this.mongoStorage = new MongoStorage();
    this.fallbackStorage = new MemoryFallbackStorage();
  }

  private async ensureConnection(): Promise<void> {
    if (!this.connectionAttempted) {
      console.log('Attempting MongoDB connection...');
      try {
        await this.mongoStorage.connect();
        this.useMongoDb = true;
        console.log('✓ Successfully connected to MongoDB - data will persist');
      } catch (error: any) {
        console.error('✗ MongoDB connection failed:', error.message);
        if (error.message.includes('ssl3_read_bytes') || error.message.includes('tlsv1 alert')) {
          console.log('  This appears to be an SSL/TLS configuration issue with MongoDB Atlas');
          console.log('  Common solutions:');
          console.log('  1. Ensure your IP address is whitelisted in MongoDB Atlas Network Access');
          console.log('  2. Try using a different network or VPN');
          console.log('  3. Contact MongoDB support for SSL configuration help');
        }
        this.useMongoDb = false;
        console.log('⚠ Using in-memory storage - QR codes will not persist between restarts');
      }
      this.connectionAttempted = true;
    }
  }

  private async getStorage(): Promise<IStorage> {
    await this.ensureConnection();
    return this.useMongoDb ? this.mongoStorage : this.fallbackStorage;
  }

  async createBatch(batch: InsertBatch): Promise<Batch> {
    const storage = await this.getStorage();
    return storage.createBatch(batch);
  }

  async getBatch(batchId: string): Promise<Batch | undefined> {
    const storage = await this.getStorage();
    return storage.getBatch(batchId);
  }

  async updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch | undefined> {
    const storage = await this.getStorage();
    return storage.updateBatch(batchId, updates);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const storage = await this.getStorage();
    return storage.createContact(contact);
  }

  async getContactsByBatch(batchId: string): Promise<Contact[]> {
    const storage = await this.getStorage();
    return storage.getContactsByBatch(batchId);
  }

  async getContactById(contactId: number): Promise<Contact | undefined> {
    const storage = await this.getStorage();
    return storage.getContactById(contactId);
  }

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact | undefined> {
    const storage = await this.getStorage();
    return storage.updateContact(id, updates);
  }

  async deleteContactsByBatch(batchId: string): Promise<void> {
    const storage = await this.getStorage();
    return storage.deleteContactsByBatch(batchId);
  }

  async getAllContacts(): Promise<Contact[]> {
    const storage = await this.getStorage();
    return storage.getAllContacts();
  }
}