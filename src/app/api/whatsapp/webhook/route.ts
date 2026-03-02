/**
 * @fileoverview POST /api/whatsapp/webhook
 *
 * Twilio inbound message webhook. Called by Twilio whenever a WhatsApp
 * message is received on any of the three brand numbers.
 *
 * Flow:
 * 1. Validate X-Twilio-Signature to reject spoofed requests.
 * 2. Parse the URL-encoded form body that Twilio sends.
 * 3. Determine which brand owns the "To" number.
 * 4. Look up or create the contact in the CRM.
 * 5. Detect opt-out intent → send confirmation + mark contact 'lost'.
 * 6. Otherwise → generate an AI reply and send it via the Twilio API.
 * 7. Persist both the inbound message and the outbound reply.
 * 8. Update lead score (+10 for message_received, +20 if replied).
 * 9. Return empty TwiML so Twilio doesn't double-send a reply.
 *
 * GET /api/whatsapp/webhook
 * Simple health/verification endpoint — returns 200 with a plain-text body.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateWebhook, sendWhatsAppMessage } from '@/lib/twilio-client';
import { getBrandByNumber } from '@/lib/brands';
import {
  getContactByPhone,
  createContact,
  addMessage,
  getMessages,
  applyLeadScore,
  updateContact,
} from '@/lib/crm-store';
import { generateResponse, isOptOut, getOptOutResponse } from '@/lib/ai-responder';

// ── CORS headers for dashboard requests ─────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── OPTIONS preflight ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — health check ───────────────────────────────────────────────────────

export async function GET() {
  return new NextResponse('WhatsApp webhook active', {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
  });
}

// ── POST — inbound message handler ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate Twilio signature ─────────────────────────────────────────
    // Skip validation in development when TWILIO_AUTH_TOKEN is not set.
    const skipValidation = !process.env.TWILIO_AUTH_TOKEN;
    if (!skipValidation) {
      const isValid = await validateWebhook(req.clone() as Request);
      if (!isValid) {
        console.warn('[webhook] Invalid Twilio signature — request rejected.');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 403, headers: CORS_HEADERS }
        );
      }
    }

    // ── 2. Parse Twilio's URL-encoded form body ───────────────────────────────
    let params: URLSearchParams;
    try {
      const body = await req.text();
      params = new URLSearchParams(body);
    } catch {
      // Malformed body — return empty TwiML and move on
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
      });
    }

    const fromRaw  = params.get('From') ?? '';         // "whatsapp:+919876543210"
    const toRaw    = params.get('To') ?? '';            // "whatsapp:+917794911850"
    const body     = params.get('Body') ?? '';
    const sid      = params.get('MessageSid') ?? '';
    const mediaUrl = params.get('MediaUrl0') ?? undefined;

    // Strip "whatsapp:" prefix
    const fromPhone = fromRaw.replace(/^whatsapp:/i, '');
    const toPhone   = toRaw.replace(/^whatsapp:/i, '');

    if (!fromPhone || !body.trim()) {
      // Nothing actionable — return empty TwiML
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
      });
    }

    // ── 3. Determine brand from the "To" number ───────────────────────────────
    const brand = getBrandByNumber(toPhone);
    if (!brand) {
      console.warn(`[webhook] Unknown brand number: ${toPhone}`);
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
      });
    }

    // ── 4. Look up or create contact ──────────────────────────────────────────
    let contact = await getContactByPhone(fromPhone, brand.id);
    if (!contact) {
      contact = await createContact({
        phone: fromPhone,
        name: fromPhone,           // Will be enriched later if known
        brand: brand.id,
        tags: [],
        leadScore: 0,
        stage: 'new',
        source: 'inbound',
        notes: '',
      });
    }

    // ── 5. Persist the inbound message ────────────────────────────────────────
    await addMessage({
      contactId: contact.id,
      direction: 'inbound',
      body,
      mediaUrl,
      status: 'delivered',
      twilioSid: sid || undefined,
      brand: brand.id,
      isAiGenerated: false,
    });

    // ── 6. Update lead score (+10 for receiving a message) ────────────────────
    await applyLeadScore(contact.id, 'message_received');

    // Refresh contact after score update
    contact = (await getContactByPhone(fromPhone, brand.id)) ?? contact;

    // ── 7. Handle opt-out ─────────────────────────────────────────────────────
    if (isOptOut(body)) {
      const optOutText = getOptOutResponse(brand.id);

      try {
        const twilioResp = await sendWhatsAppMessage(fromPhone, optOutText, brand.id);
        await addMessage({
          contactId: contact.id,
          direction: 'outbound',
          body: optOutText,
          status: 'sent',
          twilioSid: twilioResp.sid,
          brand: brand.id,
          isAiGenerated: false,
        });
      } catch (sendErr) {
        console.error('[webhook] Failed to send opt-out confirmation:', sendErr);
      }

      // Mark contact as lost + unsubscribed score penalty
      await updateContact(contact.id, { stage: 'lost' });
      await applyLeadScore(contact.id, 'unsubscribed');

      // Return empty TwiML — message already sent via REST API
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
      });
    }

    // ── 8. Generate and send AI reply ─────────────────────────────────────────
    const history = await getMessages(contact.id);
    const aiReply = await generateResponse(contact, body, brand.id, history);

    try {
      const twilioResp = await sendWhatsAppMessage(fromPhone, aiReply, brand.id);

      await addMessage({
        contactId: contact.id,
        direction: 'outbound',
        body: aiReply,
        status: 'sent',
        twilioSid: twilioResp.sid,
        brand: brand.id,
        isAiGenerated: true,
      });

      // +20 for contact replying (they engaged back)
      await applyLeadScore(contact.id, 'replied');

      // Advance stage from 'new' → 'contacted' on first reply
      if (contact.stage === 'new') {
        await updateContact(contact.id, { stage: 'contacted' });
      }
    } catch (sendErr) {
      console.error('[webhook] Failed to send AI reply:', sendErr);
      // Do not crash — the inbound message is already stored
    }

    // ── 9. Return empty TwiML ─────────────────────────────────────────────────
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    // The webhook must NEVER return a 5xx to Twilio — it would retry indefinitely.
    console.error('[webhook] Unhandled error:', error);
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/xml' },
    });
  }
}
