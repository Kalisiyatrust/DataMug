/**
 * @fileoverview WhatsApp Marketing System — Brevo (Sendinblue) Email API Client
 *
 * Server-side only. Uses the Brevo REST API v3 directly via fetch() —
 * no third-party npm package required. Authentication uses the api-key header.
 *
 * Environment variables required:
 *   BREVO_API_KEY — Brevo API key (v3 key from Settings → API Keys)
 *
 * API Reference: https://developers.brevo.com/reference/sendtransacemail
 *
 * @module lib/brevo-client
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Base URL for the Brevo REST API v3 */
const BREVO_API_BASE = 'https://api.brevo.com/v3';

/** Default sender name when none is provided */
const DEFAULT_SENDER_NAME = 'MugData';

/** Default sender email address when none is provided */
const DEFAULT_SENDER_EMAIL = 'noreply@mugdata.com';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the Brevo API key from the environment.
 * Throws a descriptive error if the key is not set.
 */
function getApiKey(): string {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    throw new Error(
      'BREVO_API_KEY is not set. Add it to your .env.local file.'
    );
  }
  return key;
}

/**
 * Execute a Brevo REST API request.
 *
 * @param path   - Path relative to BREVO_API_BASE (e.g. "/smtp/email")
 * @param method - HTTP method
 * @param body   - Optional JSON-serialisable request body
 * @returns Parsed JSON response from Brevo, or null for 204 No Content
 * @throws On non-2xx HTTP responses or network errors
 */
async function brevoFetch<T = unknown>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: unknown
): Promise<T | null> {
  const url = `${BREVO_API_BASE}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'api-key': getApiKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'DataMug-Outreach/1.0',
    },
  };

  if (body !== undefined && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Brevo API error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText) as { message?: string; code?: string };
      errorMessage = `Brevo error ${errorJson.code || response.status}: ${errorJson.message || errorText}`;
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

/** Brevo transactional email send response */
interface BrevoSendEmailResponse {
  /** Brevo internal message ID */
  messageId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a single transactional email via Brevo.
 *
 * @param to          - Recipient email address
 * @param subject     - Email subject line
 * @param htmlContent - HTML body content
 * @param textContent - Optional plain-text fallback body
 * @param senderName  - Display name for the sender (defaults to "MugData")
 * @param senderEmail - Sender email address (defaults to "noreply@mugdata.com")
 * @returns Object containing the Brevo message ID
 *
 * @example
 * const result = await sendEmail(
 *   'alice@example.com',
 *   'Welcome to DataMug!',
 *   '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
 * );
 * console.log(result.messageId);
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  senderName?: string,
  senderEmail?: string
): Promise<{ messageId: string }> {
  const payload: Record<string, unknown> = {
    sender: {
      name: senderName || DEFAULT_SENDER_NAME,
      email: senderEmail || DEFAULT_SENDER_EMAIL,
    },
    to: [{ email: to }],
    subject,
    htmlContent,
  };

  if (textContent) {
    payload.textContent = textContent;
  }

  const response = await brevoFetch<BrevoSendEmailResponse>(
    '/smtp/email',
    'POST',
    payload
  );

  if (!response?.messageId) {
    throw new Error('Brevo did not return a messageId in the response.');
  }

  return { messageId: response.messageId };
}

/**
 * Send a transactional email to multiple recipients in a single API call.
 *
 * Each recipient may optionally include a display name and a params map for
 * server-side template variable substitution (e.g. `{{params.firstName}}`).
 *
 * @param recipients  - Array of recipient objects
 * @param subject     - Email subject line
 * @param htmlContent - HTML body (may contain {{params.KEY}} placeholders)
 * @param senderName  - Display name for the sender (defaults to "MugData")
 * @param senderEmail - Sender email address (defaults to "noreply@mugdata.com")
 * @returns Summary of accepted / rejected recipient counts plus the message ID
 *
 * @example
 * const result = await sendBulkEmails(
 *   [
 *     { email: 'alice@example.com', name: 'Alice', params: { firstName: 'Alice' } },
 *     { email: 'bob@example.com',   name: 'Bob',   params: { firstName: 'Bob'   } },
 *   ],
 *   'Exclusive offer',
 *   '<p>Hi {{params.firstName}}, check this out!</p>'
 * );
 * console.log(result.accepted, result.rejected);
 */
export async function sendBulkEmails(
  recipients: Array<{ email: string; name?: string; params?: Record<string, string> }>,
  subject: string,
  htmlContent: string,
  senderName?: string,
  senderEmail?: string
): Promise<{ messageId: string; accepted: number; rejected: number }> {
  if (recipients.length === 0) {
    throw new Error('sendBulkEmails: recipients array must not be empty.');
  }

  // Build the "to" array with optional per-recipient params
  const toArrayWithParams = recipients.map((r) => {
    const entry: Record<string, unknown> = { email: r.email };
    if (r.name) entry.name = r.name;
    if (r.params && Object.keys(r.params).length > 0) {
      entry.params = r.params;
    }
    return entry;
  });

  const payload: Record<string, unknown> = {
    sender: {
      name: senderName || DEFAULT_SENDER_NAME,
      email: senderEmail || DEFAULT_SENDER_EMAIL,
    },
    to: toArrayWithParams,
    subject,
    htmlContent,
  };

  const response = await brevoFetch<BrevoSendEmailResponse>(
    '/smtp/email',
    'POST',
    payload
  );

  if (!response?.messageId) {
    throw new Error('Brevo did not return a messageId in the response.');
  }

  // Brevo returns a single messageId for bulk sends; track accepted/rejected
  // by sending count. In practice Brevo rejects at the API level (throws above).
  return {
    messageId: response.messageId,
    accepted: recipients.length,
    rejected: 0,
  };
}

/**
 * Retrieve the delivery status of a previously sent email by its Brevo
 * message ID.
 *
 * Note: Brevo's transactional email logs API supports querying by message ID
 * via GET /smtp/statistics/events. This returns the most recent event status.
 *
 * @param messageId - The Brevo message ID returned by sendEmail / sendBulkEmails
 * @returns Object containing the current delivery status string
 */
export async function getEmailStatus(
  messageId: string
): Promise<{ status: string }> {
  if (!messageId) {
    throw new Error('getEmailStatus: messageId is required.');
  }

  // Brevo email statistics events endpoint
  const path = `/smtp/statistics/events?messageId=${encodeURIComponent(messageId)}&limit=1&sort=desc`;

  interface BrevoEventsResponse {
    events?: Array<{ event: string; date: string; email: string }>;
  }

  const response = await brevoFetch<BrevoEventsResponse>(path, 'GET');

  if (!response || !response.events || response.events.length === 0) {
    // Message not yet tracked or ID is unknown
    return { status: 'unknown' };
  }

  return { status: response.events[0].event };
}
