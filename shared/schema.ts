import { z } from "zod";

// MongoDB-compatible schema definitions
export const contactSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  website: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  vCardData: z.string().optional(),
  batchId: z.string(),
  createdAt: z.date().optional(),
});

export const batchSchema = z.object({
  id: z.number(),
  batchId: z.string(),
  fileName: z.string(),
  totalContacts: z.number(),
  processedContacts: z.number().default(0),
  status: z.string().default("pending"),
  fieldMapping: z.record(z.string()).optional(),
  rawData: z.string().optional(),
  createdAt: z.date().optional(),
});

export const insertContactSchema = contactSchema.omit({
  id: true,
  createdAt: true,
});

export const insertBatchSchema = batchSchema.omit({
  id: true,
  createdAt: true,
});

export const fieldMappingSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  website: z.string().optional(),
});

export type Contact = z.infer<typeof contactSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Batch = z.infer<typeof batchSchema>;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type FieldMapping = z.infer<typeof fieldMappingSchema>;
