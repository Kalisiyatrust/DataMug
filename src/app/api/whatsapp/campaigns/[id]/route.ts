/**
 * @fileoverview GET|PUT|POST /api/whatsapp/campaigns/[id]
 *
 * GET  — Retrieve a single campaign with its stats.
 *   Response: { campaign: Campaign }
 *
 * PUT  — Update campaign metadata (name, scheduledAt, targetTags, targetStages).
 *   Body (JSON): Partial<{ name, scheduledAt, targetTags, targetStages }>
 *   Response: { campaign: Campaign }
 *
 * POST — Execute a lifecycle action on a campaign.
 *   Body (JSON): { action: 'execute' | 'pause' | 'resume' }
 *
 *   'execute' — Start sending (must be in draft/scheduled/paused status).
 *               Runs asynchronously; returns immediately with campaign in 'running' state.
 *   'pause'   — Pause a running campaign.
 *   'resume'  — Resume a paused campaign (alias for execute).
 *
 *   Response: { campaign: Campaign, result?: { sent, failed, skipped } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign } from '@/lib/crm-store';
import { executeCampaign, pauseCampaign } from '@/lib/campaign-engine';
import type { Campaign, Contact } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_STAGES: Contact['stage'][] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — single campaign ─────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: `Campaign "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { campaign },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[campaigns/[id] GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── PUT — update campaign ─────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await getCampaignById(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Campaign "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

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

    const data = body as Record<string, unknown>;
    const updates: Partial<Omit<Campaign, 'id' | 'createdAt'>> = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        return NextResponse.json(
          { error: 'name must be a non-empty string.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.name = data.name.trim();
    }

    if (data.scheduledAt !== undefined) {
      if (data.scheduledAt !== null) {
        if (typeof data.scheduledAt !== 'string' || isNaN(Date.parse(data.scheduledAt))) {
          return NextResponse.json(
            { error: 'scheduledAt must be a valid ISO 8601 date string or null.' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
        updates.scheduledAt = data.scheduledAt;
      } else {
        updates.scheduledAt = undefined;
      }
    }

    if (data.targetTags !== undefined) {
      if (!Array.isArray(data.targetTags)) {
        return NextResponse.json(
          { error: 'targetTags must be an array of strings.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.targetTags = (data.targetTags as unknown[]).filter(
        (t) => typeof t === 'string'
      ) as string[];
    }

    if (data.targetStages !== undefined) {
      if (!Array.isArray(data.targetStages)) {
        return NextResponse.json(
          { error: 'targetStages must be an array of stage strings.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const invalidStage = (data.targetStages as unknown[]).find(
        (s) => typeof s !== 'string' || !VALID_STAGES.includes(s as Contact['stage'])
      );
      if (invalidStage !== undefined) {
        return NextResponse.json(
          { error: `Invalid stage "${invalidStage}". Valid values: ${VALID_STAGES.join(', ')}.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.targetStages = data.targetStages as Contact['stage'][];
    }

    const updated = await updateCampaign(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: `Campaign "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { campaign: updated },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[campaigns/[id] PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — campaign action ────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await getCampaignById(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Campaign "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON with an "action" field.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const data = body as Record<string, unknown>;
    const action = data?.action;

    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'action is required. Valid values: execute, pause, resume.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    switch (action) {
      case 'execute':
      case 'resume': {
        // Execute runs asynchronously to avoid blocking the HTTP response.
        // We kick it off without awaiting so the API returns quickly.
        // Campaign status transitions to 'running' as the first thing executeCampaign does.
        executeCampaign(id).catch((err) => {
          console.error(`[campaigns/[id] action=execute] Background error for campaign ${id}:`, err);
        });

        // Re-fetch to return the (now updating) campaign object
        const refreshed = await getCampaignById(id);
        return NextResponse.json(
          { campaign: refreshed ?? existing, message: 'Campaign execution started.' },
          { status: 202, headers: CORS_HEADERS }
        );
      }

      case 'pause': {
        const paused = await pauseCampaign(id);
        if (!paused) {
          return NextResponse.json(
            { error: `Campaign "${id}" could not be paused. It may not be running.` },
            { status: 409, headers: CORS_HEADERS }
          );
        }
        return NextResponse.json(
          { campaign: paused },
          { status: 200, headers: CORS_HEADERS }
        );
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action "${action}". Valid values: execute, pause, resume.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }
  } catch (error) {
    console.error('[campaigns/[id] POST] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to perform campaign action.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
