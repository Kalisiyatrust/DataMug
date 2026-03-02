/**
 * @fileoverview POST /api/whatsapp/status
 *
 * Twilio delivery status callback. Twilio calls this URL whenever the
 * delivery status of an outbound message changes (sent → delivered → read,
 * or failed/undelivered).
 *
 * The StatusCallback URL must be configured in Twilio's console or passed
 * as the `StatusCallback` parameter when sending messages (see twilio-client.ts).
 *
 * Twilio sends URL-encoded form data with at minimum:
 *   MessageSid    — the Twilio Message SID
 *   MessageStatus — the new status string
 *
 * Flow:
 * 1. Parse MessageSid and MessageStatus from the request body.
 * 2. Look up the message in the CRM by Twilio SID.
 * 3. Update the message status.
 * 4. If the status is 'delivered' or 'read', increment the matching
 *    running campaign's counters via handleDeliveryCallback.
 * 5. Return 200 (Twilio expects a 2xx response; non-2xx triggers retries).
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleDeliveryCallback } from '@/lib/campaign-engine';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── POST — delivery status callback ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Twilio MUST receive a 2xx or it will retry — never return 4xx/5xx here.
  try {
    // ── Parse form body ───────────────────────────────────────────────────────
    let messageSid: string | null = null;
    let messageStatus: string | null = null;

    const contentType = req.headers.get('Content-Type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      try {
        const text = await req.text();
        const params = new URLSearchParams(text);
        messageSid    = params.get('MessageSid');
        messageStatus = params.get('MessageStatus');
      } catch {
        console.warn('[status] Failed to parse URL-encoded body.');
      }
    } else if (contentType.includes('application/json')) {
      try {
        const json = await req.json() as Record<string, unknown>;
        messageSid    = typeof json.MessageSid    === 'string' ? json.MessageSid    : null;
        messageStatus = typeof json.MessageStatus === 'string' ? json.MessageStatus : null;
      } catch {
        console.warn('[status] Failed to parse JSON body.');
      }
    }

    if (!messageSid || !messageStatus) {
      // Missing required fields — log and return 200 to prevent Twilio retries
      console.warn('[status] Callback missing MessageSid or MessageStatus. Body skipped.');
      return new NextResponse('OK', { status: 200, headers: CORS_HEADERS });
    }

    // ── Update message + campaign counters ────────────────────────────────────
    await handleDeliveryCallback(messageSid, messageStatus);

    return new NextResponse('OK', { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    // Log but swallow — never return 5xx to Twilio
    console.error('[status] Unhandled error in status callback:', error);
    return new NextResponse('OK', { status: 200, headers: CORS_HEADERS });
  }
}
