import { MongoStorage } from './mongoStorage.js';

class MemoryFallbackStorage {
  constructor() {
    this.contacts = new Map();
    this.batches = new Map();
    this.currentContactId = 1;
    this.currentBatchId = 1;
  }

  async createBatch(insertBatch) {
    const batch = { 
      id: this.currentBatchId++,
      ...insertBatch,
      uploadedAt: insertBatch.uploadedAt || new Date(),
      status: insertBatch.status || 'uploaded'
    };
    this.batches.set(insertBatch.batchId, batch);
    return batch;
  }

  async getBatch(batchId) {
    return this.batches.get(batchId);
  }

  async updateBatch(batchId, updates) {
    const batch = this.batches.get(batchId);
    if (!batch) return undefined;
    
    const updatedBatch = { ...batch, ...updates };
    this.batches.set(batchId, updatedBatch);
    return updatedBatch;
  }

  async createContact(insertContact) {
    const contact = { 
      id: insertContact.id || this.currentContactId++,
      ...insertContact 
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  async getContactsByBatch(batchId) {
    return Array.from(this.contacts.values()).filter(contact => contact.batchId === batchId);
  }

  async getContactById(contactId) {
    return this.contacts.get(contactId);
  }

  async updateContact(id, updates) {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;
    
    const updatedContact = { ...contact, ...updates };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  async deleteContactsByBatch(batchId) {
    for (const [id, contact] of this.contacts.entries()) {
      if (contact.batchId === batchId) {
        this.contacts.delete(id);
      }
    }
  }

  async getAllContacts() {
    return Array.from(this.contacts.values());
  }
}

class HybridStorage {
  constructor() {
    this.mongoStorage = new MongoStorage();
    this.fallbackStorage = new MemoryFallbackStorage();
    this.useMongoDb = true;
    this.connectionAttempted = false;
  }

  async ensureConnection() {
    if (this.connectionAttempted) return;
    
    this.connectionAttempted = true;
    try {
      console.log('Attempting MongoDB connection...');
      await this.mongoStorage.connect();
      console.log('✓ Successfully connected to MongoDB - data will persist');
      this.useMongoDb = true;
    } catch (error) {
      console.log('✗ MongoDB connection failed:', error.message);
      console.log('⚠ Using in-memory storage - QR codes will not persist between restarts');
      this.useMongoDb = false;
    }
  }

  async getStorage() {
    await this.ensureConnection();
    return this.useMongoDb ? this.mongoStorage : this.fallbackStorage;
  }

  async createBatch(batch) {
    const storage = await this.getStorage();
    return storage.createBatch(batch);
  }

  async getBatch(batchId) {
    const storage = await this.getStorage();
    return storage.getBatch(batchId);
  }

  async updateBatch(batchId, updates) {
    const storage = await this.getStorage();
    return storage.updateBatch(batchId, updates);
  }

  async createContact(contact) {
    const storage = await this.getStorage();
    return storage.createContact(contact);
  }

  async getContactsByBatch(batchId) {
    const storage = await this.getStorage();
    return storage.getContactsByBatch(batchId);
  }

  async getContactById(contactId) {
    const storage = await this.getStorage();
    return storage.getContactById(contactId);
  }

  async updateContact(id, updates) {
    const storage = await this.getStorage();
    return storage.updateContact(id, updates);
  }

  async deleteContactsByBatch(batchId) {
    const storage = await this.getStorage();
    return storage.deleteContactsByBatch(batchId);
  }

  async getAllContacts() {
    const storage = await this.getStorage();
    return storage.getAllContacts();
  }
}

export const storage = new HybridStorage();