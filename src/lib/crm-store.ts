/**
 * @fileoverview WhatsApp Marketing System — Server-Side CRM Data Store
 *
 * Persists all CRM data as JSON files on disk under:
 *   <project-root>/data/whatsapp/
 *
 * File layout:
 *   contacts.json      — Contact[]
 *   messages.json      — Message[]
 *   templates.json     — MessageTemplate[]
 *   campaigns.json     — Campaign[]
 *   sequences.json     — DripSequence[]
 *   enrollments.json   — DripEnrollment[]
 *
 * All mutations are guarded by a simple in-process write lock to avoid
 * partial-write corruption in concurrent Next.js API handler calls.
 *
 * @module lib/crm-store
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  Contact,
  Message,
  MessageTemplate,
  Campaign,
  DripSequence,
  DripEnrollment,
  BrandConfig,
  CsvContactRow,
  LeadScoringEvent,
} from '@/types/whatsapp';

// ─────────────────────────────────────────────────────────────────────────────
// Storage directory setup
// ─────────────────────────────────────────────────────────────────────────────

/** Root directory for all WhatsApp JSON stores — uses /tmp on serverless */
const DATA_DIR = path.join(
  process.env.VERCEL ? '/tmp' : process.cwd(),
  'data',
  'whatsapp'
);

/** Paths to each store file */
const STORE_PATHS = {
  contacts: path.join(DATA_DIR, 'contacts.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  templates: path.join(DATA_DIR, 'templates.json'),
  campaigns: path.join(DATA_DIR, 'campaigns.json'),
  sequences: path.join(DATA_DIR, 'sequences.json'),
  enrollments: path.join(DATA_DIR, 'enrollments.json'),
} as const;

/** Ensure the data directory and all store files exist */
function ensureStores(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  for (const filePath of Object.values(STORE_PATHS)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf-8');
    }
  }
}

// Initialise on module load (server-side only)
ensureStores();

// ─────────────────────────────────────────────────────────────────────────────
// Generic read/write helpers with in-process locking
// ─────────────────────────────────────────────────────────────────────────────

/** Simple per-file write lock using a Map of pending Promises */
const writeLocks = new Map<string, Promise<void>>();

/**
 * Read and parse a JSON store file.
 * Returns an empty array if the file is missing or malformed.
 */
function readStore<T>(filePath: string): T[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

/**
 * Atomically write data to a JSON store file.
 * Writes to a temp file first, then renames to prevent corruption.
 * Serialises concurrent writes via a per-file promise chain.
 */
async function writeStore<T>(filePath: string, data: T[]): Promise<void> {
  const existing = writeLocks.get(filePath) ?? Promise.resolve();
  const next = existing.then(() => {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
  });
  writeLocks.set(filePath, next);
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead scoring constants
// ─────────────────────────────────────────────────────────────────────────────

/** Score delta applied for each engagement event type */
const LEAD_SCORE_DELTAS: Record<LeadScoringEvent['event'], number> = {
  message_received: 10,
  replied: 20,
  link_clicked: 15,
  demo_requested: 25,
  phone_call: 30,
  unsubscribed: -50,
  no_reply_7d: -5,
};

// ─────────────────────────────────────────────────────────────────────────────
// Contact CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all contacts, optionally filtered by brand, tags, and/or stage.
 *
 * @param filters - Optional filter criteria
 */
export async function getContacts(filters?: {
  brand?: BrandConfig['id'];
  tags?: string[];
  stage?: Contact['stage'];
  search?: string; // searches name, phone, email, company
}): Promise<Contact[]> {
  let contacts = readStore<Contact>(STORE_PATHS.contacts);

  if (filters?.brand) {
    contacts = contacts.filter((c) => c.brand === filters.brand);
  }

  if (filters?.stage) {
    contacts = contacts.filter((c) => c.stage === filters.stage);
  }

  if (filters?.tags && filters.tags.length > 0) {
    contacts = contacts.filter((c) =>
      filters.tags!.some((tag) => c.tags.includes(tag))
    );
  }

  if (filters?.search) {
    const query = filters.search.toLowerCase();
    contacts = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email ?? '').toLowerCase().includes(query) ||
        (c.company ?? '').toLowerCase().includes(query)
    );
  }

  return contacts;
}

/**
 * Retrieve a single contact by ID.
 *
 * @param id - Contact UUID
 * @returns The contact, or null if not found
 */
export async function getContactById(id: string): Promise<Contact | null> {
  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  return contacts.find((c) => c.id === id) ?? null;
}

