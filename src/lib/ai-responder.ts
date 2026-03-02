/**
 * @fileoverview WhatsApp Marketing System — AI-Powered Response Engine
 *
 * Uses the OpenAI-compatible Ollama endpoint (already configured in the project)
 * to generate context-aware WhatsApp responses for each brand's persona.
 *
 * Key capabilities:
 * - Brand-scoped system prompts with full service catalogs
 * - Conversation history context window
 * - Intent detection (inquiry, pricing, demo, complaint, opt-out, etc.)
 * - Automated next-action suggestions
 * - Opt-out keyword detection and handling
 * - Graceful fallback when the model is unavailable
 *
 * Environment variables used:
 *   LLM_ENDPOINT      — Ollama base URL (default: http://localhost:11434/v1)
 *   OPENAI_API_KEY    — Set to "ollama" for local models
 *   DEFAULT_MODEL     — Model to use (default: llava:7b)
 *
 * @module lib/ai-responder
 */

'use server';

import OpenAI from 'openai';
import type { BrandConfig, Contact, Message, IntentResult } from '@/types/whatsapp';
import { getBrand } from '@/lib/brands';

// ─────────────────────────────────────────────────────────────────────────────
// Client singleton
// ─────────────────────────────────────────────────────────────────────────────

let _client: OpenAI | null = null;

/**
 * Return the singleton OpenAI client pointed at the Ollama endpoint.
 * Reuses the same configuration as the existing ollama-client.ts.
 */
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'ollama',
      baseURL: process.env.LLM_ENDPOINT || 'http://localhost:11434/v1',
    });
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Opt-out handling
// ─────────────────────────────────────────────────────────────────────────────

/** Keywords that signal the contact wants to stop receiving messages */
const OPT_OUT_KEYWORDS = [
  'stop', 'unsubscribe', 'opt out', 'optout', 'remove me',
  'don\'t contact', 'do not contact', 'cancel', 'quit', 'leave me alone',
];

/**
 * Check whether a message body contains an opt-out keyword.
 *
 * @param body - Incoming message text
 * @returns true if the message is an opt-out request
 */
export function isOptOut(body: string): boolean {
  const lower = body.toLowerCase().trim();
  return OPT_OUT_KEYWORDS.some(
    (kw) => lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)
  );
}

/**
 * Get a polite, brand-appropriate opt-out confirmation message.
 *
 * @param brandId - The brand the contact is opting out of
 * @returns Confirmation message text
 */
export function getOptOutResponse(brandId: BrandConfig['id']): string {
  const brandNames: Record<BrandConfig['id'], string> = {
    kalisiya: 'Kalisiya Foundation',
    eloi: 'Eloi Consulting',
    datamug: 'DataMug',
  };
  const name = brandNames[brandId];
  return (
    `You've been successfully unsubscribed from ${name} WhatsApp messages. ` +
    `We won't contact you again. If you change your mind, feel free to reach out to us anytime. ` +
    `God bless! 🙏`
  ).replace(' God bless! 🙏', brandId === 'kalisiya' ? ' God bless! 🙏' : '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keyword patterns used for lightweight rule-based intent detection.
 * The AI model is the primary intent resolver; these patterns serve as a
 * fast-path override for common cases.
 */
const INTENT_PATTERNS: Array<{
  intent: IntentResult['intent'];
  patterns: RegExp[];
  action: IntentResult['suggestedAction'];
}> = [
  {
    intent: 'optout',
    patterns: [/\b(stop|unsubscribe|opt.?out|remove me)\b/i],
    action: 'unsubscribe',
  },
  {
    intent: 'pricing',
    patterns: [/\b(price|pricing|cost|how much|quote|rates?|fee|fees)\b/i],
    action: 'reply',
  },
  {
    intent: 'demo',
    patterns: [/\b(demo|trial|try|test|poc|proof.?of.?concept|sample|show me)\b/i],
    action: 'schedule_call',
  },
  {
    intent: 'complaint',
    patterns: [/\b(complaint|issue|problem|broken|bug|error|not working|terrible|awful|angry|frustrated)\b/i],
    action: 'escalate',
  },
  {
    intent: 'inquiry',
    patterns: [/\b(tell me|what is|what are|how does|interested in|learn more|info|information|details)\b/i],
    action: 'reply',
  },
  {
    intent: 'greeting',
    patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings)[!.,\s]*$/i],
    action: 'reply',
  },
];

/**
 * Perform lightweight keyword-based intent detection as a fast-path.
 * Falls back to 'unknown' with confidence 0 if no pattern matches.
 *
 * @param body - Incoming message text
 * @returns IntentResult with intent, confidence, and suggested action
 */
