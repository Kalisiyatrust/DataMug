/**
 * @fileoverview WhatsApp Marketing System — Twilio REST Client
 *
 * Server-side only. Uses the Twilio REST API directly via fetch() —
 * no twilio npm package required. Authentication uses HTTP Basic Auth
 * (Account SID : Auth Token).
 *
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID — Twilio account SID
 *   TWILIO_AUTH_TOKEN  — Twilio account auth token
 *
 * @module lib/twilio-client
 */

import { createHmac } from 'crypto';
import type { BrandConfig } from '@/types/whatsapp';
import { getTwilioFrom } from '@/lib/brands';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Twilio Account SID — read from environment */
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';

/** Base URL for the Twilio Messages resource */
const TWILIO_API_BASE = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the HTTP Basic Auth header value for Twilio requests.
 * Encoded as base64(AccountSid:AuthToken).
 */
function buildAuthHeader(): string {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    throw new Error(
      'TWILIO_AUTH_TOKEN is not set. Add it to your .env.local file.'
    );
  }
  const credentials = Buffer.from(`${TWILIO_ACCOUNT_SID}:${token}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Execute a Twilio REST API request.
 *
 * @param path    - Path relative to TWILIO_API_BASE (e.g. "/Messages.json")
 * @param method  - HTTP method
 * @param body    - Optional URL-encoded form data
 * @returns Parsed JSON response from Twilio
 * @throws On non-2xx HTTP responses or network errors
 */
async function twilioFetch<T = unknown>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, string>
): Promise<T> {
  const url = `${TWILIO_API_BASE}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: buildAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'DataMug-WhatsApp/1.0',
    },
  };

  if (body && method === 'POST') {
    options.body = new URLSearchParams(body).toString();
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Twilio API error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText) as { message?: string; code?: number };
      errorMessage = `Twilio error ${errorJson.code || response.status}: ${errorJson.message || errorText}`;
    } catch {
      // Keep the plain-text error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Twilio message response shape (subset of full API response).
 */
export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  date_updated?: string;
  price?: string;
  error_code?: number | null;
  error_message?: string | null;
}

/**
 * Send a WhatsApp message via the correct brand's number.
 *
 * @param to    - Recipient's E.164 phone number (e.g. "+919876543210")
 * @param body  - Message text to send
 * @param brand - Brand ID — determines the "From" WhatsApp number
 * @returns The Twilio API response including the message SID and initial status
 *
 * @example
 * const result = await sendWhatsAppMessage('+919876543210', 'Hello!', 'datamug');
 * console.log(result.sid); // 'SM...'
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  brand: BrandConfig['id']
): Promise<TwilioMessageResponse> {
  const normalizedTo = formatPhoneNumber(to);
  const from = getTwilioFrom(brand);

  const payload: Record<string, string> = {
    To: `whatsapp:${normalizedTo}`,
    From: from,
    Body: body,
  };

  return twilioFetch<TwilioMessageResponse>('/Messages.json', 'POST', payload);
}

/**
 * Twilio message status shape returned by getMessageStatus.
 */
export interface TwilioMessageStatus {
  sid: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  error_code?: number | null;
  error_message?: string | null;
  date_updated?: string;
}

/**
 * Fetch the current delivery status of a previously sent message.
 *
 * @param sid - The Twilio Message SID (e.g. "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
 * @returns Status object with sid, status, and optional error info
 */
export async function getMessageStatus(sid: string): Promise<TwilioMessageStatus> {
  if (!sid || !sid.startsWith('SM')) {
    throw new Error(`Invalid Twilio Message SID: "${sid}". Must start with "SM".`);
  }

  const data = await twilioFetch<TwilioMessageStatus>(`/Messages/${sid}.json`);
  return {
    sid: data.sid,
    status: data.status,
    error_code: data.error_code ?? null,
    error_message: data.error_message ?? null,
    date_updated: data.date_updated,
  };
}

/**
 * Validate an inbound Twilio webhook request using HMAC-SHA1 signature
 * verification as documented at https://www.twilio.com/docs/usage/webhooks/webhooks-security.
 *
 * @param request - The incoming Next.js Request object
 * @returns true if the signature is valid, false otherwise
 *
 * @remarks
 * The X-Twilio-Signature header must be present. The function reconstructs
 * the signed string from the full URL + sorted POST params (for form data)
 * or just the URL (for JSON bodies).
 */
export async function validateWebhook(request: Request): Promise<boolean> {
  try {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) return false;

    const signature = request.headers.get('X-Twilio-Signature');
    if (!signature) return false;

    const url = request.url;
    const contentType = request.headers.get('Content-Type') ?? '';

    let signedString = url;

    // For form-encoded bodies, Twilio appends sorted param key-value pairs
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const cloned = request.clone();
      const body = await cloned.text();
      const params = new URLSearchParams(body);

      // Sort params alphabetically by key and append to URL
      const sortedKeys = Array.from(params.keys()).sort();
      for (const key of sortedKeys) {
        signedString += key + (params.get(key) ?? '');
      }
    }

    // Compute expected HMAC-SHA1
    const hmac = createHmac('sha1', token);
    hmac.update(signedString);
    const expected = hmac.digest('base64');

    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch (error) {
    console.error('[twilio-client] Webhook validation error:', error);
    return false;
  }
}

/**
 * Normalise a phone number to E.164 format.
 *
 * Handles common formats:
 * - "+91 99593 88009" → "+919959388009"
 * - "0091-9959388009" → "+919959388009"
 * - "9959388009" (10-digit India) → "+919959388009"  (assumes India)
 * - "+15734325738" → "+15734325738" (already E.164)
 *
 * @param phone - Raw phone number string
 * @returns E.164 formatted phone number starting with "+"
 * @throws If the resulting number is too short to be valid (<8 digits)
 */
export function formatPhoneNumber(phone: string): string {
  // Strip all non-digit characters except a leading +
  let cleaned = phone.trim();

  // Replace leading 00 country code prefix with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Remove spaces, hyphens, parentheses, dots
  cleaned = cleaned.replace(/[\s\-().]/g, '');

  // If already in E.164 format, return as-is
  if (/^\+\d{7,15}$/.test(cleaned)) {
    return cleaned;
  }

  // Strip any remaining non-digit characters
  const digits = cleaned.replace(/\D/g, '');

  if (digits.length < 8) {
    throw new Error(
      `Phone number "${phone}" is too short to be valid (${digits.length} digits after cleaning).`
    );
  }

  // Heuristic: 10-digit number without country code → assume India (+91)
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

/**
 * Send a WhatsApp template message (for pre-approved Twilio content templates).
 *
 * @param to           - Recipient's E.164 phone number
 * @param contentSid   - Twilio Content Template SID (HX...)
 * @param variables    - Template variables keyed by their 1-based index
 * @param brand        - Brand ID for routing
 */
export async function sendTemplateMessage(
  to: string,
  contentSid: string,
  variables: Record<string, string>,
  brand: BrandConfig['id']
): Promise<TwilioMessageResponse> {
  const normalizedTo = formatPhoneNumber(to);
  const from = getTwilioFrom(brand);

  const payload: Record<string, string> = {
    To: `whatsapp:${normalizedTo}`,
    From: from,
    ContentSid: contentSid,
    ContentVariables: JSON.stringify(variables),
  };

  return twilioFetch<TwilioMessageResponse>('/Messages.json', 'POST', payload);
}
