/**
 * @fileoverview GET|POST /api/whatsapp/campaigns
 *
 * GET  — List all campaigns with optional filters.
 *   Query params:
 *     brand   — filter by brand ID
 *     status  — filter by campaign status (draft | scheduled | running | paused | completed)
 *
 *   Response: { campaigns: Campaign[] }
 *
 * POST — Create a new campaign in 'draft' status.
 *   Body (JSON):
 *     {
 *       name: string,
 *       brand: string,
 *       templateId: string,
 *       targetTags: string[],        // empty = all contacts for brand
 *       targetStages: string[],      // empty = all stages
 *       scheduledAt?: string         // ISO 8601 — omit to leave as draft
 *     }
 *   Response: 201 { campaign: Campaign }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns } from '@/lib/crm-store';
import { createCampaign } from '@/lib/campaign-engine';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig, Campaign, Contact } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_BRAND_IDS = BRANDS.map((b) => b.id) as string[];
const VALID_STATUSES: Campaign['status'][] = ['draft', 'scheduled', 'running', 'paused', 'completed'];
const VALID_STAGES: Contact['stage'][] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — list campaigns ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const brand  = searchParams.get('brand')  ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    if (brand && !VALID_BRAND_IDS.includes(brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (status && !VALID_STATUSES.includes(status as Campaign['status'])) {
      return NextResponse.json(
        { error: `Invalid status "${status}". Valid values: ${VALID_STATUSES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const campaigns = await getCampaigns({
      brand: brand as BrandConfig['id'] | undefined,
      status: status as Campaign['status'] | undefined,
    });

    return NextResponse.json(
      { campaigns },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[campaigns GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — create campaign ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
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

    // ── Required field validation ─────────────────────────────────────────────
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return NextResponse.json(
        { error: 'name is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!data.brand || typeof data.brand !== 'string') {
      return NextResponse.json(
        { error: 'brand is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!VALID_BRAND_IDS.includes(data.brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${data.brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!data.templateId || typeof data.templateId !== 'string' || !data.templateId.trim()) {
      return NextResponse.json(
        { error: 'templateId is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Optional arrays ───────────────────────────────────────────────────────
    const targetTags: string[] = Array.isArray(data.targetTags)
      ? (data.targetTags as unknown[]).filter((t) => typeof t === 'string') as string[]
      : [];

    const targetStages: Contact['stage'][] = Array.isArray(data.targetStages)
      ? (data.targetStages as unknown[]).filter((s) =>
          typeof s === 'string' && VALID_STAGES.includes(s as Contact['stage'])
        ) as Contact['stage'][]
      : [];

    // ── Optional scheduledAt ──────────────────────────────────────────────────
    let scheduledAt: string | undefined;
    if (data.scheduledAt !== undefined && data.scheduledAt !== null) {
      if (typeof data.scheduledAt !== 'string' || isNaN(Date.parse(data.scheduledAt))) {
        return NextResponse.json(
          { error: 'scheduledAt must be a valid ISO 8601 date string.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      scheduledAt = data.scheduledAt;
    }

    // ── Create via campaign-engine (sets status to 'draft') ───────────────────
    const campaign = await createCampaign({
      name: data.name.trim(),
      brand: data.brand as BrandConfig['id'],
      templateId: data.templateId.trim(),
      targetTags,
      targetStages,
      scheduledAt,
    });

    return NextResponse.json(
      { campaign },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[campaigns POST] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to create campaign.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
