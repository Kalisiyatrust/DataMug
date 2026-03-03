/**
 * @fileoverview WhatsApp Marketing System — Meta WhatsApp Cloud API Client
 *
 * Server-side only. Uses the Meta Graph API v21.0 directly via fetch() —
 * no third-party npm package required. Authentication uses a Bearer token
 * in the Authorization header.
 *
 * Environment variables required:
 *   META_WHATSAPP_TOKEN        — Permanent or temporary access token
 *   META_PHONE_NUMBER_ID       — WhatsApp Business phone number ID from Meta
 *   META_WHATSAPP_VERIFY_TOKEN — Secret token for webhook verification
 *
 * API Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * @module lib/meta-whatsapp-client
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Meta Graph API version used for all requests */
const META_API_VERSION = 'v21.0';

/** Base URL prefix for the Meta Graph API */
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the Meta WhatsApp access token from the environment.
 * Throws a descriptive error if the token is not set.
 */
function getAccessToken(): string {
  const token = process.env.META_WHATSAPP_TOKEN;
  if (!token) {
    throw new Error(
      'META_WHATSAPP_TOKEN is not set. Add it to your .env.local file.'
    );
  }
  return token;
}

/**
 * Return the WhatsApp Business phone number ID from the environment.
 * Throws a descriptive error if the ID is not set.
 */
function getPhoneNumberId(): string {
  const id = process.env.META_PHONE_NUMBER_ID;
  if (!id) {
    throw new Error(
      'META_PHONE_NUMBER_ID is not set. Add it to your .env.local file.'
    );
  }
  return id;
}

/**
 * Execute a Meta Graph API request against the WhatsApp Cloud API.
 *
 * @param path    - URL path relative to META_API_BASE (e.g. "/123456789/messages")
 * @param method  - HTTP method
 * @param body    - Optional JSON-serialisable request body
 * @returns Parsed JSON response from the Meta API
 * @throws On non-2xx HTTP responses or network errors
 */
async function metaFetch<T = unknown>(
  path: string,
  method: 'GET' | 'POST' = 'POST',
  body?: unknown
): Promise<T> {
  const url = `${META_API_BASE}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${getAccessToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'DataMug-Outreach/1.0',
    },
  };

  if (body !== undefined && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Meta API error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText) as {
        error?: { message?: string; code?: number; type?: string };
      };
      const e = errorJson.error;
      if (e) {
        errorMessage = `Meta API error ${e.code || response.status} (${e.type ?? 'unknown'}): ${e.message ?? errorText}`;
      }
    } catch {
      // Keep the plain-text error message
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

/** Meta WhatsApp Cloud API message send response */
interface MetaMessageResponse {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a plain-text WhatsApp message via the Meta Cloud API.
 *
 * @param to   - Recipient's WhatsApp phone number in E.164 format (e.g. "+919876543210")
 * @param text - Message body text
 * @returns Object containing the Meta message ID and initial status
 *
 * @example
 * const result = await sendWhatsAppText('+919876543210', 'Hello from DataMug!');
 * console.log(result.messageId);
 */
export async function sendWhatsAppText(
  to: string,
  text: string
): Promise<{ messageId: string; status: string }> {
  const phoneNumberId = getPhoneNumberId();

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const response = await metaFetch<MetaMessageResponse>(
    `/${phoneNumberId}/messages`,
    'POST',
    payload
  );

  const messageId = response.messages?.[0]?.id ?? '';

  if (!messageId) {
    throw new Error('Meta API did not return a message ID.');
  }

  return { messageId, status: 'sent' };
}

/**
 * Send a pre-approved WhatsApp template message.
 *
 * Templates must be approved in the Meta Business Manager before use.
 * Components allow passing header, body, and button variable values.
 *
 * @param to           - Recipient's WhatsApp phone number in E.164 format
 * @param templateName - Approved template name (e.g. "hello_world")
 * @param languageCode - BCP 47 language code (e.g. "en", "en_US", "hi")
 * @param components   - Optional template component parameters array
 * @returns Object containing the Meta message ID and initial status
 *
 * @example
 * const result = await sendWhatsAppTemplate(
 *   '+919876543210',
 *   'hello_world',
 *   'en_US'
 * );
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: unknown[]
): Promise<{ messageId: string; status: string }> {
  const phoneNumberId = getPhoneNumberId();

  const template: Record<string, unknown> = {
    name: templateName,
    language: { code: languageCode },
  };

  if (components && components.length > 0) {
    template.components = components;
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template,
  };

  const response = await metaFetch<MetaMessageResponse>(
    `/${phoneNumberId}/messages`,
    'POST',
    payload
  );

  const messageId = response.messages?.[0]?.id ?? '';

  if (!messageId) {
    throw new Error('Meta API did not return a message ID for the template.');
  }

  return { messageId, status: 'sent' };
}

/**
 * Send a WhatsApp image message by URL.
 *
 * The image must be publicly accessible (https). Meta will cache the image
 * after the first send.
 *
 * @param to       - Recipient's WhatsApp phone number in E.164 format
 * @param imageUrl - Publicly accessible HTTPS URL of the image
 * @param caption  - Optional text caption displayed below the image
 * @returns Object containing the Meta message ID and initial status
 *
 * @example
 * const result = await sendWhatsAppImage(
 *   '+919876543210',
 *   'https://example.com/promo.jpg',
 *   'Check out our latest offer!'
 * );
 */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ messageId: string; status: string }> {
  const phoneNumberId = getPhoneNumberId();

  const image: Record<string, string> = { link: imageUrl };
  if (caption) {
    image.caption = caption;
  }

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image,
  };

  const response = await metaFetch<MetaMessageResponse>(
    `/${phoneNumberId}/messages`,
    'POST',
    payload
  );

  const messageId = response.messages?.[0]?.id ?? '';

  if (!messageId) {
    throw new Error('Meta API did not return a message ID for the image.');
  }

  return { messageId, status: 'sent' };
}

/**
 * Retrieve the WhatsApp Business profile associated with the configured
 * phone number ID.
 *
 * Useful for verifying the API credentials and inspecting account metadata.
 *
 * @returns Raw profile object from the Meta Graph API
 *
 * @example
 * const profile = await getBusinessProfile();
 * console.log(profile.verified_name);
 */
export async function getBusinessProfile(): Promise<unknown> {
  const phoneNumberId = getPhoneNumberId();

  return metaFetch(
    `/${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
    'GET'
  );
}

/**
 * Return the Meta webhook verify token from environment.
 * Used by the webhook route to validate Meta's GET verification request.
 */
export function getWebhookVerifyToken(): string {
  return process.env.META_WHATSAPP_VERIFY_TOKEN ?? '';
}
