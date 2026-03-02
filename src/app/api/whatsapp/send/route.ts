/**
 * @fileoverview POST /api/whatsapp/send
 *
 * Manually send a WhatsApp message from the dashboard to a specific contact.
 *
 * Request body (JSON):
 *   { contactId: string, message: string, brand: string }
 *
 * Response:
 *   201 — { message: Message }  — the persisted outbound message object
 *   400 — missing/invalid input
 *   404 — contact not found
 *   500 — Twilio send failure
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio-client';
import { getContactById, addMessage } from '@/lib/crm-store';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ── OPTIONS preflight ────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── POST — manual send ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Parse + validate body ─────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { contactId, message, brand } = body as Record<string, unknown>;

    if (!contactId || typeof contactId !== 'string') {
      return NextResponse.json(
        { error: 'contactId is required and must be a string.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'message is required and must be a non-empty string.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!brand || typeof brand !== 'string') {
      return NextResponse.json(
        { error: 'brand is required and must be a string.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate brand is a known ID
    const validBrandIds = BRANDS.map((b) => b.id);
    if (!validBrandIds.includes(brand as BrandConfig['id'])) {
      return NextResponse.json(
        { error: `Unknown brand "${brand}". Valid values: ${validBrandIds.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const brandId = brand as BrandConfig['id'];

    // ── Fetch contact ─────────────────────────────────────────────────────────
    const contact = await getContactById(contactId);
    if (!contact) {
      return NextResponse.json(
        { error: `Contact "${contactId}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // ── Send via Twilio ───────────────────────────────────────────────────────
    let twilioSid: string | undefined;
    try {
      const twilioResp = await sendWhatsAppMessage(contact.phone, message.trim(), brandId);
      twilioSid = twilioResp.sid;
    } catch (twilioError) {
      const errMsg = twilioError instanceof Error ? twilioError.message : String(twilioError);
      return NextResponse.json(
        { error: `Failed to send via Twilio: ${errMsg}` },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    // ── Persist outbound message ──────────────────────────────────────────────
    const saved = await addMessage({
      contactId: contact.id,
      direction: 'outbound',
      body: message.trim(),
      status: 'sent',
      twilioSid,
      brand: brandId,
      isAiGenerated: false,
    });

    return NextResponse.json(
      { message: saved },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[send] Unhandled error:', error);
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
