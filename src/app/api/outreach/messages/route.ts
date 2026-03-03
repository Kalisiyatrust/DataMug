/**
 * @fileoverview GET /api/outreach/messages
 *
 * List outreach messages with optional query-string filters.
 *
 * Query parameters:
 *   channel   — Filter by channel: email | telegram | whatsapp | sms
 *   brand     — Filter by brand: datamug | kalisiya | eloi
 *   contactId — Filter by Contact UUID
 *
 * Example:
 *   GET /api/outreach/messages?channel=email&brand=datamug
 *   GET /api/outreach/messages?contactId=abc-123
 *
 * Response (200):
 * ```json
 * { "messages": <OutreachMessage[]>, "total": <number> }
 * ```
 *
 * @module api/outreach/messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOutreachMessages } from '@/lib/outreach-service';
import type { OutreachChannel } from '@/types/whatsapp';

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

// ── GET — list messages ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const channelParam = searchParams.get('channel') ?? undefined;
    const brandParam   = searchParams.get('brand')   ?? undefined;
    const contactId    = searchParams.get('contactId') ?? undefined;

    // Validate channel if provided
    const validChannels: OutreachChannel[] = ['email', 'telegram', 'whatsapp', 'sms'];
    if (channelParam && !validChannels.includes(channelParam as OutreachChannel)) {
      return NextResponse.json(
        { error: `Invalid channel filter. Must be one of: ${validChannels.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const messages = await getOutreachMessages({
      channel: channelParam as OutreachChannel | undefined,
      brand: brandParam,
      contactId,
    });

    return NextResponse.json(
      { messages, total: messages.length },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[GET /api/outreach/messages] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve outreach messages.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
