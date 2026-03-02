/**
 * @fileoverview WhatsApp Marketing System — Campaign & Drip Sequence Engine
 *
 * Manages the full lifecycle of bulk campaigns and automated drip sequences:
 * - Create, schedule, execute, and pause campaigns
 * - Template variable rendering ({{name}}, {{company}}, {{service}}, {{brand}})
 * - Rate-limited batch sending (1 message/second to stay within Twilio limits)
 * - Per-campaign delivery tracking via status update callbacks
 * - Drip sequence enrolment, advancement, and condition checking
 * - Pre-built starter templates for all three brands
 *
 * @module lib/campaign-engine
 */

'use server';

import { randomUUID } from 'crypto';
import type {
  Campaign,
  MessageTemplate,
  Contact,
  DripSequence,
  DripEnrollment,
  BrandConfig,
  DripStep,
} from '@/types/whatsapp';
import { getBrand } from '@/lib/brands';
import {
  getContacts,
  getCampaignById,
  updateCampaign,
  createCampaign as storeCampaign,
  addMessage,
  getTemplates,
  createTemplate,
  getEnrollments,
  enrollInSequence,
  advanceEnrollment,
  getSequences,
} from '@/lib/crm-store';
import { sendWhatsAppMessage } from '@/lib/twilio-client';

// ─────────────────────────────────────────────────────────────────────────────
// Template rendering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Variables available for template interpolation.
 * Derived from the target contact and brand at send time.
 */
export interface TemplateVars {
  name: string;
  company: string;
  service: string;
  brand: string;
  phone: string;
  [key: string]: string; // allow custom variables
}

/**
 * Replace {{placeholder}} tokens in a template body with actual values.
 * Unknown placeholders are left as-is so they surface for debugging.
 *
 * @param body - Template body string with {{tokens}}
 * @param vars - Variable map
 * @returns Rendered message string
 *
 * @example
 * renderTemplate('Hi {{name}}, welcome to {{brand}}!', { name: 'Alice', brand: 'DataMug' })
 * // → 'Hi Alice, welcome to DataMug!'
 */
export function renderTemplate(body: string, vars: Partial<TemplateVars>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value !== undefined ? value : match;
  });
}

/**
 * Build the TemplateVars object for a given contact + brand combination.
 * The `service` variable defaults to the first item in the brand's service list.
 *
 * @param contact  - Target contact
 * @param brand    - Brand configuration
 * @param extra    - Optional additional variables
 */
