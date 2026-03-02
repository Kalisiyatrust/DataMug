/**
 * @fileoverview GET|POST /api/whatsapp/contacts
 *
 * GET  — List contacts with optional filters and pagination.
 *   Query params:
 *     brand   — filter by brand ID (kalisiya | eloi | datamug)
 *     tag     — filter by a single tag
 *     stage   — filter by funnel stage
 *     search  — full-text search across name, phone, email, company
 *     page    — page number (1-based, default: 1)
 *     limit   — results per page (default: 50, max: 200)
 *
 *   Response: { contacts: Contact[], total: number, page: number, limit: number, pages: number }
 *
 * POST — Create a single contact.
 *   Body (JSON): { phone, name, brand, email?, company?, role?, tags?, notes?, stage?, source? }
 *   Response: 201 { contact: Contact }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact, getContactByPhone } from '@/lib/crm-store';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig, Contact } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_BRAND_IDS = BRANDS.map((b) => b.id) as string[];
const VALID_STAGES: Contact['stage'][] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — list contacts ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const brand  = searchParams.get('brand')  ?? undefined;
    const tag    = searchParams.get('tag')    ?? undefined;
    const stage  = searchParams.get('stage')  ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));

    // Validate brand if provided
    if (brand && !VALID_BRAND_IDS.includes(brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Validate stage if provided
    if (stage && !VALID_STAGES.includes(stage as Contact['stage'])) {
      return NextResponse.json(
        { error: `Invalid stage "${stage}". Valid values: ${VALID_STAGES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const allContacts = await getContacts({
      brand: brand as BrandConfig['id'] | undefined,
      tags: tag ? [tag] : undefined,
      stage: stage as Contact['stage'] | undefined,
      search,
    });

    // Pagination
    const total = allContacts.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const contacts = allContacts.slice(offset, offset + limit);

    return NextResponse.json(
      { contacts, total, page, limit, pages },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[contacts GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── POST — create contact ─────────────────────────────────────────────────────

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

    // ── Required fields ───────────────────────────────────────────────────────
    if (!data.phone || typeof data.phone !== 'string' || !data.phone.trim()) {
      return NextResponse.json(
        { error: 'phone is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

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

    const brandId = data.brand as BrandConfig['id'];

    // ── Duplicate check ───────────────────────────────────────────────────────
    const existing = await getContactByPhone(data.phone.trim(), brandId);
    if (existing) {
      return NextResponse.json(
        { error: `A contact with phone "${data.phone}" already exists for brand "${brandId}".`, contact: existing },
        { status: 409, headers: CORS_HEADERS }
      );
    }

    // ── Validate optional stage ───────────────────────────────────────────────
    const stage = (data.stage as Contact['stage']) ?? 'new';
    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage "${data.stage}". Valid values: ${VALID_STAGES.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Create contact ────────────────────────────────────────────────────────
    const contact = await createContact({
      phone: data.phone.trim(),
      name: data.name.trim(),
      brand: brandId,
      email: typeof data.email === 'string' ? data.email.trim() || undefined : undefined,
      company: typeof data.company === 'string' ? data.company.trim() || undefined : undefined,
      role: typeof data.role === 'string' ? data.role.trim() || undefined : undefined,
      tags: Array.isArray(data.tags) ? (data.tags as string[]).filter(Boolean) : [],
      leadScore: 0,
      stage,
      source: (data.source as Contact['source']) ?? 'manual',
      notes: typeof data.notes === 'string' ? data.notes.trim() : '',
    });

    return NextResponse.json(
      { contact },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[contacts POST] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Failed to create contact.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
