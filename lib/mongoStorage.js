import { MongoClient } from 'mongodb';

export class MongoStorage {
  constructor() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    this.db = null;
    this.batchesCollection = null;
    this.contactsCollection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      await this.client.connect();
      this.db = this.client.db('vcards_icul');
      this.batchesCollection = this.db.collection('batches');
      this.contactsCollection = this.db.collection('contacts');
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error('Failed to connect to MongoDB. Please check your MONGODB_URI and network connection.');
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  async createBatch(batch) {
    const result = await this.batchesCollection.insertOne({
      ...batch,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const insertedBatch = await this.batchesCollection.findOne({ _id: result.insertedId });
    return { id: insertedBatch._id, ...insertedBatch };
  }

  async getBatch(batchId) {
    const batch = await this.batchesCollection.findOne({ batchId });
    return batch ? { id: batch._id, ...batch } : undefined;
  }

  async updateBatch(batchId, updates) {
    const result = await this.batchesCollection.findOneAndUpdate(
      { batchId },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result.value ? { id: result.value._id, ...result.value } : undefined;
  }

  async createContact(contact) {
    const result = await this.contactsCollection.insertOne({
      ...contact,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const insertedContact = await this.contactsCollection.findOne({ _id: result.insertedId });
    return { id: insertedContact.id, ...insertedContact };
  }

  async getContactsByBatch(batchId) {
    const contacts = await this.contactsCollection.find({ batchId }).toArray();
    return contacts.map(contact => ({ id: contact.id, ...contact }));
  }

  async getContactById(contactId) {
    const contact = await this.contactsCollection.findOne({ id: contactId });
    return contact ? { id: contact.id, ...contact } : undefined;
  }

  async updateContact(id, updates) {
    const result = await this.contactsCollection.findOneAndUpdate(
      { id },
      { 
        $set: { 
          ...updates, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );
    
    return result.value ? { id: result.value.id, ...result.value } : undefined;
  }

  async deleteContactsByBatch(batchId) {
    await this.contactsCollection.deleteMany({ batchId });
  }

  async getAllContacts() {
    const contacts = await this.contactsCollection.find({}).toArray();
    return contacts.map(contact => ({ id: contact.id, ...contact }));
  }
}