export function buildTemplateVars(
  contact: Contact,
  brand: BrandConfig,
  extra?: Record<string, string>
): TemplateVars {
  return {
    name: contact.name.split(' ')[0] || contact.name, // first name only
    company: contact.company || '',
    service: brand.services[0]?.split(' — ')[0] || brand.name,
    brand: brand.name,
    phone: contact.phone,
    ...extra,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign creation & scheduling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new campaign in 'draft' status.
 *
 * @param data - Campaign fields (minus auto-generated ones)
 * @returns The created Campaign record
 */
export async function createCampaign(
  data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'sentCount' | 'deliveredCount' | 'readCount' | 'repliedCount' | 'status'>
): Promise<Campaign> {
  return storeCampaign({ ...data, status: 'draft' });
}

/**
 * Mark a campaign as 'scheduled' with a future send time.
 *
 * @param campaignId  - Campaign UUID
 * @param scheduledAt - ISO 8601 datetime to begin sending
 * @returns The updated Campaign, or null if not found
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: string
): Promise<Campaign | null> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return null;
  if (!['draft', 'paused'].includes(campaign.status)) {
    throw new Error(
      `Cannot schedule campaign in status "${campaign.status}". Must be "draft" or "paused".`
    );
  }
  return updateCampaign(campaignId, { status: 'scheduled', scheduledAt });
}

/**
 * Pause a running campaign.
 *
 * @param campaignId - Campaign UUID
 * @returns Updated campaign, or null if not found
 */
export async function pauseCampaign(campaignId: string): Promise<Campaign | null> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) return null;
  if (campaign.status !== 'running') {
    throw new Error(`Campaign is not running (current status: "${campaign.status}").`);
  }
  return updateCampaign(campaignId, { status: 'paused' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaign execution
// ─────────────────────────────────────────────────────────────────────────────

/** Delay between sends to respect Twilio's rate limit (1 msg/sec) */
const SEND_DELAY_MS = 1000;

/**
 * Pause execution for a specified number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a campaign — resolve target contacts, render the template,
 * and batch-send with rate limiting.
 *
 * Sets the campaign to 'running' at the start and 'completed' when done.
 * If an error occurs mid-send, the campaign is set to 'paused' for retry.
 *
 * @param campaignId - Campaign UUID
 * @returns Summary: { sent, failed, skipped }
 */
export async function executeCampaign(
  campaignId: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error(`Campaign "${campaignId}" not found.`);

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    throw new Error(
      `Campaign "${campaignId}" cannot be executed (status: "${campaign.status}").`
    );
  }

  // Fetch template
  const templates = await getTemplates({ brand: campaign.brand });
  const template = templates.find((t) => t.id === campaign.templateId);
  if (!template) {
    throw new Error(`Template "${campaign.templateId}" not found for brand "${campaign.brand}".`);
  }

  // Resolve target contacts
  const contacts = await resolveTargetContacts(campaign);
  if (contacts.length === 0) {
    await updateCampaign(campaignId, { status: 'completed' });
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const brand = getBrand(campaign.brand);

  // Mark campaign as running
  await updateCampaign(campaignId, { status: 'running' });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const contact of contacts) {
    // Re-check campaign status before each send (allows pausing mid-run)
    const current = await getCampaignById(campaignId);
    if (current?.status === 'paused') {
      console.log(`[campaign-engine] Campaign "${campaignId}" paused at ${sent} sends.`);
      break;
    }

    try {
      const vars = buildTemplateVars(contact, brand);
      const messageBody = renderTemplate(template.body, vars);

      // Send via Twilio
      const result = await sendWhatsAppMessage(contact.phone, messageBody, campaign.brand);

      // Persist the outbound message
      await addMessage({
        contactId: contact.id,
        direction: 'outbound',
        body: messageBody,
        status: 'sent',
        twilioSid: result.sid,
        brand: campaign.brand,
        isAiGenerated: false,
      });

      // Increment campaign counter
      sent++;
      await updateCampaign(campaignId, { sentCount: (current?.sentCount ?? 0) + sent });

      // Rate limiting: wait 1 second between sends
      await sleep(SEND_DELAY_MS);
    } catch (error) {
      console.error(
        `[campaign-engine] Failed to send to ${contact.phone} (${contact.id}):`,
        error
      );
      failed++;
    }
  }

  // Mark complete if not paused
  const final = await getCampaignById(campaignId);
  if (final?.status === 'running') {
    await updateCampaign(campaignId, {
      status: 'completed',
      sentCount: sent,
    });
  }

  return { sent, failed, skipped };
}

/**
 * Resolve the list of contacts targeted by a campaign based on
 * targetTags and targetStages filters.
 *
 * @param campaign - The Campaign record
 * @returns Array of matching Contact records
 */
async function resolveTargetContacts(campaign: Campaign): Promise<Contact[]> {
  // Fetch all contacts for this brand
  const allContacts = await getContacts({ brand: campaign.brand });

  return allContacts.filter((contact) => {
    // Stage filter
    const stageMatch =
      campaign.targetStages.length === 0 ||
      campaign.targetStages.includes(contact.stage);

    // Tag filter
    const tagMatch =
      campaign.targetTags.length === 0 ||
      campaign.targetTags.some((tag) => contact.tags.includes(tag));

    return stageMatch && tagMatch;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Drip sequence execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a drip enrollment's condition is met before sending the
 * next step's message.
 *
 * @param enrollment    - The enrollment to evaluate
 * @param step          - The step whose condition to check
 * @param contactReplied - Whether the contact has replied since enrolment
 * @returns true if the step should be sent
 */
export function checkStepCondition(
  _enrollment: DripEnrollment,
  step: DripStep,
  contactReplied: boolean
): boolean {
  const condition = step.condition ?? 'any';
  switch (condition) {
    case 'any':
      return true;
    case 'no_reply':
      return !contactReplied;
    case 'replied':
      return contactReplied;
    default:
      return true;
  }
}

/**
 * Process all due drip enrollments — send pending steps and advance the sequence.
 * Should be called periodically (e.g., via a cron job or a scheduled Next.js
 * route handler).
 *
 * @returns Summary of steps processed
 */
export async function processDripQueue(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const now = new Date().toISOString();

  // Fetch all active enrollments that are due
  const enrollments = await getEnrollments({ active: true });
  const due = enrollments.filter((e) => e.nextSendAt <= now);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const enrollment of due) {
    processed++;

    try {
      const sequences = await getSequences();
      const sequence = sequences.find((s) => s.id === enrollment.sequenceId);
      if (!sequence || !sequence.isActive) {
        skipped++;
        continue;
      }

      const step = sequence.steps[enrollment.currentStepIndex];
      if (!step) {
        skipped++;
        continue;
      }

      // Fetch template
      const templates = await getTemplates({ brand: sequence.brand });
      const template = templates.find((t) => t.id === step.templateId);
      if (!template) {
        console.warn(
          `[campaign-engine] Drip step template "${step.templateId}" not found.`
        );
        skipped++;
        continue;
      }

      // Determine if contact has replied (check inbound messages exist)
      const { getMessages } = await import('@/lib/crm-store');
      const messages = await getMessages(enrollment.contactId);
      const hasReplied = messages.some((m) => m.direction === 'inbound');

      // Check step condition
      if (!checkStepCondition(enrollment, step, hasReplied)) {
        // Condition not met — skip this step and advance
        await advanceEnrollment(enrollment.id);
        skipped++;
        continue;
      }

      // Fetch contact
      const { getContactById } = await import('@/lib/crm-store');
      const contact = await getContactById(enrollment.contactId);
      if (!contact) {
        skipped++;
        continue;
      }

      const brand = getBrand(sequence.brand);
      const vars = buildTemplateVars(contact, brand);
      const messageBody = renderTemplate(template.body, vars);

      // Send the message
      const result = await sendWhatsAppMessage(contact.phone, messageBody, sequence.brand);

      // Persist the outbound message
      await addMessage({
        contactId: contact.id,
        direction: 'outbound',
        body: messageBody,
        status: 'sent',
        twilioSid: result.sid,
        brand: sequence.brand,
        isAiGenerated: false,
      });

      // Advance enrollment to next step
      await advanceEnrollment(enrollment.id);

      sent++;
      await sleep(SEND_DELAY_MS);
    } catch (error) {
      console.error(`[campaign-engine] Drip step error for enrollment ${enrollment.id}:`, error);
      failed++;
    }
  }

  return { processed, sent, skipped, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built starter templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-built template definitions for all three brands.
 * Stored so they can be seeded into the templates store on first run.
 */
export const STARTER_TEMPLATES: Omit<MessageTemplate, 'id' | 'createdAt'>[] = [
  // ── Kalisiya Foundation ──────────────────────────────────────────────────
  {
    brand: 'kalisiya',
    category: 'welcome',
    name: 'Kalisiya — Welcome',
    body:
      'Hi {{name}}, welcome to Kalisiya Foundation! 🙏 Thank you for connecting with us. ' +
      'We plant churches, develop communities, and connect donors with high-impact projects across India. ' +
      'How can we serve you today?',
  },
  {
    brand: 'kalisiya',
    category: 'followup',
    name: 'Kalisiya — Follow-up (No Reply)',
    body:
      'Hi {{name}}, just checking in from Kalisiya Foundation. ' +
      'We\'d love to share how your support can transform lives. ' +
      'Would you be open to a quick 5-minute chat this week?',
  },
  {
    brand: 'kalisiya',
    category: 'promotion',
    name: 'Kalisiya — Giving Campaign',
    body:
      'Hi {{name}}, our year-end giving campaign is live! 🌟 ' +
      'Every ₹1,000 you give supports one family\'s community development programme for a full month. ' +
      'Tax-exempt under 80G. Would you like to contribute today?',
  },
  {
    brand: 'kalisiya',
    category: 'newsletter',
    name: 'Kalisiya — Monthly Impact Update',
    body:
      'Hi {{name}}, here\'s your Kalisiya Foundation update! This month we planted 3 new churches ' +
      'and supported 200+ families through our community programmes. ' +
      'Reply "REPORT" to receive our full impact report. God bless you!',
  },

  // ── Eloi Consulting ──────────────────────────────────────────────────────
  {
    brand: 'eloi',
    category: 'welcome',
    name: 'Eloi — Welcome (Engineering)',
    body:
      'Hi {{name}}, thanks for reaching out to Eloi Consulting. ' +
      'We specialise in Siemens Teamcenter PLM, MES implementations, and digital manufacturing transformation. ' +
      'What\'s your current challenge — PLM adoption, data migration, or something else?',
  },
  {
    brand: 'eloi',
    category: 'followup',
    name: 'Eloi — Follow-up (Discovery)',
    body:
      'Hi {{name}}, this is a quick follow-up from Eloi Consulting. ' +
      'Many of our clients at {{company}} face similar challenges with BOM management and PLM adoption. ' +
      'Can I schedule a 30-minute discovery call to understand your environment better?',
  },
  {
    brand: 'eloi',
    category: 'promotion',
    name: 'Eloi — Free PLM Health Check',
    body:
      'Hi {{name}}, Eloi Consulting is offering complimentary PLM health checks this quarter. ' +
      'In 90 minutes we assess your Teamcenter environment and provide a prioritised improvement roadmap — ' +
      'at no cost. Interested?',
  },
  {
    brand: 'eloi',
    category: 'newsletter',
    name: 'Eloi — Industry Insight',
    body:
      'Hi {{name}}, Eloi Consulting\'s latest insight: manufacturers who modernise their PLM-MES integration ' +
      'reduce time-to-market by an average of 23%. ' +
      'Would a brief case study from the automotive sector be useful for your team?',
  },

  // ── DataMug ──────────────────────────────────────────────────────────────
  {
    brand: 'datamug',
    category: 'welcome',
    name: 'DataMug — Welcome (AI)',
    body:
      'Hi {{name}}, welcome to DataMug! 👁️ ' +
      'We make computer vision AI that runs 100% on your hardware — no cloud, no data leaks. ' +
      'Are you working on image analysis, document OCR, or visual inspection?',
  },
  {
    brand: 'datamug',
    category: 'followup',
    name: 'DataMug — Follow-up (Demo Offer)',
    body:
      'Hi {{name}}, following up from DataMug. ' +
      'I\'d love to show you how we extract structured data from documents in under a second ' +
      'using only local compute. Up for a 15-minute live demo?',
  },
  {
    brand: 'datamug',
    category: 'promotion',
    name: 'DataMug — Free POC',
    body:
      'Hi {{name}}, DataMug is running a free proof-of-concept programme this month. ' +
      'Send us 20 sample images from your use case and we\'ll return labelled results + accuracy metrics — ' +
      'no strings attached. Want in?',
  },
  {
    brand: 'datamug',
    category: 'newsletter',
    name: 'DataMug — Product Update',
    body:
      'Hi {{name}}, DataMug update: we just released multi-image batch processing and improved OCR accuracy by 18% ' +
      'on handwritten forms. Full changelog at https://datamug.ai/changelog. ' +
      'Any questions or feature requests?',
  },
];

/**
 * Seed the templates store with pre-built starter templates if it is empty
 * or if specific brand templates are missing.
 *
 * Safe to call on every server startup — it checks before inserting.
 *
 * @param brand - Optional: only seed templates for this brand
 * @returns Number of templates inserted
 */
export async function seedStarterTemplates(brand?: BrandConfig['id']): Promise<number> {
  const existing = await getTemplates(brand ? { brand } : undefined);
  const existingNames = new Set(existing.map((t) => `${t.brand}::${t.name}`));

  const toInsert = STARTER_TEMPLATES.filter((t) => {
    if (brand && t.brand !== brand) return false;
    return !existingNames.has(`${t.brand}::${t.name}`);
  });

  for (const template of toInsert) {
    await createTemplate(template);
  }

  return toInsert.length;
}

/**
 * Create a pre-configured drip sequence for a brand with sensible defaults.
 * Returns the created sequence.
 *
 * @param brand  - Which brand to create the sequence for
 * @param name   - Human-readable sequence name
 * @param steps  - Array of step definitions
 */
export async function createDripSequence(
  brand: BrandConfig['id'],
  name: string,
  steps: Omit<DripStep, 'id'>[]
): Promise<DripSequence> {
  const { createSequence } = await import('@/lib/crm-store');

  const stepsWithIds: DripStep[] = steps.map((s) => ({
    ...s,
    id: randomUUID(),
  }));

  return createSequence({
    name,
    brand,
    steps: stepsWithIds,
    isActive: true,
  });
}

/**
 * Enrol a contact in a drip sequence by name (convenience wrapper).
 * If no sequence with that name exists for the brand, throws an error.
 *
 * @param contactId    - Contact UUID
 * @param sequenceName - Exact sequence name to look up
 * @param brand        - Brand scope
 */
export async function enrollContactInSequence(
  contactId: string,
  sequenceName: string,
  brand: BrandConfig['id']
): Promise<DripEnrollment> {
  const sequences = await getSequences(brand);
  const sequence = sequences.find((s) => s.name === sequenceName && s.isActive);

  if (!sequence) {
    throw new Error(
      `No active drip sequence named "${sequenceName}" found for brand "${brand}".`
    );
  }

  return enrollInSequence(sequence.id, contactId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery tracking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle a Twilio status callback and update campaign delivery counters.
 * Should be called from the /api/whatsapp/status webhook route.
 *
 * @param twilioSid     - The Message SID from the callback
 * @param twilioStatus  - The new status string from Twilio
 */
export async function handleDeliveryCallback(
  twilioSid: string,
  twilioStatus: string
): Promise<void> {
  const { getMessageByTwilioSid, updateMessageStatus, getCampaigns } =
    await import('@/lib/crm-store');

  // Normalise Twilio status to our internal Message.status type
  type MsgStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  const statusMap: Record<string, MsgStatus> = {
    queued: 'queued',
    sending: 'sent',
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
    undelivered: 'failed',
  };
  const normalised: MsgStatus = statusMap[twilioStatus.toLowerCase()] ?? 'sent';

  await updateMessageStatus(twilioSid, normalised);

  // Find any running campaign and update its delivery counters
  if (normalised === 'delivered' || normalised === 'read') {
    const message = await getMessageByTwilioSid(twilioSid);
    if (!message) return;

    const campaigns = await getCampaigns({ brand: message.brand, status: 'running' });
    for (const campaign of campaigns) {
      if (normalised === 'delivered') {
        await updateCampaign(campaign.id, {
          deliveredCount: campaign.deliveredCount + 1,
        });
      } else if (normalised === 'read') {
        await updateCampaign(campaign.id, {
          readCount: campaign.readCount + 1,
        });
      }
    }
  }
}
