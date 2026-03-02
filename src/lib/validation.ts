/**
 * Input validation and sanitization utilities.
 * Prevents injection attacks and overly large payloads.
 */

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_HISTORY_LENGTH = 20;

/**
 * Sanitize a text message: trim, limit length, strip control characters.
 */
export function sanitizeMessage(input: unknown): string | null {
  if (typeof input !== "string") return null;
  // Strip null bytes and other control chars (keep newlines and tabs)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return trimmed.slice(0, MAX_MESSAGE_LENGTH);
  }
  return trimmed;
}

/**
 * Validate and sanitize a model name string.
 * Only allows alphanumeric, dots, dashes, colons, and underscores.
 */
export function sanitizeModelName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 100) return null;
  if (!/^[a-zA-Z0-9._:\-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validate a base64 data URL.
 * Returns true if the string looks like a valid data:image/... URL.
 */
export function isValidBase64Image(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml|tiff?|heic|heif|avif);base64,/.test(input);
}

/**
 * Validate conversation history array.
 * Returns sanitized history or empty array.
 */
export function sanitizeHistory(
  input: unknown
): Array<{ role: string; content: string; image?: string; images?: string[] }> {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-MAX_HISTORY_LENGTH)
    .filter(
      (msg): msg is { role: string; content: string; image?: string; images?: string[] } =>
        typeof msg === "object" &&
        msg !== null &&
        typeof msg.role === "string" &&
        ["user", "assistant", "system"].includes(msg.role) &&
        typeof msg.content === "string" &&
        msg.content.length <= MAX_MESSAGE_LENGTH
    );
}
