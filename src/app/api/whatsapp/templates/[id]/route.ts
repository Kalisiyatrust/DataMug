/**
 * @fileoverview GET|PUT|DELETE /api/whatsapp/templates/[id]
 *
 * GET    — Retrieve a single template by UUID.
 *   Response: { template: MessageTemplate }
 *
 * PUT    — Update a template's fields.
 *   Body (JSON): Partial<{ name, body, category }>
 *   (brand cannot be changed after creation)
 *   Response: { template: MessageTemplate }
 *
 * DELETE — Delete a template.
 *   Response: 204 No Content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, updateTemplate, deleteTemplate } from '@/lib/crm-store';
import type { MessageTemplate } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_CATEGORIES: MessageTemplate['category'][] = [
  'welcome', 'followup', 'promotion', 'newsletter', 'custom',
];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── Shared helper: find a template by ID ─────────────────────────────────────

async function findTemplate(id: string): Promise<MessageTemplate | null> {
  const all = await getTemplates();
  return all.find((t) => t.id === id) ?? null;
}

// ── GET — single template ─────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const template = await findTemplate(id);
    if (!template) {
      return NextResponse.json(
        { error: `Template "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { template },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[templates/[id] GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── PUT — update template ─────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await findTemplate(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Template "${id}" not found.` },
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
    const updates: Partial<Omit<MessageTemplate, 'id' | 'createdAt'>> = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        return NextResponse.json(
          { error: 'name must be a non-empty string.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.name = data.name.trim();
    }

    if (data.body !== undefined) {
      if (typeof data.body !== 'string' || !data.body.trim()) {
        return NextResponse.json(
          { error: 'body must be a non-empty string.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.body = data.body.trim();
    }

    if (data.category !== undefined) {
      if (!VALID_CATEGORIES.includes(data.category as MessageTemplate['category'])) {
        return NextResponse.json(
          { error: `Invalid category "${data.category}". Valid values: ${VALID_CATEGORIES.join(', ')}.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.category = data.category as MessageTemplate['category'];
    }

    const updated = await updateTemplate(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: `Template "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { template: updated },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[templates/[id] PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update template.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── DELETE — remove template ──────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = await deleteTemplate(id);
    if (!deleted) {
      return NextResponse.json(
        { error: `Template "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (error) {
    console.error('[templates/[id] DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
