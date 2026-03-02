/**
 * @fileoverview POST /api/whatsapp/contacts/import
 *
 * Import contacts from a CSV file uploaded via multipart/form-data.
 *
 * Form fields:
 *   file   — the CSV file (required)
 *   brand  — target brand ID (required): kalisiya | eloi | datamug
 *
 * CSV format (header row required, column names are case-insensitive):
 *   name, phone, email, company, role, tags, notes
 *   - "phone" can also be "mobile" or "number"
 *   - "tags" should be comma- or semicolon-separated values
 *   - Rows without a phone number are skipped automatically
 *
 * Response: { imported: number, skipped: number, errors: number, total: number }
 *
 * Contacts with a phone number that already exists for that brand are skipped (not errors).
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseCsvContacts, importContactsFromCsv } from '@/lib/crm-store';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_BRAND_IDS = BRANDS.map((b) => b.id) as string[];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── POST — import contacts from CSV ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Parse multipart form ──────────────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: 'Request must be multipart/form-data with a CSV file and brand field.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Validate brand ────────────────────────────────────────────────────────
    const brand = formData.get('brand');
    if (!brand || typeof brand !== 'string') {
      return NextResponse.json(
        { error: 'brand field is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!VALID_BRAND_IDS.includes(brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const brandId = brand as BrandConfig['id'];

    // ── Validate file ─────────────────────────────────────────────────────────
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json(
        { error: 'file field is required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (typeof file === 'string') {
      return NextResponse.json(
        { error: 'file must be a CSV file upload.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Read CSV content ──────────────────────────────────────────────────────
    let csvText: string;
    try {
      csvText = await (file as File).text();
    } catch {
      return NextResponse.json(
        { error: 'Failed to read the uploaded file.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'The uploaded CSV file is empty.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Parse CSV ─────────────────────────────────────────────────────────────
    let rows;
    try {
      rows = parseCsvContacts(csvText);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse CSV. Ensure the file has a valid header row.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { imported: 0, skipped: 0, errors: 0, total: 0 },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    // ── Import contacts ───────────────────────────────────────────────────────
    const result = await importContactsFromCsv(rows, brandId);

    // "errors" here = rows that parseCsvContacts filtered out (no phone)
    // skipped = rows with duplicate phone number for this brand
    const errors = rows.length - result.imported - result.skipped;

    return NextResponse.json(
      {
        imported: result.imported,
        skipped: result.skipped,
        errors: Math.max(0, errors),
        total: rows.length,
        contacts: result.contacts,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[contacts/import POST] Error:', error);
    const errMsg = error instanceof Error ? error.message : 'Import failed.';
    return NextResponse.json(
      { error: errMsg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
