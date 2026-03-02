/**
 * @fileoverview GET|PUT|DELETE /api/whatsapp/contacts/[id]
 *
 * GET    — Retrieve a single contact by UUID, including their full conversation history.
 *   Response: { contact: Contact, messages: Message[], unreadCount: number }
 *
 * PUT    — Update a contact's mutable fields.
 *   Body (JSON): Partial<{ name, email, company, role, tags, stage, notes, leadScore }>
 *   Response: { contact: Contact }
 *
 * DELETE — Delete a contact and all their messages (cascade).
 *   Response: 204 No Content
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getContactById,
  updateContact,
  deleteContact,
  getMessages,
} from '@/lib/crm-store';
import type { Contact } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_STAGES: Contact['stage'][] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — single contact with conversation history ────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contact = await getContactById(id);
    if (!contact) {
      return NextResponse.json(
        { error: `Contact "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const messages = await getMessages(id);

    // Count inbound messages as proxy for unread (dashboard can track its own read state)
    const unreadCount = messages.filter(
      (m) => m.direction === 'inbound'
    ).length;

    return NextResponse.json(
      { contact, messages, unreadCount },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[contacts/[id] GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── PUT — update contact ──────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify contact exists
    const existing = await getContactById(id);
    if (!existing) {
      return NextResponse.json(
        { error: `Contact "${id}" not found.` },
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

    // ── Build updates object — only allow mutable fields ─────────────────────
    const updates: Partial<Omit<Contact, 'id' | 'createdAt'>> = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        return NextResponse.json(
          { error: 'name must be a non-empty string.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.name = data.name.trim();
    }

    if (data.email !== undefined) {
      updates.email = typeof data.email === 'string' ? data.email.trim() || undefined : undefined;
    }

    if (data.company !== undefined) {
      updates.company = typeof data.company === 'string' ? data.company.trim() || undefined : undefined;
    }

    if (data.role !== undefined) {
      updates.role = typeof data.role === 'string' ? data.role.trim() || undefined : undefined;
    }

    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        return NextResponse.json(
          { error: 'tags must be an array of strings.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.tags = (data.tags as unknown[]).filter((t) => typeof t === 'string') as string[];
    }

    if (data.stage !== undefined) {
      if (!VALID_STAGES.includes(data.stage as Contact['stage'])) {
        return NextResponse.json(
          { error: `Invalid stage "${data.stage}". Valid values: ${VALID_STAGES.join(', ')}.` },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.stage = data.stage as Contact['stage'];
    }

    if (data.notes !== undefined) {
      updates.notes = typeof data.notes === 'string' ? data.notes : '';
    }

    if (data.leadScore !== undefined) {
      const score = Number(data.leadScore);
      if (isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json(
          { error: 'leadScore must be a number between 0 and 100.' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      updates.leadScore = score;
    }

    const updated = await updateContact(id, updates);
    if (!updated) {
      return NextResponse.json(
        { error: `Contact "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { contact: updated },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[contacts/[id] PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update contact.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ── DELETE — remove contact ───────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deleted = await deleteContact(id);
    if (!deleted) {
      return NextResponse.json(
        { error: `Contact "${id}" not found.` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  } catch (error) {
    console.error('[contacts/[id] DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
