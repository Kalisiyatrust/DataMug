/**
 * @fileoverview WhatsApp Marketing System — Telegram Bot API Client
 *
 * Server-side only. Uses the Telegram Bot API directly via fetch() —
 * no third-party npm package required. Authentication is embedded in the URL
 * path as /bot{TOKEN}/method.
 *
 * Environment variables required:
 *   TELEGRAM_BOT_TOKEN — Bot token from @BotFather
 *
 * API Reference: https://core.telegram.org/bots/api
 *
 * @module lib/telegram-client
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the Telegram Bot token from the environment.
 * Throws a descriptive error if the token is not set.
 */
function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN is not set. Add it to your .env.local file.'
    );
  }
  return token;
}

/**
 * Build the base URL for a Telegram Bot API method.
 *
 * @param method - Telegram API method name (e.g. "sendMessage")
 */
function telegramUrl(method: string): string {
  return `https://api.telegram.org/bot${getBotToken()}/${method}`;
}

/**
 * Execute a Telegram Bot API request.
 *
 * @param method  - Telegram API method name (e.g. "sendMessage")
 * @param payload - JSON-serialisable request body
 * @returns The parsed "result" field from the Telegram API response
 * @throws On non-OK Telegram responses or network errors
 */
async function telegramFetch<T = unknown>(
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await fetch(telegramUrl(method), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DataMug-Outreach/1.0',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
  };

  if (!data.ok) {
    throw new Error(
      `Telegram API error ${data.error_code ?? response.status}: ${data.description ?? 'Unknown error'}`
    );
  }

  return data.result as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telegram API types (subset)
// ─────────────────────────────────────────────────────────────────────────────

/** Telegram Message object (minimal subset used by this module) */
interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  caption?: string;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
}

/** Telegram User object (bot identity) */
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a text message to a Telegram chat.
 *
 * @param chatId    - The target chat ID or @username
 * @param text      - Message text (supports HTML / Markdown if parseMode is set)
 * @param parseMode - Optional parse mode: 'HTML' or 'Markdown'
 * @returns Object containing the Telegram message_id and ok flag
 *
 * @example
 * const result = await sendTelegramMessage('-1001234567890', '<b>Hello!</b>', 'HTML');
 * console.log(result.messageId);
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<{ messageId: number; ok: boolean }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  const message = await telegramFetch<TelegramMessage>('sendMessage', payload);

  return { messageId: message.message_id, ok: true };
}

/**
 * Send a photo to a Telegram chat by URL.
 *
 * @param chatId    - The target chat ID or @username
 * @param photoUrl  - Publicly accessible URL of the photo to send
 * @param caption   - Optional text caption for the photo
 * @returns Object containing the Telegram message_id and ok flag
 *
 * @example
 * const result = await sendTelegramPhoto('-1001234567890', 'https://example.com/img.jpg', 'Look at this!');
 */
export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption?: string
): Promise<{ messageId: number; ok: boolean }> {
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
  };

  if (caption) {
    payload.caption = caption;
  }

  const message = await telegramFetch<TelegramMessage>('sendPhoto', payload);

  return { messageId: message.message_id, ok: true };
}

/**
 * Register a webhook URL so Telegram will POST incoming updates to it.
 *
 * @param url - The HTTPS URL that will receive Telegram update payloads
 * @returns true if the webhook was successfully set
 *
 * @example
 * const ok = await setWebhook('https://yourapp.com/api/telegram/webhook');
 */
export async function setWebhook(url: string): Promise<boolean> {
  const payload: Record<string, unknown> = {
    url,
    allowed_updates: ['message', 'callback_query'],
  };

  await telegramFetch<{ description: string }>('setWebhook', payload);

  return true;
}

/**
 * Fetch the bot's own identity information.
 *
 * @returns Object with the bot's numeric id, username, and first name
 *
 * @example
 * const me = await getMe();
 * console.log(me.username); // 'MyAwesomeBot'
 */
export async function getMe(): Promise<{
  id: number;
  username: string;
  firstName: string;
}> {
  // getMe uses GET (no body), Telegram accepts POST with empty body too
  const response = await fetch(telegramUrl('getMe'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DataMug-Outreach/1.0',
    },
    body: JSON.stringify({}),
  });

  const data = await response.json() as {
    ok: boolean;
    result?: TelegramUser;
    description?: string;
    error_code?: number;
  };

  if (!data.ok || !data.result) {
    throw new Error(
      `Telegram getMe error ${data.error_code ?? response.status}: ${data.description ?? 'Unknown error'}`
    );
  }

  return {
    id: data.result.id,
    username: data.result.username ?? '',
    firstName: data.result.first_name,
  };
}

/**
 * Send the same text message to multiple Telegram chat IDs.
 *
 * Messages are sent sequentially with a 50 ms delay between each to respect
 * Telegram's ~30 messages/second rate limit.
 *
 * @param chatIds   - Array of chat IDs or @usernames to message
 * @param text      - Message text
 * @param parseMode - Optional parse mode: 'HTML' or 'Markdown'
 * @returns Summary of sent / failed counts plus per-failure error details
 *
 * @example
 * const result = await sendBulkTelegramMessages(
 *   ['-1001111111111', '-1002222222222'],
 *   'Hello everyone!'
 * );
 * console.log(result.sent, result.failed);
 */
export async function sendBulkTelegramMessages(
  chatIds: string[],
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<{
  sent: number;
  failed: number;
  errors: Array<{ chatId: string; error: string }>;
}> {
  let sent = 0;
  let failed = 0;
  const errors: Array<{ chatId: string; error: string }> = [];

  for (let i = 0; i < chatIds.length; i++) {
    const chatId = chatIds[i];

    try {
      await sendTelegramMessage(chatId, text, parseMode);
      sent++;
    } catch (err) {
      failed++;
      errors.push({
        chatId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Inject 50 ms delay between messages to avoid hitting Telegram rate limits.
    // Skip the delay after the last message.
    if (i < chatIds.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
  }

  return { sent, failed, errors };
}
