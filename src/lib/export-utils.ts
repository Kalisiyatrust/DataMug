/**
 * export-utils.ts
 * Utility library for exporting and sharing DataMug conversation results.
 * Handles clipboard, text, HTML, markdown, and share-text formats.
 */

import type { Message } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Clipboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy text to clipboard with fallback for older browsers / non-secure contexts.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern async clipboard API (requires HTTPS or localhost)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  // Legacy execCommand fallback
  try {
    const el = document.createElement("textarea");
    el.value = text;
    // Prevent scroll jump
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.opacity = "0";
    el.style.pointerEvents = "none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const success = document.execCommand("copy");
    document.body.removeChild(el);
    return success;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Text download
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger a plain-text file download in the browser.
 */
export function downloadAsText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename.endsWith(".txt") ? filename : `${filename}.txt`);
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML download (print-to-PDF friendly)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download the conversation as a self-contained, styled HTML file.
 * The file works standalone (no external dependencies), is print-friendly,
 * and can be saved as PDF from the browser's print dialog.
 */
export function downloadAsHTML(
  title: string,
  messages: Message[],
  model?: string
): void {
  const html = buildHTMLDocument(title, messages, model);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const safeTitle = sanitizeFilename(title);
  triggerDownload(blob, `${safeTitle}.html`);
}

