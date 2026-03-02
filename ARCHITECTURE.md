# DataMug.com — Architecture & Development Plan

## Vision
DataMug is a computer vision application that lets users upload images and get AI-powered analysis using locally-hosted Ollama vision models. Inspired by Moltbot's local-first agentic architecture and Claude Cowork's conversational artifact creation, DataMug provides a clean chat-based interface for image understanding — OCR, object detection, document analysis, and visual Q&A.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      USER BROWSER                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (React 19 + Tailwind CSS)       │  │
│  │  • Image Upload (drag-drop, paste, file picker)   │  │
│  │  • Streaming Chat UI with markdown rendering      │  │
│  │  • Model Selector (dropdown of Ollama models)     │  │
│  │  • Analysis Presets (OCR, Describe, Detect, etc.) │  │
│  │  • Conversation History (localStorage MVP)        │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │ HTTPS POST /api/vision           │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              VERCEL (Edge/Node Runtime)                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js API Routes (Node runtime)                │  │
│  │  • POST /api/vision — Image analysis endpoint     │  │
│  │  • GET  /api/models — List available models       │  │
│  │  • POST /api/chat   — Text-only chat fallback     │  │
│  │                                                   │  │
│  │  Uses OpenAI SDK with baseURL pointing to         │  │
│  │  Ollama's OpenAI-compatible endpoint via tunnel   │  │
│  └───────────────────┬───────────────────────────────┘  │
│                      │ HTTPS via Cloudflare Tunnel       │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           CLOUDFLARE TUNNEL (Encrypted)                  │
│  ollama.datamug.com → localhost:11434                    │
│  • Zero-trust access (optional Cloudflare Access)       │
│  • Free tier, stable subdomain                          │
│  • HTTPS termination handled by Cloudflare              │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           YOUR LOCAL MACHINE / HOME SERVER               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Ollama Server (localhost:11434)                   │  │
│  │  • llava:7b          — General vision analysis    │  │
│  │  • llama3.2-vision   — Advanced multimodal        │  │
│  │  • qwen2.5vl:7b      — Best OCR/doc analysis     │  │
│  │  • minicpm-v         — Lightweight alternative    │  │
│  │                                                   │  │
│  │  OpenAI-compatible API:                           │  │
│  │  POST /v1/chat/completions (with images array)    │  │
│  │  GET  /v1/models                                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                     | Why                                           |
|-------------|--------------------------------|-----------------------------------------------|
| Framework   | Next.js 15 (App Router)        | Full-stack React, SSR, API routes, Vercel-native |
| Language    | TypeScript                     | Type safety, better DX                        |
| Styling     | Tailwind CSS v4                | Utility-first, rapid UI development           |
| AI SDK      | OpenAI JS SDK                  | OpenAI-compatible API works with Ollama       |
| Streaming   | Web Streams API                | Real-time token-by-token response display     |
| Upload      | react-dropzone                 | Drag-drop, paste, file picker                 |
| Markdown    | react-markdown + remark-gfm   | Render AI responses with rich formatting      |
| Icons       | Lucide React                   | Clean, consistent icon set                    |
| LLM Host    | Ollama (local)                 | Free, private, runs vision models locally     |
| Tunnel      | Cloudflare Tunnel (cloudflared)| Free HTTPS tunnel to local Ollama             |
| Hosting     | Vercel (free/pro)              | Zero-config Next.js deployment                |
| Storage     | localStorage (MVP)             | Chat history, no DB needed yet                |
| VCS         | GitHub                         | Version control, Vercel auto-deploy           |

---

## Data Flow

```
1. User drops image + types prompt → Client
2. Client → base64 encodes image → POST /api/vision
3. API route → Builds OpenAI-compatible messages with image_url
4. API route → Calls LLM_ENDPOINT (tunnel URL) /v1/chat/completions
5. Ollama processes image + prompt → Streams tokens back
6. API route → Pipes stream to client via ReadableStream
7. Client → Renders tokens in real-time (typewriter effect)
```

---

## Environment Variables

| Variable        | Dev Value                        | Prod Value (Vercel)                    |
|-----------------|----------------------------------|----------------------------------------|
| LLM_ENDPOINT    | http://localhost:11434/v1        | https://ollama.datamug.com/v1          |
| OPENAI_API_KEY  | ollama                           | ollama (dummy, not checked)            |
| MODEL           | llava:7b                         | llava:7b (or user-selectable)          |
| NEXT_PUBLIC_APP | DataMug                          | DataMug                               |

---

## 2-Week MVP Development Plan

### Week 1: Core Engine

| Day | Tasks | Deliverable | Milestone |
|-----|-------|-------------|-----------|
| **Day 1** | Project scaffold, deps, API route, basic UI, env config | Working local prototype | ✅ Milestone 1: "Hello Vision" — image → Ollama → response |
| **Day 2** | Streaming UI, markdown rendering, loading states | Streaming chat experience | |
| **Day 3** | Image handling (resize, paste, multiple formats), model selector | Polished upload UX | |
| **Day 4** | Analysis presets (OCR, Describe, Detect Objects, Analyze Document) | Preset buttons working | ✅ Milestone 2: Core Features Complete |
| **Day 5** | Conversation history (multi-turn), localStorage persistence | Chat threads | |
| **Day 6** | Error handling, retry logic, timeout management | Robust error states | |
| **Day 7** | Cloudflare Tunnel setup, Vercel deploy, end-to-end test | **MVP staging live** | ✅ Milestone 3: Deployed to Vercel + Tunnel |

### Week 2: Polish & Ship

| Day | Tasks | Deliverable | Milestone |
|-----|-------|-------------|-----------|
| **Day 8** | Responsive design (mobile/tablet), dark mode | Mobile-ready UI | |
| **Day 9** | Multi-image support, image comparison analysis | Side-by-side analysis | ✅ Milestone 4: Multi-image Support |
| **Day 10** | Export/share results (copy, download as PDF/text) | Export functionality | |
| **Day 11** | Performance optimization (image compression, lazy loading) | Fast load times | |
| **Day 12** | Landing page for datamug.com, SEO meta tags | Public-facing landing | ✅ Milestone 5: Public Landing Page |
| **Day 13** | Security (rate limiting, input validation, tunnel auth) | Hardened for public use | |
| **Day 14** | Full testing, documentation, README, launch prep | **MVP Ready** | ✅ Milestone 6: MVP Launch |

---

## Recommended Ollama Vision Models

| Model | Size | Best For | Pull Command |
|-------|------|----------|--------------|
| llava:7b | ~4.7 GB | General vision, fast | `ollama pull llava:7b` |
| llama3.2-vision | ~7.9 GB | Advanced reasoning | `ollama pull llama3.2-vision` |
| qwen2.5vl:7b | ~6 GB | OCR, documents, charts | `ollama pull qwen2.5vl:7b` |
| minicpm-v | ~5.5 GB | Lightweight, fast | `ollama pull minicpm-v` |

---

## Cost Analysis

| Item | Cost |
|------|------|
| Ollama (local) | Free |
| Cloudflare Tunnel | Free |
| Vercel (Hobby) | Free (100GB bandwidth) |
| Vercel (Pro) | $20/mo if needed |
| Domain (datamug.com) | ~$12/year |
| GitHub | Free |
| **Total MVP Cost** | **$0 — $12/year (domain only)** |
