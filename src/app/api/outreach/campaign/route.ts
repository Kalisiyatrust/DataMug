/**
 * @fileoverview GET|POST /api/outreach/campaign
 *
 * GET  — List all outreach campaigns (newest first).
 *
 * POST — Create a new outreach campaign, optionally running it immediately.
 *
 * POST request body (JSON):
 * ```json
 * {
 *   "name":          "Spring Email Blast",
 *   "channel":       "email",
 *   "brand":         "datamug",
 *   "subject":       "Optional subject (email only)",
 *   "body":          "Plain-text message body",
 *   "htmlBody":      "<p>Optional HTML body</p>",
 *   "targetTags":    ["enterprise", "trial"],
 *   "targetStages":  ["new", "contacted"],
 *   "autoRun":       true
 * }
 * ```
 *
 * @module api/outreach/campaign
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOutreachCampaigns,
  createOutreachCampaign,
  runOutreachCampaign,
  resolveCampaignContacts,
} from '@/lib/outreach-service';
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

// ── GET — list campaigns ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const campaigns = await getOutreachCampaigns();
    return NextResponse.json({ campaigns }, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    console.error('[GET /api/outreach/campaign] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve campaigns.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — create campaign ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Parse body ──────────────────────────────────────────────────────────
    let body: {
      name?: string;
      channel?: string;
      brand?: string;
      subject?: string;
      body?: string;
      htmlBody?: string;
      targetTags?: string[];
      targetStages?: string[];
      autoRun?: boolean;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const {
      name,
      channel,
      brand,
      subject,
      body: messageBody,
      htmlBody,
      targetTags = [],
      targetStages = [],
      autoRun = false,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const validChannels: OutreachChannel[] = ['email', 'telegram', 'whatsapp', 'sms'];
    if (!channel || !validChannels.includes(channel as OutreachChannel)) {
      return NextResponse.json(
        { error: `Missing or invalid channel. Must be one of: ${validChannels.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const validBrands = ['datamug', 'kalisiya', 'eloi'];
    if (!brand || !validBrands.includes(brand)) {
      return NextResponse.json(
        { error: `Missing or invalid brand. Must be one of: ${validBrands.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: 'Missing required field: body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Create campaign ─────────────────────────────────────────────────────
    const campaign = await createOutreachCampaign({
      name,
      channel: channel as OutreachChannel,
      brand: brand as 'datamug' | 'kalisiya' | 'eloi',
      subject,
      body: messageBody,
      htmlBody,
      status: autoRun ? 'running' : 'draft',
      targetTags,
      targetStages,
    });

    // ── Auto-run if requested ───────────────────────────────────────────────
    let runResult: { sent: number; failed: number } | undefined;

    if (autoRun) {
      const contacts = await resolveCampaignContacts(campaign);
      runResult = await runOutreachCampaign(campaign, contacts);
    }

    return NextResponse.json(
      { campaign, runResult },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[POST /api/outreach/campaign] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
