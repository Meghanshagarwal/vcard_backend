import { type Contact, type InsertContact, type Batch, type InsertBatch } from "../shared/schema.js";

export interface IStorage {
  // Batch operations
  createBatch(batch: InsertBatch): Promise<Batch>;
  getBatch(batchId: string): Promise<Batch | undefined>;
  updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch | undefined>;
  
  // Contact operations
  createContact(contact: InsertContact): Promise<Contact>;
  getContactsByBatch(batchId: string): Promise<Contact[]>;
  getContactById(contactId: number): Promise<Contact | undefined>;
  updateContact(id: number, updates: Partial<Contact>): Promise<Contact | undefined>;
  deleteContactsByBatch(batchId: string): Promise<void>;
  getAllContacts(): Promise<Contact[]>;
}

import { HybridStorage } from './hybridStorage.js';

export const storage = new HybridStorage();