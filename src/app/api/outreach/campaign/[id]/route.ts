/**
 * @fileoverview GET|POST /api/outreach/campaign/[id]
 *
 * GET  — Fetch details and per-message stats for a single outreach campaign.
 *
 * POST — Execute (run) a campaign that is currently in 'draft' status.
 *        Already running or completed campaigns will return a 409 conflict.
 *
 * @module api/outreach/campaign/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getOutreachCampaignById,
  runOutreachCampaign,
  resolveCampaignContacts,
} from '@/lib/outreach-service';

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

// ── GET — campaign detail ─────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await getOutreachCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: `Campaign not found: ${id}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Attach message-level breakdown for this campaign.
    // OutreachMessages don't have a campaignId FK, so we cannot filter directly.
    // Return the campaign data as-is; counters are maintained on the campaign record.
    return NextResponse.json(
      { campaign },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[GET /api/outreach/campaign/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve campaign.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — execute campaign ───────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await getOutreachCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: `Campaign not found: ${id}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Only draft campaigns can be run via this endpoint
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        {
          error: `Campaign is not in draft status (current status: "${campaign.status}"). ` +
            'Only draft campaigns can be executed via this endpoint.',
        },
        { status: 409, headers: CORS_HEADERS }
      );
    }

    // Resolve target contacts using the campaign's filter criteria
    const contacts = await resolveCampaignContacts(campaign);

    if (contacts.length === 0) {
      return NextResponse.json(
        {
          error: 'No contacts matched the campaign targeting criteria.',
          campaign,
        },
        { status: 422, headers: CORS_HEADERS }
      );
    }

    // Execute the campaign
    const result = await runOutreachCampaign(campaign, contacts);

    // Fetch the updated campaign record
    const updatedCampaign = await getOutreachCampaignById(id);

    return NextResponse.json(
      {
        campaign: updatedCampaign,
        result,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[POST /api/outreach/campaign/[id]] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to run campaign.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}


