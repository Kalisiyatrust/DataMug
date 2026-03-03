/**
 * @fileoverview POST /api/telegram/webhook
 *
 * Telegram Bot API inbound update webhook.  Telegram POSTs a JSON Update
 * object to this URL every time a user sends a message to the bot.
 *
 * Flow:
 * 1. Parse the incoming Telegram Update payload.
 * 2. Extract the chat ID, sender info, and message text.
 * 3. Look up or create the contact in the CRM (keyed by Telegram user ID
 *    embedded in the phone-like field, or by annotated notes).
 * 4. Persist the inbound message as an OutreachMessage.
 * 5. Auto-respond with a generic acknowledgement.
 * 6. Return HTTP 200 so Telegram stops retrying the update.
 *
 * GET /api/telegram/webhook
 * Health-check endpoint — confirms the webhook URL is reachable.
 *
 * To register this webhook with Telegram:
 *   POST https://api.telegram.org/bot<TOKEN>/setWebhook
 *   { "url": "https://yourapp.com/api/telegram/webhook" }
 *
 * Or use the setWebhook() function from lib/telegram-client.ts.
 *
 * @module api/telegram/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram-client';
import {
  getContactByPhone,
  createContact,
  addMessage,
  applyLeadScore,
  updateContact,
} from '@/lib/crm-store';

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

// ── GET — health check ───────────────────────────────────────────────────────

export async function GET() {
  return new NextResponse('Telegram webhook active', {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain' },
  });
}

// ── Telegram Update types (subset) ──────────────────────────────────────────

interface TelegramUpdateMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  from?: {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    first_name?: string;
    last_name?: string;
    username?: string;
    title?: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramUpdateMessage;
  edited_message?: TelegramUpdateMessage;
  channel_post?: TelegramUpdateMessage;
}

// ── POST — inbound update handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse Telegram's JSON payload ─────────────────────────────────────
    let update: TelegramUpdate;
    try {
      update = await req.json() as TelegramUpdate;
    } catch {
      // Malformed body — acknowledge with 200 to stop Telegram retrying
      console.warn('[telegram/webhook] Failed to parse update body.');
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    // ── 2. Extract the message (or edited_message) ─────────────────────────
    const incoming = update.message ?? update.edited_message ?? update.channel_post;

    if (!incoming) {
      // Non-message update (callback_query, etc.) — ignore
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    const chatId     = String(incoming.chat.id);
    const text       = incoming.text ?? incoming.caption ?? '';
    const fromUser   = incoming.from;
    const senderId   = fromUser ? String(fromUser.id) : chatId;

    // Build a display name from the available Telegram user fields
    const firstName  = fromUser?.first_name ?? incoming.chat.first_name ?? '';
    const lastName   = fromUser?.last_name  ?? incoming.chat.last_name  ?? '';
    const username   = fromUser?.username   ?? incoming.chat.username   ?? '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ') ||
      (username ? `@${username}` : `TG:${senderId}`);

    if (!text.trim()) {
      // Media-only message without a caption — acknowledge but skip CRM logic
      return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
    }

    // ── 3. Look up or create the CRM contact ──────────────────────────────
    // We use a synthetic "phone" value of `tg:<userId>` as the unique key for
    // Telegram contacts so the existing phone-keyed CRM can store them.
    const syntheticPhone = `tg:${senderId}`;
    let contact = await getContactByPhone(syntheticPhone);

    if (!contact) {
      contact = await createContact({
        phone: syntheticPhone,
        name: displayName,
        brand: 'datamug',           // Default brand; can be updated via contact edit
        tags: ['telegram'],
        leadScore: 0,
        stage: 'new',
        source: 'inbound',
        notes: `telegramChatId: ${chatId}\ntelegramUsername: ${username}`,
      });
    } else if (contact.name === syntheticPhone || contact.name.startsWith('tg:')) {
      // Enrich name if it was set to the placeholder value
      await updateContact(contact.id, { name: displayName });
      contact = { ...contact, name: displayName };
    }

    // ── 4. Persist the inbound message ────────────────────────────────────
    await addMessage({
      contactId: contact.id,
      direction: 'inbound',
      body: text,
      status: 'delivered',
      brand: contact.brand,
      isAiGenerated: false,
    });

    // ── 5. Update lead score ──────────────────────────────────────────────
    await applyLeadScore(contact.id, 'message_received');

    // Advance stage from 'new' → 'contacted' on first inbound
    if (contact.stage === 'new') {
      await updateContact(contact.id, { stage: 'contacted' });
    }

    // ── 6. Auto-reply ─────────────────────────────────────────────────────
    // Send a simple acknowledgement.  Replace with AI-generated response
    // by integrating generateResponse() from ai-responder.ts if desired.
    const autoReply =
      `Thanks for your message, ${firstName || 'there'}! ` +
      'A team member will get back to you shortly.';

    try {
      await sendTelegramMessage(chatId, autoReply);

      await addMessage({
        contactId: contact.id,
        direction: 'outbound',
        body: autoReply,
        status: 'sent',
        brand: contact.brand,
        isAiGenerated: false,
      });

      await applyLeadScore(contact.id, 'replied');
    } catch (sendErr) {
      console.error('[telegram/webhook] Failed to send auto-reply:', sendErr);
      // Do not crash — inbound message is already stored
    }

    // ── 7. Return 200 to stop Telegram retrying ──────────────────────────
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    // Webhook must NEVER return 5xx to Telegram — it would retry the update.
    console.error('[telegram/webhook] Unhandled error:', error);
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  }
}


