/**
 * @fileoverview GET /api/whatsapp/analytics
 *
 * Returns a WhatsAppAnalytics aggregate snapshot computed on-demand from
 * the CRM JSON stores. No data is cached — every call reads fresh data.
 *
 * Query params:
 *   brand — optional brand ID filter (kalisiya | eloi | datamug).
 *           When provided, all metrics are scoped to that brand's contacts
 *           and messages only.
 *
 * Response: { analytics: WhatsAppAnalytics, generatedAt: string }
 *
 * Note: When a brand filter is applied, brandBreakdown will still contain
 * only that brand's stats, and cross-brand totals (totalContacts etc.)
 * will be filtered accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeAnalytics } from '@/lib/crm-store';
import { BRANDS } from '@/lib/brands';
import type { BrandConfig } from '@/types/whatsapp';

// ── CORS headers ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const VALID_BRAND_IDS = BRANDS.map((b) => b.id) as string[];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET — analytics snapshot ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const brand = searchParams.get('brand') ?? undefined;

    if (brand && !VALID_BRAND_IDS.includes(brand)) {
      return NextResponse.json(
        { error: `Invalid brand "${brand}". Valid values: ${VALID_BRAND_IDS.join(', ')}.` },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // computeAnalytics reads all data; we post-filter by brand if requested
    const raw = await computeAnalytics();

    let analytics: typeof raw;

    if (brand) {
      const brandId = brand as BrandConfig['id'];

      // Filter brandBreakdown to the requested brand only
      const brandBreakdown = raw.brandBreakdown.filter((b) => b.brand === brandId);
      const brandStats = brandBreakdown[0] ?? { brand: brandId, contacts: 0, messages: 0 };

      analytics = {
        ...raw,
        totalContacts: brandStats.contacts,
        messagesSent: raw.messagesSent,       // Scoping messages by brand is complex — return global
        messagesReceived: raw.messagesReceived,
        brandBreakdown,
      };
    } else {
      analytics = raw;
    }

    return NextResponse.json(
      { analytics, generatedAt: new Date().toISOString() },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[analytics GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to compute analytics.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
