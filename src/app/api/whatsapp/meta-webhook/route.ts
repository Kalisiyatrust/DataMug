/**
 * @fileoverview GET|POST /api/whatsapp/meta-webhook
 *
 * Meta WhatsApp Cloud API webhook handler.
 *
 * GET — Webhook verification (required by Meta during webhook registration).
 *       Meta sends three query parameters:
 *         hub.mode      — always "subscribe"
 *         hub.challenge — a random number that must be echoed back
 *         hub.verify_token — must match META_WHATSAPP_VERIFY_TOKEN env var
 *
 * POST — Inbound WhatsApp message events from Meta's Cloud API.
 *
 * Flow (POST):
 * 1. Parse the Meta webhook payload (application/json).
 * 2. Iterate over each entry → each change → each message.
 * 3. For each inbound text message:
 *    a. Look up or create the CRM contact by phone number.
 *    b. Persist the inbound message.
 *    c. Send an auto-acknowledgement reply via sendWhatsAppText().
 *    d. Persist the outbound reply.
 *    e. Update lead score.
 * 4. Return HTTP 200 immediately (Meta expects a fast acknowledgement).
 *
 * @module api/whatsapp/meta-webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppText, getWebhookVerifyToken } from '@/lib/meta-whatsapp-client';
import {
  getContactByPhone,
  createContact,
  addMessage,
  applyLeadScore,
  updateContact,
} from '@/lib/crm-store';
import { detectBrandFromMessage } from '@/lib/brands';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── OPTIONS preflight ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — webhook verification challenge ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const mode      = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const token     = searchParams.get('hub.verify_token');

  // Health-check when called without the verification parameters
  if (!mode && !challenge && !token) {
    return new NextResponse('Meta WhatsApp webhook active', {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  }

  const verifyToken = getWebhookVerifyToken();

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[meta-webhook] Webhook verified successfully.');
    // Meta requires the challenge be echoed as plain text with status 200
    return new NextResponse(challenge ?? '', {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[meta-webhook] Webhook verification failed.', { mode, token });
  return new NextResponse('Forbidden', {
    status: 403,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
  });
}

// ── Meta payload types (subset) ──────────────────────────────────────────────

interface MetaTextMessage {
  from: string;              // Sender's WhatsApp phone number (E.164 without +)
  id: string;                // Meta message ID (wamid.xxx)
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'order' | 'unknown';
  text?: { body: string };
  image?: { caption?: string; mime_type?: string; sha256?: string; id?: string };
}

interface MetaWebhookContact {
  profile: { name: string };
  wa_id: string;
}

interface MetaChangeValue {
  messaging_product: 'whatsapp';
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: MetaWebhookContact[];
  messages?: MetaTextMessage[];
  statuses?: Array<{
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
  }>;
}

interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: MetaChangeValue;
      field: string;
    }>;
  }>;
}

// ── POST — inbound message handler ───────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse the JSON payload ──────────────────────────────────────────
    let payload: MetaWebhookPayload;
    try {
      payload = await req.json() as MetaWebhookPayload;
    } catch {
      console.warn('[meta-webhook] Failed to parse JSON payload.');
      // Acknowledge immediately — malformed payloads should not cause retries
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    // ── 2. Validate it is a WhatsApp Business Account event ───────────────
    if (payload.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    // ── 3. Process each entry and change ──────────────────────────────────
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Build a lookup map from wa_id → display name for this batch
        const contactNameMap: Record<string, string> = {};
        for (const wac of value.contacts ?? []) {
          contactNameMap[wac.wa_id] = wac.profile.name;
        }

        // ── 3a. Handle inbound messages ──────────────────────────────────
        for (const metaMsg of value.messages ?? []) {
          // Only handle text messages in this basic implementation
          if (metaMsg.type !== 'text' || !metaMsg.text?.body) {
            console.log(
              `[meta-webhook] Skipping non-text message (type=${metaMsg.type}) from ${metaMsg.from}`
            );
            continue;
          }

          const fromPhone = `+${metaMsg.from}`; // Meta omits the leading +
          const msgText   = metaMsg.text.body;
          const displayName = contactNameMap[metaMsg.from] ?? fromPhone;

          // ── 3b. Detect brand from message content ─────────────────────
          const existingContact = await getContactByPhone(fromPhone);
          const brand = existingContact
            ? existingContact.brand
            : detectBrandFromMessage(msgText).id;

          // ── 3c. Look up or create CRM contact ─────────────────────────
          let contact = await getContactByPhone(fromPhone, brand);
          if (!contact) {
            contact = await createContact({
              phone: fromPhone,
              name: displayName,
              brand,
              tags: ['meta-whatsapp'],
              leadScore: 0,
              stage: 'new',
              source: 'inbound',
              notes: `Meta WhatsApp wamid: ${metaMsg.id}`,
            });
          }

          // ── 3d. Persist inbound message ───────────────────────────────
          await addMessage({
            contactId: contact.id,
            direction: 'inbound',
            body: msgText,
            status: 'delivered',
            brand: contact.brand,
            isAiGenerated: false,
          });

          // ── 3e. Update lead score ─────────────────────────────────────
          await applyLeadScore(contact.id, 'message_received');

          // Advance stage from 'new' → 'contacted' on first inbound
          if (contact.stage === 'new') {
            await updateContact(contact.id, { stage: 'contacted' });
          }

          // ── 3f. Send auto-acknowledgement ─────────────────────────────
          const autoReply =
            `Thanks for reaching out, ${displayName}! ` +
            'A team member will respond to you shortly.';

          try {
            const sendResult = await sendWhatsAppText(fromPhone, autoReply);

            await addMessage({
              contactId: contact.id,
              direction: 'outbound',
              body: autoReply,
              status: 'sent',
              // Store the Meta wamid in the twilioSid field for reuse
              twilioSid: sendResult.messageId,
              brand: contact.brand,
              isAiGenerated: false,
            });

            await applyLeadScore(contact.id, 'replied');
          } catch (sendErr) {
            console.error(
              `[meta-webhook] Failed to send auto-reply to ${fromPhone}:`,
              sendErr
            );
          }
        }

        // ── 3b. Status update callbacks (delivered / read) ────────────────
        // Log status updates for future integration with delivery tracking.
        for (const status of value.statuses ?? []) {
          console.log(
            `[meta-webhook] Status update — message ${status.id}: ${status.status} ` +
            `(recipient: ${status.recipient_id})`
          );
          // Future: call updateMessageStatus() when wamid FKs are stored
        }
      }
    }

    // ── 4. Always return 200 — Meta retries on any non-200 ───────────────
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    // Must return 200 to prevent infinite retry loops from Meta
    console.error('[meta-webhook] Unhandled error:', error);
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  }
}
