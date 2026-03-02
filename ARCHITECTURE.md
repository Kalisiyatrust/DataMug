# DataMug Architecture

## Overview

DataMug is a privacy-first AI vision analysis application. Users upload images through a web interface hosted on Vercel, which proxies requests through a Cloudflare Tunnel to a local Ollama instance running vision models.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User's Browser                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js App (React, TypeScript, Tailwind)       │  │
│  │  - Landing page (/)                              │  │
│  │  - Chat interface (/chat)                        │  │
│  │  - Image upload, compression, preview            │  │
│  │  - Thread management (localStorage)              │  │
│  │  - Markdown rendering, export                    │  │
│  └───────────────┬──────────────────────────────────┘  │
│                   │ HTTPS                               │
└───────────────────┼─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Vercel Edge Network                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js Middleware (Edge Runtime)                │  │
│  │  - Security headers (CSP, HSTS, etc.)            │  │
│  │  - Blocked path filtering                        │  │
│  └───────────────┬──────────────────────────────────┘  │
│                   ↓                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │  API Routes (Node.js Runtime)                     │  │
│  │  /api/vision  — Streaming chat completion         │  │
│  │  /api/models  — List available Ollama models      │  │
│  │  /api/health  — Health check                      │  │
│  │                                                    │  │
│  │  Features:                                        │  │
│  │  - Rate limiting (30 req/min/IP)                  │  │
│  │  - Input validation & sanitization                │  │
│  │  - Retry with exponential backoff                 │  │
│  │  - Server-Sent Events streaming                   │  │
│  │  - Multi-image support                            │  │
│  └───────────────┬──────────────────────────────────┘  │
│                   │ HTTPS (OpenAI-compatible API)        │
└───────────────────┼─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Tunnel (HTTPS → HTTP bridge)                 │
│  Endpoint: https://ollama.mugdata.com                    │
│  Maps to: http://localhost:11434                         │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  User's Local Machine                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Ollama (localhost:11434)                         │  │
│  │  - llava:7b, llama3.2-vision, qwen2.5vl, etc.   │  │
│  │  - GPU-accelerated inference                      │  │
│  │  - OpenAI-compatible /v1/chat/completions API     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Image Analysis Request
1. User uploads image(s) → compressed client-side via canvas (max 1024px, JPEG 80%)
2. Base64 data URL(s) + text prompt sent to `/api/vision`
3. Middleware applies security headers
4. Rate limiter checks IP-based request count
5. Input validator sanitizes message, model name, history
6. OpenAI SDK forwards to Ollama endpoint via Cloudflare Tunnel
7. Ollama processes with selected vision model
8. Response streams back via SSE (Server-Sent Events)
9. Client renders markdown incrementally during streaming

### Thread Persistence
- All conversation data stored in browser localStorage
- Thread format: `{ id, title, messages[], model, createdAt, pinned }`
- Export/import as JSON for cross-device portability
- No server-side storage — zero data collection

## Key Design Decisions

| Decision | Rationale |
|---|---|
| OpenAI SDK for Ollama | Ollama exposes an OpenAI-compatible API; using the official SDK gives us streaming, retries, and type safety for free |
| Cloudflare Tunnel | Avoids exposing Ollama directly; provides HTTPS, DDoS protection, and zero-trust access |
| Client-side image compression | Reduces upload size by 70-90% before sending to API; keeps bandwidth costs low |
| localStorage for threads | No server-side storage needed; data stays fully on the user's device |
| CSS variables for theming | Enables dark mode toggle without Tailwind dark: prefixes; cleaner, more maintainable |
| Sliding window rate limiter | Simple, effective, no external dependencies; suitable for single-instance Vercel deployment |
| Middleware for security | Edge runtime for minimal latency; CSP + HSTS + blocked paths applied globally |

## Performance Optimizations

- **Message virtualization**: Only renders last 30 messages; older messages lazy-loaded on demand
- **Lazy image loading**: IntersectionObserver defers base64 decode until image enters viewport
- **Image compression**: Client-side resize + JPEG compression before upload
- **Security headers**: Immutable caching for static assets (1 year)
- **Console stripping**: Production builds remove console.log statements via SWC compiler

## Security Layers

1. **Edge Middleware**: CSP, HSTS, Permissions-Policy, X-Frame-Options, blocked paths
2. **API Rate Limiting**: Sliding window counter, 30 req/min/IP
3. **Input Validation**: Message length limits, model name allowlist, history sanitization
4. **Image Validation**: Size limits (10MB), format validation, per-image array checks
5. **Network**: Cloudflare Tunnel provides TLS, DDoS protection, access controls
6. **Privacy**: No cookies, no analytics, no telemetry, no server-side storage

## Environment Configuration

```env
# Required
LLM_ENDPOINT=https://ollama.mugdata.com/v1
OPENAI_API_KEY=ollama
DEFAULT_MODEL=llava:7b
```

## Domain Configuration

- **Primary**: mugdata.com (Vercel)
- **Tunnel**: ollama.mugdata.com (Cloudflare Tunnel → localhost:11434)
- **Vercel URL**: data-mug.vercel.app (also works)
