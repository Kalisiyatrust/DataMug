/**
 * @fileoverview WhatsApp Marketing System — Multi-Channel Outreach Service
 *
 * Unified orchestration layer that routes outreach messages to the correct
 * channel client (Brevo Email, Telegram Bot, Meta WhatsApp Cloud API) and
 * persists all outreach activity to:
 *
 *   <DATA_DIR>/outreach-messages.json  — OutreachMessage[]
 *   <DATA_DIR>/outreach-campaigns.json — OutreachCampaign[]
 *
 * DATA_DIR mirrors the pattern in crm-store.ts:
 *   /tmp/data/whatsapp/ on Vercel (serverless)
 *   <project-root>/data/whatsapp/ locally
 *
 * @module lib/outreach-service
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Contact } from '@/types/whatsapp';
import type { OutreachChannel, OutreachMessage, OutreachCampaign } from '@/types/whatsapp';
import { sendEmail } from '@/lib/brevo-client';
import { sendTelegramMessage } from '@/lib/telegram-client';
import { sendWhatsAppText } from '@/lib/meta-whatsapp-client';
import { getContacts } from '@/lib/crm-store';

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

/** Root directory for all JSON stores — mirrors crm-store.ts convention */
const DATA_DIR = path.join(
  process.env.VERCEL ? '/tmp' : process.cwd(),
  'data',
  'whatsapp'
);

/** Paths to the outreach-specific store files */
const OUTREACH_PATHS = {
  messages: path.join(DATA_DIR, 'outreach-messages.json'),
  campaigns: path.join(DATA_DIR, 'outreach-campaigns.json'),
} as const;

/** Ensure data directory and store files exist on module load */
function ensureOutreachStores(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  for (const filePath of Object.values(OUTREACH_PATHS)) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf-8');
    }
  }
}

ensureOutreachStores();

/** In-process write lock (per-file promise chain) */
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
// Internal send routing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the destination address for a contact on the given channel.
 * Throws if the contact lacks the required field for the channel.
 */