function buildHTMLDocument(
  title: string,
  messages: Message[],
  model?: string
): string {
  const exportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const exportTime = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const messagesHTML = messages
    .map((msg) => buildMessageHTML(msg))
    .join("\n");

  const modelLabel = model ? escapeHTML(model) : "DataMug";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHTML(title)} – DataMug</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #ffffff;
      padding: 40px 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .header-brand svg {
      flex-shrink: 0;
    }
    .brand-name {
      font-size: 13px;
      font-weight: 600;
      color: #6366f1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: #6b7280;
    }
    .header-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* ── Messages ── */
    .messages {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .message {
      display: flex;
      gap: 12px;
    }
    .message.user {
      flex-direction: row-reverse;
    }

    .avatar {
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      margin-top: 2px;
    }
    .avatar.user-avatar {
      background: #6366f1;
      color: #ffffff;
    }
    .avatar.bot-avatar {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #e5e7eb;
    }

    .message-body {
      flex: 1;
      min-width: 0;
    }
    .message.user .message-body {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .message-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    .message.user .message-header {
      flex-direction: row-reverse;
    }
    .role-label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
    }
    .message.user .role-label {
      color: #6366f1;
    }
    .timestamp {
      font-size: 11px;
      color: #9ca3af;
    }

    .bubble {
      display: inline-block;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.65;
      max-width: 90%;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .message.user .bubble {
      background: #6366f1;
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .bubble {
      background: #f9fafb;
      color: #1a1a1a;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    /* Markdown-like content in assistant bubbles */
    .bubble p { margin-bottom: 0.6em; }
    .bubble p:last-child { margin-bottom: 0; }
    .bubble strong { font-weight: 700; }
    .bubble em { font-style: italic; }
    .bubble code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 12.5px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 1px 5px;
    }
    .bubble pre {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;
    }
    .bubble pre code {
      background: none;
      border: none;
      padding: 0;
      font-size: 12px;
    }
    .bubble ul, .bubble ol {
      padding-left: 20px;
      margin: 6px 0;
    }
    .bubble li { margin-bottom: 2px; }
    .bubble h1, .bubble h2, .bubble h3, .bubble h4 {
      font-weight: 700;
      margin: 10px 0 4px;
    }
    .bubble h1 { font-size: 18px; }
    .bubble h2 { font-size: 16px; }
    .bubble h3 { font-size: 14px; }
    .bubble hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 10px 0;
    }
    .bubble a { color: #6366f1; text-decoration: underline; }

    /* Image attachment */
    .image-attachment {
      max-width: 240px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      margin-bottom: 6px;
    }
    .image-attachment img {
      width: 100%;
      height: auto;
      display: block;
    }
    .image-placeholder {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 5px 10px;
      margin-bottom: 6px;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    /* ── Print styles ── */
    @media print {
      body {
        padding: 20px;
        font-size: 12px;
      }
      .bubble {
        page-break-inside: avoid;
      }
      .message {
        page-break-inside: avoid;
      }
      .footer { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
      <span class="brand-name">DataMug</span>
    </div>
    <h1>${escapeHTML(title)}</h1>
    <div class="header-meta">
      <span>📅 ${exportDate} at ${exportTime}</span>
      <span>🤖 Model: ${modelLabel}</span>
      <span>💬 ${messages.length} message${messages.length !== 1 ? "s" : ""}</span>
    </div>
  </div>

  <div class="messages">
${messagesHTML}
  </div>

  <div class="footer">
    <span>Exported from DataMug — AI Vision Analysis</span>
    <span>Generated ${exportDate}</span>
  </div>
</body>
</html>`;
}

function buildMessageHTML(msg: Message): string {
  const isUser = msg.role === "user";
  const roleClass = isUser ? "user" : "assistant";
  const roleLabel = isUser ? "You" : "DataMug";
  const avatarClass = isUser ? "user-avatar" : "bot-avatar";
  const avatarText = isUser ? "U" : "D";

  const time = new Date(msg.timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build image part
  let imageHTML = "";
  if (msg.image) {
    if (msg.image.startsWith("data:")) {
      // Embed the base64 image directly
      imageHTML = `
      <div class="image-attachment">
        <img src="${msg.image}" alt="Attached image" />
      </div>`;
    } else {
      imageHTML = `
      <div class="image-placeholder">🖼 [Image attached]</div>`;
    }
  }

  // Format content: preserve markdown-ish structure
  const contentHTML = formatMessageContent(msg.content, isUser);

  return `    <div class="message ${roleClass}">
      <div class="avatar ${avatarClass}">${avatarText}</div>
      <div class="message-body">
        <div class="message-header">
          <span class="role-label">${roleLabel}</span>
          <span class="timestamp">${time}</span>
        </div>
        ${imageHTML}
        <div class="bubble">${contentHTML}</div>
      </div>
    </div>`;
}

/**
 * Very lightweight markdown-to-HTML converter for the HTML export.
 * Handles the common subset used in assistant responses.
 */
function formatMessageContent(text: string, isUser: boolean): string {
  if (isUser) {
    // User messages: just escape and preserve newlines
    return escapeHTML(text).replace(/\n/g, "<br />");
  }

  // Assistant: light markdown rendering
  let html = escapeHTML(text);

  // Fenced code blocks (```lang\ncode\n```)
  html = html.replace(
    /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g,
    (_, lang, code) =>
      `<pre><code${lang ? ` class="language-${escapeHTML(lang)}"` : ""}>${code.trimEnd()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold (**text** or __text__)
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic (*text* or _text_)
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Headers (h1–h4)
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rule
  html = html.replace(/^---+$/gm, "<hr />");

  // Unordered lists (- item or * item)
  html = html.replace(/((?:^[*-] .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^[*-] /, "")}</li>`)
      .join("\n");
    return `<ul>\n${items}\n</ul>`;
  });

  // Ordered lists (1. item)
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
      .join("\n");
    return `<ol>\n${items}\n</ol>`;
  });

  // Wrap remaining lines in <p> tags (skip lines already inside HTML tags)
  html = html
    .split(/\n{2,}/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (/^<(h[1-4]|ul|ol|pre|hr|p)/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown format
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a list of messages as clean markdown text.
 */
export function formatAsMarkdown(messages: Message[], title?: string): string {
  const lines: string[] = [];

  if (title) {
    lines.push(`# ${title}`, "");
  }

  lines.push(
    `*Exported from DataMug — ${new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}*`,
    "",
    "---",
    ""
  );

  for (const msg of messages) {
    const role = msg.role === "user" ? "**You**" : "**DataMug**";
    const time = new Date(msg.timestamp).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    lines.push(`${role} · ${time}`);
    lines.push("");

    if (msg.image) {
      lines.push("> 🖼 *[Image attached]*");
      lines.push("");
    }

    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Share text
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a concise shareable summary of a single analysis message.
 * Suitable for pasting into messaging apps, social media, etc.
 */
export function generateShareText(message: Message): string {
  const role = message.role === "user" ? "My prompt" : "DataMug analysis";
  const time = new Date(message.timestamp).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Trim long content to a reasonable share length
  const MAX_SHARE_LENGTH = 500;
  let content = message.content.trim();
  if (content.length > MAX_SHARE_LENGTH) {
    content = content.slice(0, MAX_SHARE_LENGTH).trimEnd() + "…";
  }

  const parts = [
    `${role} (${time}):`,
    "",
    content,
    "",
    "— Analysed with DataMug",
  ];

  if (message.image) {
    parts.splice(1, 0, "🖼 [Image included]");
  }

  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Small delay before cleanup to ensure the click fires
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, "").replace(/\s+/g, "-").slice(0, 80) || "datamug-export";
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