export function detectIntentFast(body: string): IntentResult {
  for (const { intent, patterns, action } of INTENT_PATTERNS) {
    if (patterns.some((p) => p.test(body))) {
      return { intent, confidence: 0.8, suggestedAction: action };
    }
  }
  return { intent: 'unknown', confidence: 0, suggestedAction: 'reply' };
}

/**
 * Use the AI model to perform deep intent detection from a message in context.
 * Returns a structured JSON intent result.
 *
 * @param body    - Incoming message
 * @param contact - The contact who sent it
 * @param brand   - Brand context
 * @returns IntentResult (falls back to fast-path if model call fails)
 */
export async function detectIntent(
  body: string,
  contact: Contact,
  brand: BrandConfig
): Promise<IntentResult> {
  // Fast-path opt-out check (always reliable, no AI needed)
  if (isOptOut(body)) {
    return { intent: 'optout', confidence: 1.0, suggestedAction: 'unsubscribe' };
  }

  const prompt = `You are an intent classifier for a WhatsApp marketing system.
Brand: ${brand.name}
Contact: ${contact.name} (stage: ${contact.stage}, score: ${contact.leadScore})
Message: "${body}"

Classify the intent as one of: inquiry, pricing, demo, complaint, optout, greeting, unknown
Suggest action as one of: reply, schedule_call, send_brochure, escalate, unsubscribe

Respond ONLY with valid JSON matching this shape:
{"intent": "...", "confidence": 0.0, "suggestedAction": "..."}`;

  try {
    const model = process.env.DEFAULT_MODEL || 'llava:7b';
    // Use a text-only model alias if DEFAULT_MODEL is a vision model
    const textModel = model.includes('llava') ? 'llama3.2:3b' : model;

    const response = await getClient().chat.completions.create({
      model: textModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content?.trim() ?? '';
    // Extract JSON even if the model wraps it in markdown
    const jsonMatch = content.match(/\{[^}]+\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as IntentResult;
      return parsed;
    }
  } catch (error) {
    console.warn('[ai-responder] Intent detection AI call failed, using fast-path:', error);
  }

  return detectIntentFast(body);
}

// ─────────────────────────────────────────────────────────────────────────────
// Response generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context window: maximum number of past messages to include in the prompt.
 * Older messages are trimmed to stay within model context limits.
 */
const MAX_HISTORY_MESSAGES = 10;

/**
 * Build the AI chat messages array for a response generation request.
 *
 * @param contact     - The contact being responded to
 * @param incoming    - The latest incoming message text
 * @param brand       - Brand configuration (provides the system prompt)
 * @param history     - Previous conversation messages (oldest-first)
 * @returns OpenAI-compatible chat messages array
 */
function buildPromptMessages(
  contact: Contact,
  incoming: string,
  brand: BrandConfig,
  history: Message[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const systemContent = `${brand.systemPrompt}

--- CONTACT CONTEXT ---
Name: ${contact.name}
Phone: ${contact.phone}
${contact.company ? `Company: ${contact.company}` : ''}
${contact.role ? `Role: ${contact.role}` : ''}
Stage: ${contact.stage}
Lead score: ${contact.leadScore}/100
Tags: ${contact.tags.join(', ') || 'none'}
${contact.notes ? `Notes: ${contact.notes}` : ''}

--- INSTRUCTIONS ---
1. Respond naturally to the incoming WhatsApp message above.
2. Keep your reply concise (2–4 sentences for simple messages, up to 8 for complex inquiries).
3. Do NOT start with "Hello" or "Hi" if you have already greeted this contact in the conversation.
4. Do NOT use markdown formatting (no **, no #) — this is a plain-text WhatsApp message.
5. Always close with a clear, gentle call-to-action.
6. If you are uncertain about any factual claim, say so and offer to follow up.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
  ];

  // Add trimmed conversation history
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body,
    });
  }

  // Add the latest incoming message
  messages.push({ role: 'user', content: incoming });

  return messages;
}

/**
 * Generate an AI-powered WhatsApp response.
 *
 * This is the primary export used by inbound webhook handlers and
 * automated sequence engines.
 *
 * @param contact             - The contact who sent the message
 * @param incomingMessage     - The text of their latest message
 * @param brandId             - Which brand to respond as
 * @param conversationHistory - Prior messages in this conversation (oldest-first)
 * @returns The AI-generated reply text, or a safe fallback string
 */
export async function generateResponse(
  contact: Contact,
  incomingMessage: string,
  brandId: BrandConfig['id'],
  conversationHistory: Message[]
): Promise<string> {
  const brand = getBrand(brandId);

  // Handle opt-out immediately without hitting the AI
  if (isOptOut(incomingMessage)) {
    return getOptOutResponse(brandId);
  }

  const promptMessages = buildPromptMessages(
    contact,
    incomingMessage,
    brand,
    conversationHistory
  );

  const model = process.env.DEFAULT_MODEL || 'llava:7b';
  // Prefer a text-only model for conversation; fall back to specified model
  const conversationModel = model.includes('llava') ? 'llama3.2:3b' : model;

  try {
    const completion = await getClient().chat.completions.create({
      model: conversationModel,
      messages: promptMessages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content?.trim();

    if (!reply || reply.length < 5) {
      return getFallbackResponse(brand);
    }

    return reply;
  } catch (error) {
    console.error('[ai-responder] generateResponse error:', error);
    return getFallbackResponse(brand);
  }
}

/**
 * Generate a short AI-assisted follow-up message for drip sequences.
 * Uses a condensed prompt optimised for brief, warm nudges.
 *
 * @param contact   - Contact to follow up with
 * @param brandId   - Brand context
 * @param stepHint  - A brief instruction for this step (e.g. "ask about their timeline")
 * @returns Follow-up message text
 */
export async function generateFollowUp(
  contact: Contact,
  brandId: BrandConfig['id'],
  stepHint: string
): Promise<string> {
  const brand = getBrand(brandId);
  const model = process.env.DEFAULT_MODEL || 'llava:7b';
  const conversationModel = model.includes('llava') ? 'llama3.2:3b' : model;

  const prompt = `You are a WhatsApp sales assistant for ${brand.name}.
Write a brief, friendly follow-up message to ${contact.name}${contact.company ? ` at ${contact.company}` : ''}.
Current stage: ${contact.stage}. Lead score: ${contact.leadScore}/100.
Your goal for this message: ${stepHint}
Keep it under 3 sentences. Plain text only (no markdown).`;

  try {
    const completion = await getClient().chat.completions.create({
      model: conversationModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 200,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    return reply && reply.length > 5 ? reply : getFallbackResponse(brand);
  } catch (error) {
    console.error('[ai-responder] generateFollowUp error:', error);
    return getFallbackResponse(brand);
  }
}

/**
 * Summarise a conversation to produce a brief account note.
 * Useful for auto-populating the Contact.notes field after a conversation ends.
 *
 * @param messages - Full conversation message array
 * @param brand    - Brand context
 * @returns A 1–3 sentence summary of the conversation
 */
export async function summariseConversation(
  messages: Message[],
  brand: BrandConfig
): Promise<string> {
  if (messages.length === 0) return 'No messages in conversation.';

  const model = process.env.DEFAULT_MODEL || 'llava:7b';
  const conversationModel = model.includes('llava') ? 'llama3.2:3b' : model;

  const transcript = messages
    .map((m) => `[${m.direction === 'inbound' ? 'Contact' : 'Agent'}]: ${m.body}`)
    .join('\n');

  const prompt = `Summarise the following WhatsApp conversation for ${brand.name} in 2–3 sentences. 
Focus on: what the contact is interested in, any commitments made, and recommended next steps.
Plain text only.

CONVERSATION:
${transcript.slice(0, 4000)}`; // Trim to avoid context overflow

  try {
    const completion = await getClient().chat.completions.create({
      model: conversationModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    return (
      completion.choices[0]?.message?.content?.trim() ??
      'Could not generate summary.'
    );
  } catch (error) {
    console.error('[ai-responder] summariseConversation error:', error);
    return 'Summary unavailable.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Brand-appropriate fallback when the AI model is unavailable or returns empty.
 *
 * @param brand - Brand configuration
 * @returns A polite, human hand-off message
 */
function getFallbackResponse(brand: BrandConfig): string {
  const fallbacks: Record<BrandConfig['id'], string> = {
    kalisiya:
      'Thank you for reaching out to Kalisiya Foundation! We\'d love to connect with you. ' +
      'Please let me pass your message to our team and we\'ll get back to you shortly. ' +
      'God bless you!',
    eloi:
      'Thank you for contacting Eloi Consulting. Our team will review your enquiry and ' +
      'respond within one business day. Would a quick call this week work for you?',
    datamug:
      'Thanks for reaching out to DataMug! Our team will get back to you shortly. ' +
      'In the meantime, you can explore our docs at https://datamug.ai for quick answers.',
  };
  return fallbacks[brand.id];
}
