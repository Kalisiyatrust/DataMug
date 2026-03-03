/**
 * @fileoverview POST /api/outreach/send
 *
 * Send a single outreach message to one contact via the specified channel.
 *
 * Request body (JSON):
 * ```json
 * {
 *   "channel":   "email" | "telegram" | "whatsapp" | "sms",
 *   "contactId": "<uuid>",
 *   "subject":   "Optional email subject",
 *   "body":      "Plain-text message body",
 *   "htmlBody":  "<p>Optional HTML body (email only)</p>",
 *   "brand":     "datamug" | "kalisiya" | "eloi"
 * }
 * ```
 *
 * Response (200):
 * ```json
 * { "message": <OutreachMessage> }
 * ```
 *
 * @module api/outreach/send
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContactById } from '@/lib/crm-store';
import { sendOutreach } from '@/lib/outreach-service';
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

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Parse and validate request body ────────────────────────────────────
    let body: {
      channel?: string;
      contactId?: string;
      subject?: string;
      body?: string;
      htmlBody?: string;
      brand?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { channel, contactId, subject, body: messageBody, htmlBody, brand } = body;

    // Required fields validation
    if (!channel) {
      return NextResponse.json(
        { error: 'Missing required field: channel.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const validChannels: OutreachChannel[] = ['email', 'telegram', 'whatsapp', 'sms'];
    if (!validChannels.includes(channel as OutreachChannel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!contactId) {
      return NextResponse.json(
        { error: 'Missing required field: contactId.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: 'Missing required field: body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!brand) {
      return NextResponse.json(
        { error: 'Missing required field: brand.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Resolve contact ─────────────────────────────────────────────────────
    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json(
        { error: `Contact not found: ${contactId}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // ── Send outreach ───────────────────────────────────────────────────────
    const message = await sendOutreach(
      channel as OutreachChannel,
      contact,
      { subject, body: messageBody, htmlBody },
      brand
    );

    return NextResponse.json(
      { message },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[POST /api/outreach/send] Unhandled error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