function resolveDestination(channel: OutreachChannel, contact: Contact): string {
  switch (channel) {
    case 'email': {
      if (!contact.email) {
        throw new Error(
          `Contact "${contact.id}" (${contact.name}) has no email address for email outreach.`
        );
      }
      return contact.email;
    }
    case 'telegram': {
      // telegramChatId is stored in notes as "telegramChatId:<id>" or as a custom field
      // We look for a notes annotation or fall back to a custom field convention
      const match = contact.notes?.match(/telegramChatId:\s*(\S+)/i);
      if (match) return match[1];
      throw new Error(
        `Contact "${contact.id}" (${contact.name}) has no Telegram chat ID. ` +
        'Set it in notes as "telegramChatId: <chatId>".'
      );
    }
    case 'whatsapp': {
      if (!contact.phone) {
        throw new Error(
          `Contact "${contact.id}" (${contact.name}) has no phone number for WhatsApp outreach.`
        );
      }
      return contact.phone;
    }
    case 'sms': {
      if (!contact.phone) {
        throw new Error(
          `Contact "${contact.id}" (${contact.name}) has no phone number for SMS outreach.`
        );
      }
      return contact.phone;
    }
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unsupported outreach channel: ${_exhaustive}`);
    }
  }
}

/**
 * Dispatch the message to the correct provider and return the external ID.
 * Throws on provider errors (caller should catch and mark status='failed').
 */
async function dispatchMessage(
  channel: OutreachChannel,
  to: string,
  message: { subject?: string; body: string; htmlBody?: string }
): Promise<string> {
  switch (channel) {
    case 'email': {
      const result = await sendEmail(
        to,
        message.subject ?? '(No subject)',
        message.htmlBody ?? `<p>${message.body}</p>`,
        message.body
      );
      return result.messageId;
    }

    case 'telegram': {
      const result = await sendTelegramMessage(to, message.body, 'HTML');
      return String(result.messageId);
    }

    case 'whatsapp': {
      const result = await sendWhatsAppText(to, message.body);
      return result.messageId;
    }

    case 'sms': {
      // SMS channel reserved for future implementation.
      // Throw a clear "not implemented" error rather than silently failing.
      throw new Error(
        'SMS channel is not yet implemented. Use email, telegram, or whatsapp.'
      );
    }

    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unsupported outreach channel: ${_exhaustive}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Single send
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a single outreach message to one contact via the specified channel.
 *
 * The message is persisted to outreach-messages.json regardless of success or
 * failure, with status set to 'sent' or 'failed' accordingly.
 *
 * @param channel - Delivery channel ('email' | 'telegram' | 'whatsapp' | 'sms')
 * @param contact - The target Contact record
 * @param message - Message content: subject (optional), body, and htmlBody (optional)
 * @param brand   - Brand ID string
 * @returns The persisted OutreachMessage record
 *
 * @example
 * const msg = await sendOutreach('email', contact, {
 *   subject: 'Hello!',
 *   body: 'Thanks for signing up.',
 *   htmlBody: '<p>Thanks for signing up.</p>',
 * }, 'datamug');
 */
export async function sendOutreach(
  channel: OutreachChannel,
  contact: Contact,
  message: { subject?: string; body: string; htmlBody?: string },
  brand: string
): Promise<OutreachMessage> {
  const now = new Date().toISOString();

  // Build a pending outreach record
  const outreachMessage: OutreachMessage = {
    id: randomUUID(),
    channel,
    contactId: contact.id,
    to: '',
    subject: message.subject,
    body: message.body,
    htmlBody: message.htmlBody,
    status: 'queued',
    brand: brand as OutreachMessage['brand'],
    createdAt: now,
  };

  try {
    // Resolve destination (may throw if contact lacks the required field)
    const to = resolveDestination(channel, contact);
    outreachMessage.to = to;

    // Dispatch to provider
    const externalId = await dispatchMessage(channel, to, message);

    outreachMessage.externalId = externalId;
    outreachMessage.status = 'sent';
    outreachMessage.sentAt = new Date().toISOString();
  } catch (err) {
    outreachMessage.status = 'failed';
    outreachMessage.error = err instanceof Error ? err.message : String(err);
    console.error(
      `[outreach-service] Failed to send ${channel} message to contact ${contact.id}:`,
      err
    );
  }

  // Persist regardless of success/failure
  const messages = readStore<OutreachMessage>(OUTREACH_PATHS.messages);
  messages.push(outreachMessage);
  await writeStore(OUTREACH_PATHS.messages, messages);

  return outreachMessage;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Campaign execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute a campaign by sending to every contact in the provided array.
 *
 * Updates the campaign's counters (sentCount, failedCount) and sets the
 * status to 'completed' when all sends are attempted (even if some failed).
 * Sets status to 'failed' only if the campaign itself throws before any
 * messages are sent.
 *
 * @param campaign - The OutreachCampaign to run
 * @param contacts - Pre-filtered list of target contacts
 * @returns Summary: { sent, failed }
 *
 * @example
 * const { sent, failed } = await runOutreachCampaign(campaign, contacts);
 */
export async function runOutreachCampaign(
  campaign: OutreachCampaign,
  contacts: Contact[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Mark campaign as running
  await updateCampaignRecord(campaign.id, {
    status: 'running',
    totalRecipients: contacts.length,
  });

  for (const contact of contacts) {
    try {
      const result = await sendOutreach(
        campaign.channel,
        contact,
        {
          subject: campaign.subject,
          body: campaign.body,
          htmlBody: campaign.htmlBody,
        },
        campaign.brand
      );

      if (result.status === 'sent') {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // Mark campaign completed and update counters
  await updateCampaignRecord(campaign.id, {
    status: 'completed',
    sentCount: (campaign.sentCount ?? 0) + sent,
    failedCount: (campaign.failedCount ?? 0) + failed,
  });

  return { sent, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Query helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve outreach messages, optionally filtered by channel, brand, or contactId.
 *
 * @param filters - Optional filter object
 * @returns Array of OutreachMessage records, newest first
 *
 * @example
 * const emailMessages = await getOutreachMessages({ channel: 'email', brand: 'datamug' });
 */
export async function getOutreachMessages(filters?: {
  channel?: OutreachChannel;
  brand?: string;
  contactId?: string;
}): Promise<OutreachMessage[]> {
  let messages = readStore<OutreachMessage>(OUTREACH_PATHS.messages);

  if (filters?.channel) {
    messages = messages.filter((m) => m.channel === filters.channel);
  }
  if (filters?.brand) {
    messages = messages.filter((m) => m.brand === filters.brand);
  }
  if (filters?.contactId) {
    messages = messages.filter((m) => m.contactId === filters.contactId);
  }

  // Return newest first
  return messages.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Retrieve all outreach campaigns.
 *
 * @returns Array of OutreachCampaign records, newest first
 *
 * @example
 * const campaigns = await getOutreachCampaigns();
 */
export async function getOutreachCampaigns(): Promise<OutreachCampaign[]> {
  const campaigns = readStore<OutreachCampaign>(OUTREACH_PATHS.campaigns);
  return campaigns.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Retrieve a single outreach campaign by ID.
 *
 * @param id - OutreachCampaign UUID
 * @returns The campaign, or null if not found
 */
export async function getOutreachCampaignById(
  id: string
): Promise<OutreachCampaign | null> {
  const campaigns = readStore<OutreachCampaign>(OUTREACH_PATHS.campaigns);
  return campaigns.find((c) => c.id === id) ?? null;
}

/**
 * Create a new outreach campaign (persists to store).
 *
 * @param data - Campaign fields (id, createdAt, updatedAt, counters are auto-generated)
 * @returns The newly created OutreachCampaign
 */
export async function createOutreachCampaign(
  data: Omit<OutreachCampaign, 'id' | 'createdAt' | 'updatedAt' | 'sentCount' | 'deliveredCount' | 'failedCount' | 'totalRecipients'>
): Promise<OutreachCampaign> {
  const now = new Date().toISOString();
  const campaign: OutreachCampaign = {
    ...data,
    id: randomUUID(),
    totalRecipients: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const campaigns = readStore<OutreachCampaign>(OUTREACH_PATHS.campaigns);
  campaigns.push(campaign);
  await writeStore(OUTREACH_PATHS.campaigns, campaigns);
  return campaign;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — Campaign mutation helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update fields on an outreach campaign record in the store.
 * Used internally by runOutreachCampaign.
 */
async function updateCampaignRecord(
  id: string,
  updates: Partial<Omit<OutreachCampaign, 'id' | 'createdAt'>>
): Promise<OutreachCampaign | null> {
  const campaigns = readStore<OutreachCampaign>(OUTREACH_PATHS.campaigns);
  const idx = campaigns.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  campaigns[idx] = {
    ...campaigns[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeStore(OUTREACH_PATHS.campaigns, campaigns);
  return campaigns[idx];
}

/**
 * Public wrapper for updating campaign records (used by API routes).
 *
 * @param id      - OutreachCampaign UUID
 * @param updates - Partial campaign fields to update
 * @returns The updated campaign, or null if not found
 */
export async function updateOutreachCampaign(
  id: string,
  updates: Partial<Omit<OutreachCampaign, 'id' | 'createdAt'>>
): Promise<OutreachCampaign | null> {
  return updateCampaignRecord(id, updates);
}

/**
 * Helper to resolve contacts for a campaign based on its targetTags /
 * targetStages filters.  Used by the campaign API route.
 *
 * @param campaign - Campaign with filter criteria
 * @returns Filtered array of contacts to target
 */
export async function resolveCampaignContacts(
  campaign: Pick<OutreachCampaign, 'brand' | 'targetTags' | 'targetStages'>
): Promise<Contact[]> {
  let contacts = await getContacts({ brand: campaign.brand });

  if (campaign.targetTags && campaign.targetTags.length > 0) {
    contacts = contacts.filter((c) =>
      campaign.targetTags.some((tag) => c.tags.includes(tag))
    );
  }

  if (campaign.targetStages && campaign.targetStages.length > 0) {
    contacts = contacts.filter((c) =>
      campaign.targetStages.includes(c.stage)
    );
  }

  return contacts;
}
