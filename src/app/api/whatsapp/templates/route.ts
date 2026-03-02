/**
 * @fileoverview GET|POST /api/whatsapp/templates
 *
 * GET  — List message templates with optional filters.
 *   Query params:
 *     brand    — filter by brand ID (kalisiya | eloi | datamug)
 *     category — filter by category (welcome | followup | promotion | newsletter | custom)
 *
 *   Response: { templates: MessageTemplate[] }
 *
 * POST — Create a new message template.
 *   Body (JSON):
 *     {
 *       name: string,
 *       body: string,       // May include {{name}}, {{company}}, {{service}}, {{brand}} tokens
 *       brand: string,
 *       category: 'welcome' | 'followup' | 'promotion' | 'newsletter' | 'custom'
 *     }
 *   Response: 201 { template: MessageTemplate }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, createTemplate } from '@/lib/crm-store';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig, MessageTemplate } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_BRAND_IDS = BRANDS.map((b) => b.id) as string[];
const VALID_CATEGORIES: MessageTemplate['category'][] = [
  'welcome', 'followup', 'promotion', 'newsletter', 'custom',
];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — list templates ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const brand    = searchParams.get('brand')    ?? undefined;
    const category = searchParams.get('category') ?? undefined;

    if (brand && !VALID_BRAND_IDS.includes(brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category as MessageTemplate['category'])) {
      return NextResponse.json(
        { error: `Invalid category "${category}". Valid values: ${VALID_CATEGORIES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const templates = await getTemplates({
      brand: brand as BrandConfig['id'] | undefined,
      category: category as MessageTemplate['category'] | undefined,
    });

    return NextResponse.json(
      { templates },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[templates GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — create template ─────────────────────────────────────────────────────

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

    if (!data.body || typeof data.body !== 'string' || !data.body.trim()) {
      return NextResponse.json(
        { error: 'body is required.' },
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

    if (!data.category || typeof data.category !== 'string') {
      return NextResponse.json(
        { error: `category is required. Valid values: ${VALID_CATEGORIES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!VALID_CATEGORIES.includes(data.category as MessageTemplate['category'])) {
      return NextResponse.json(
        { error: `Invalid category "${data.category}". Valid values: ${VALID_CATEGORIES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Create template ───────────────────────────────────────────────────────
    const template = await createTemplate({
      name: data.name.trim(),
      body: data.body.trim(),
      brand: data.brand as BrandConfig['id'],
      category: data.category as MessageTemplate['category'],
    });

    return NextResponse.json(
      { template },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[templates POST] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to create template.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