/**
 * Find a contact by their E.164 phone number.
 *
 * @param phone - E.164 phone number
 * @param brand - Brand scope (a phone can exist in multiple brands)
 */
export async function getContactByPhone(
  phone: string,
  brand?: BrandConfig['id']
): Promise<Contact | null> {
  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  return (
    contacts.find(
      (c) => c.phone === phone && (brand ? c.brand === brand : true)
    ) ?? null
  );
}

/**
 * Create a new contact.
 *
 * @param data - Contact data (id, createdAt, updatedAt are auto-generated)
 * @returns The newly created contact
 */
export async function createContact(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Contact> {
  const now = new Date().toISOString();
  const contact: Contact = {
    ...data,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  contacts.push(contact);
  await writeStore(STORE_PATHS.contacts, contacts);
  return contact;
}

/**
 * Update an existing contact by ID.
 *
 * @param id      - Contact UUID
 * @param updates - Partial contact fields to update
 * @returns The updated contact, or null if not found
 */
export async function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id' | 'createdAt'>>
): Promise<Contact | null> {
  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  contacts[idx] = {
    ...contacts[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeStore(STORE_PATHS.contacts, contacts);
  return contacts[idx];
}

/**
 * Delete a contact and all their messages.
 *
 * @param id - Contact UUID
 * @returns true if the contact was found and deleted
 */
export async function deleteContact(id: string): Promise<boolean> {
  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  const initial = contacts.length;
  const updated = contacts.filter((c) => c.id !== id);

  if (updated.length === initial) return false;

  await writeStore(STORE_PATHS.contacts, updated);

  // Cascade-delete messages for this contact
  const messages = readStore<Message>(STORE_PATHS.messages);
  await writeStore(
    STORE_PATHS.messages,
    messages.filter((m) => m.contactId !== id)
  );

  return true;
}

/**
 * Apply a lead scoring event to a contact, clamping the score to [0, 100].
 *
 * @param contactId - Contact UUID
 * @param event     - The engagement event type
 * @returns The updated contact, or null if not found
 */
export async function applyLeadScore(
  contactId: string,
  event: LeadScoringEvent['event']
): Promise<Contact | null> {
  const contact = await getContactById(contactId);
  if (!contact) return null;

  const delta = LEAD_SCORE_DELTAS[event];
  const newScore = Math.max(0, Math.min(100, contact.leadScore + delta));

  return updateContact(contactId, { leadScore: newScore });
}

// ─────────────────────────────────────────────────────────────────────────────
// Message history
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all messages for a contact, sorted oldest-first.
 *
 * @param contactId - Contact UUID
 */
export async function getMessages(contactId: string): Promise<Message[]> {
  const messages = readStore<Message>(STORE_PATHS.messages);
  return messages
    .filter((m) => m.contactId === contactId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Append a new message to the store.
 *
 * @param data - Message data (id and timestamp are auto-generated)
 * @returns The persisted message
 */
export async function addMessage(
  data: Omit<Message, 'id' | 'timestamp'>
): Promise<Message> {
  const message: Message = {
    ...data,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  const messages = readStore<Message>(STORE_PATHS.messages);
  messages.push(message);
  await writeStore(STORE_PATHS.messages, messages);

  // Update the contact's lastContacted field
  await updateContact(data.contactId, {
    lastContacted: message.timestamp,
  });

  return message;
}

/**
 * Update the status of a message (e.g., after a Twilio status callback).
 *
 * @param id     - Message UUID
 * @param status - New delivery status
 * @param sid    - Optional Twilio SID to record
 * @returns The updated message, or null if not found
 */
export async function updateMessageStatus(
  id: string,
  status: Message['status'],
  sid?: string
): Promise<Message | null> {
  const messages = readStore<Message>(STORE_PATHS.messages);
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  messages[idx] = {
    ...messages[idx],
    status,
    ...(sid ? { twilioSid: sid } : {}),
  };

  await writeStore(STORE_PATHS.messages, messages);
  return messages[idx];
}

/**
 * Find a message by its Twilio SID.
 *
 * @param twilioSid - Twilio Message SID (e.g. "SMxxxxxx")
 */
export async function getMessageByTwilioSid(twilioSid: string): Promise<Message | null> {
  const messages = readStore<Message>(STORE_PATHS.messages);
  return messages.find((m) => m.twilioSid === twilioSid) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all templates, optionally filtered by brand and/or category.
 */
export async function getTemplates(filters?: {
  brand?: BrandConfig['id'];
  category?: MessageTemplate['category'];
}): Promise<MessageTemplate[]> {
  let templates = readStore<MessageTemplate>(STORE_PATHS.templates);

  if (filters?.brand) {
    templates = templates.filter((t) => t.brand === filters.brand);
  }
  if (filters?.category) {
    templates = templates.filter((t) => t.category === filters.category);
  }

  return templates;
}

/**
 * Create a new message template.
 */
export async function createTemplate(
  data: Omit<MessageTemplate, 'id' | 'createdAt'>
): Promise<MessageTemplate> {
  const template: MessageTemplate = {
    ...data,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const templates = readStore<MessageTemplate>(STORE_PATHS.templates);
  templates.push(template);
  await writeStore(STORE_PATHS.templates, templates);
  return template;
}

/**
 * Update an existing template.
 */
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt'>>
): Promise<MessageTemplate | null> {
  const templates = readStore<MessageTemplate>(STORE_PATHS.templates);
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  templates[idx] = { ...templates[idx], ...updates };
  await writeStore(STORE_PATHS.templates, templates);
  return templates[idx];
}

/**
 * Delete a template by ID.
 */
export async function deleteTemplate(id: string): Promise<boolean> {
  const templates = readStore<MessageTemplate>(STORE_PATHS.templates);
  const updated = templates.filter((t) => t.id !== id);
  if (updated.length === templates.length) return false;
  await writeStore(STORE_PATHS.templates, updated);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all campaigns, optionally filtered by brand and/or status.
 */
export async function getCampaigns(filters?: {
  brand?: BrandConfig['id'];
  status?: Campaign['status'];
}): Promise<Campaign[]> {
  let campaigns = readStore<Campaign>(STORE_PATHS.campaigns);

  if (filters?.brand) {
    campaigns = campaigns.filter((c) => c.brand === filters.brand);
  }
  if (filters?.status) {
    campaigns = campaigns.filter((c) => c.status === filters.status);
  }

  return campaigns;
}

/**
 * Retrieve a single campaign by ID.
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  const campaigns = readStore<Campaign>(STORE_PATHS.campaigns);
  return campaigns.find((c) => c.id === id) ?? null;
}

/**
 * Create a new campaign.
 */
export async function createCampaign(
  data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'sentCount' | 'deliveredCount' | 'readCount' | 'repliedCount'>
): Promise<Campaign> {
  const now = new Date().toISOString();
  const campaign: Campaign = {
    ...data,
    id: randomUUID(),
    sentCount: 0,
    deliveredCount: 0,
    readCount: 0,
    repliedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const campaigns = readStore<Campaign>(STORE_PATHS.campaigns);
  campaigns.push(campaign);
  await writeStore(STORE_PATHS.campaigns, campaigns);
  return campaign;
}

/**
 * Update a campaign's fields (status, counters, etc.).
 */
export async function updateCampaign(
  id: string,
  updates: Partial<Omit<Campaign, 'id' | 'createdAt'>>
): Promise<Campaign | null> {
  const campaigns = readStore<Campaign>(STORE_PATHS.campaigns);
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  campaigns[idx] = {
    ...campaigns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeStore(STORE_PATHS.campaigns, campaigns);
  return campaigns[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// Drip Sequences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve all drip sequences, optionally filtered by brand.
 */
export async function getSequences(brand?: BrandConfig['id']): Promise<DripSequence[]> {
  let sequences = readStore<DripSequence>(STORE_PATHS.sequences);
  if (brand) {
    sequences = sequences.filter((s) => s.brand === brand);
  }
  return sequences;
}

/**
 * Create a new drip sequence.
 */
export async function createSequence(
  data: Omit<DripSequence, 'id' | 'createdAt' | 'enrolledContacts'>
): Promise<DripSequence> {
  const sequence: DripSequence = {
    ...data,
    id: randomUUID(),
    enrolledContacts: [],
    createdAt: new Date().toISOString(),
  };

  const sequences = readStore<DripSequence>(STORE_PATHS.sequences);
  sequences.push(sequence);
  await writeStore(STORE_PATHS.sequences, sequences);
  return sequence;
}

/**
 * Retrieve all enrollments, optionally filtered by contact or sequence.
 */
export async function getEnrollments(filters?: {
  contactId?: string;
  sequenceId?: string;
  active?: boolean;
}): Promise<DripEnrollment[]> {
  let enrollments = readStore<DripEnrollment>(STORE_PATHS.enrollments);

  if (filters?.contactId) {
    enrollments = enrollments.filter((e) => e.contactId === filters.contactId);
  }
  if (filters?.sequenceId) {
    enrollments = enrollments.filter((e) => e.sequenceId === filters.sequenceId);
  }
  if (filters?.active !== undefined) {
    enrollments = enrollments.filter((e) => e.isActive === filters.active);
  }

  return enrollments;
}

/**
 * Enrol a contact in a drip sequence.
 * Skips if the contact is already actively enrolled.
 *
 * @param sequenceId - DripSequence UUID
 * @param contactId  - Contact UUID
 * @returns The new enrollment record, or the existing one if already enrolled
 */
export async function enrollInSequence(
  sequenceId: string,
  contactId: string
): Promise<DripEnrollment> {
  // Check for existing active enrollment
  const existing = (await getEnrollments({ contactId, sequenceId, active: true }))[0];
  if (existing) return existing;

  const sequences = readStore<DripSequence>(STORE_PATHS.sequences);
  const sequence = sequences.find((s) => s.id === sequenceId);
  if (!sequence || !sequence.isActive) {
    throw new Error(`Sequence "${sequenceId}" not found or inactive.`);
  }
  if (sequence.steps.length === 0) {
    throw new Error(`Sequence "${sequenceId}" has no steps.`);
  }

  const now = new Date();
  const firstDelay = sequence.steps[0].delayDays;
  const nextSendAt = new Date(now.getTime() + firstDelay * 86_400_000).toISOString();

  const enrollment: DripEnrollment = {
    id: randomUUID(),
    sequenceId,
    contactId,
    currentStepIndex: 0,
    nextSendAt,
    isActive: true,
    enrolledAt: now.toISOString(),
  };

  const enrollments = readStore<DripEnrollment>(STORE_PATHS.enrollments);
  enrollments.push(enrollment);
  await writeStore(STORE_PATHS.enrollments, enrollments);

  // Add contact to sequence's enrolledContacts list
  const seqIdx = sequences.findIndex((s) => s.id === sequenceId);
  if (seqIdx !== -1 && !sequences[seqIdx].enrolledContacts.includes(contactId)) {
    sequences[seqIdx].enrolledContacts.push(contactId);
    await writeStore(STORE_PATHS.sequences, sequences);
  }

  return enrollment;
}

/**
 * Advance a drip enrollment to the next step.
 * Sets isActive=false if all steps are complete.
 *
 * @param enrollmentId - DripEnrollment UUID
 * @returns The updated enrollment, or null if not found
 */
export async function advanceEnrollment(enrollmentId: string): Promise<DripEnrollment | null> {
  const enrollments = readStore<DripEnrollment>(STORE_PATHS.enrollments);
  const idx = enrollments.findIndex((e) => e.id === enrollmentId);
  if (idx === -1) return null;

  const enrollment = enrollments[idx];
  const sequences = readStore<DripSequence>(STORE_PATHS.sequences);
  const sequence = sequences.find((s) => s.id === enrollment.sequenceId);
  if (!sequence) return null;

  const nextStepIndex = enrollment.currentStepIndex + 1;

  if (nextStepIndex >= sequence.steps.length) {
    // Sequence complete
    enrollments[idx] = {
      ...enrollment,
      isActive: false,
      completedAt: new Date().toISOString(),
    };
  } else {
    const nextStep = sequence.steps[nextStepIndex];
    const nextSendAt = new Date(
      Date.now() + nextStep.delayDays * 86_400_000
    ).toISOString();

    enrollments[idx] = {
      ...enrollment,
      currentStepIndex: nextStepIndex,
      nextSendAt,
    };
  }

  await writeStore(STORE_PATHS.enrollments, enrollments);
  return enrollments[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import / Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of CsvContactRow objects.
 * Expects the first row to be a header row.
 * Supported columns (case-insensitive): name, phone, email, company, role, tags, notes.
 *
 * @param csvText - Raw CSV string
 * @returns Array of parsed rows
 */
export function parseCsvContacts(csvText: string): CsvContactRow[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside them
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim().replace(/^["']|["']$/g, '');
    });

    return {
      name: row.name ?? '',
      phone: row.phone ?? row.mobile ?? row.number ?? '',
      email: row.email || undefined,
      company: row.company || row.organisation || row.organization || undefined,
      role: row.role || row.title || row.jobtitle || undefined,
      tags: row.tags || undefined,
      notes: row.notes || row.note || undefined,
    };
  }).filter((r) => r.phone); // Skip rows without a phone number
}

/**
 * Split a CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Import contacts from a parsed CSV, assigning them to a brand.
 * Skips rows that already have a contact with the same phone number in the same brand.
 *
 * @param rows  - Parsed CSV rows
 * @param brand - Brand to assign contacts to
 * @returns Summary: { imported, skipped }
 */
export async function importContactsFromCsv(
  rows: CsvContactRow[],
  brand: BrandConfig['id']
): Promise<{ imported: number; skipped: number; contacts: Contact[] }> {
  const imported: Contact[] = [];
  let skipped = 0;

  for (const row of rows) {
    try {
      const existing = await getContactByPhone(row.phone, brand);
      if (existing) {
        skipped++;
        continue;
      }

      const tags = row.tags
        ? row.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
        : [];

      const contact = await createContact({
        phone: row.phone,
        name: row.name || 'Unknown',
        email: row.email,
        company: row.company,
        role: row.role,
        brand,
        tags,
        leadScore: 0,
        stage: 'new',
        source: 'import',
        notes: row.notes ?? '',
      });

      imported.push(contact);
    } catch {
      skipped++;
    }
  }

  return { imported: imported.length, skipped, contacts: imported };
}

/**
 * Export contacts to a CSV string.
 *
 * @param filters - Same filters as getContacts
 * @returns CSV string with header row
 */
export async function exportContactsToCsv(filters?: {
  brand?: BrandConfig['id'];
  tags?: string[];
  stage?: Contact['stage'];
}): Promise<string> {
  const contacts = await getContacts(filters);

  const headers = ['id', 'name', 'phone', 'email', 'company', 'role', 'brand',
    'tags', 'leadScore', 'stage', 'source', 'notes', 'lastContacted', 'createdAt'];

  const rows = contacts.map((c) => [
    c.id,
    escapeCsvField(c.name),
    c.phone,
    c.email ?? '',
    escapeCsvField(c.company ?? ''),
    escapeCsvField(c.role ?? ''),
    c.brand,
    escapeCsvField(c.tags.join(';')),
    String(c.leadScore),
    c.stage,
    c.source,
    escapeCsvField(c.notes),
    c.lastContacted ?? '',
    c.createdAt,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/** Wrap a CSV field value in quotes if it contains commas, quotes, or newlines */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a full analytics snapshot from the raw JSON stores.
 */
export async function computeAnalytics() {
  const contacts = readStore<Contact>(STORE_PATHS.contacts);
  const messages = readStore<Message>(STORE_PATHS.messages);
  const campaigns = readStore<Campaign>(STORE_PATHS.campaigns);

  // Active conversations: contacts with a message in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentContactIds = new Set(
    messages
      .filter((m) => m.timestamp > sevenDaysAgo)
      .map((m) => m.contactId)
  );

  const outbound = messages.filter((m) => m.direction === 'outbound');
  const delivered = outbound.filter((m) =>
    m.status === 'delivered' || m.status === 'read'
  );
  const read = outbound.filter((m) => m.status === 'read');

  // Reply rate: inbound messages / total outbound (proxy for reply rate)
  const inbound = messages.filter((m) => m.direction === 'inbound');

  // Tag frequencies
  const tagCounts: Record<string, number> = {};
  for (const c of contacts) {
    for (const tag of c.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Stage distribution
  const stageCounts: Record<string, number> = {};
  for (const c of contacts) {
    stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1;
  }
  const stageDistribution = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
  }));

  // Brand breakdown
  const brandContactCounts: Record<string, number> = {};
  const brandMessageCounts: Record<string, number> = {};
  for (const c of contacts) {
    brandContactCounts[c.brand] = (brandContactCounts[c.brand] ?? 0) + 1;
  }
  for (const m of messages) {
    brandMessageCounts[m.brand] = (brandMessageCounts[m.brand] ?? 0) + 1;
  }
  const allBrands = new Set([
    ...Object.keys(brandContactCounts),
    ...Object.keys(brandMessageCounts),
  ]);
  const brandBreakdown = Array.from(allBrands).map((brand) => ({
    brand,
    contacts: brandContactCounts[brand] ?? 0,
    messages: brandMessageCounts[brand] ?? 0,
  }));

  return {
    totalContacts: contacts.length,
    activeConversations: recentContactIds.size,
    messagesSent: outbound.length,
    messagesReceived: inbound.length,
    deliveryRate: outbound.length > 0 ? delivered.length / outbound.length : 0,
    readRate: delivered.length > 0 ? read.length / delivered.length : 0,
    replyRate: outbound.length > 0 ? inbound.length / outbound.length : 0,
    campaignsSent: campaigns.filter(
      (c) => c.status === 'completed' || c.status === 'running'
    ).length,
    topTags,
    stageDistribution,
    brandBreakdown,
  };
}
