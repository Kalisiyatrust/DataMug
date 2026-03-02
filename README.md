# DataMug — Private AI Vision Analysis

**AI-powered image analysis using local vision models via Ollama. 100% private — your images never leave your network.**

Live at [mugdata.com](https://mugdata.com) | [GitHub](https://github.com/Kalisiyatrust/DataMug)

---

## Features

### Core
- **Vision AI Analysis** — Upload images for OCR, object detection, document parsing, visual Q&A
- **100% Private** — All processing happens through your local Ollama instance
- **Multi-Image Compare** — Upload up to 4 images for side-by-side comparison
- **Conversational** — Follow-up questions with full conversation context
- **Multiple Models** — Switch between LLaVA, Qwen2.5-VL, MiniCPM-V, and more
- **Dark Mode** — System-aware + manual toggle
- **Export & Share** — Copy, download as HTML/text, share analysis results
- **Responsive** — Works on desktop, tablet, and mobile
- **Thread Management** — Multiple conversation threads with import/export

### Advanced (Week 3)
- **Prompt Templates** — 12 built-in templates + create your own custom templates, organized by category
- **Image Gallery** — Persistent gallery of all analyzed images with thumbnails, tags, and search
- **Batch Analysis** — Queue multiple images for sequential analysis with the same prompt
- **Command Palette** — `⌘K` to access any feature instantly, with keyboard shortcuts
- **Settings Panel** — Default model, theme, context window size, auto-save preferences
- **Analytics Dashboard** — Track analyses count, models used, response times, daily activity, streaks
- **PWA Support** — Install as a native app on desktop/mobile, offline fallback page
- **Error Boundary** — Graceful error handling with recovery
- **404 Page** — Custom not-found page

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **AI Backend**: Ollama (local) via OpenAI-compatible API
- **Network**: Cloudflare Tunnel for secure HTTPS exposure
- **Hosting**: Vercel
- **Domain**: mugdata.com

### WhatsApp Marketing Suite (v0.4.0)
- **Multi-Brand Support** — Three brands: Kalisiya Foundation, Eloi Consulting, DataMug, each with its own WhatsApp number and AI persona
- **AI Conversational Engine** — Ollama-powered chatbot that responds like a human, qualifies leads, positions services, and handles objections
- **CRM & Contact Management** — Import contacts from CSV, manual entry, tagging, lead scoring (0-100), stage tracking (new → converted)
- **Campaign Manager** — Create campaigns with message templates, target by tags/stages, schedule sends, track delivery/read/reply rates
- **Drip Sequences** — Multi-step automated follow-up sequences with conditions (no reply, replied, any)
- **WhatsApp Conversations** — Real-time chat interface, AI-suggested replies, message history
- **Marketing Analytics** — Dashboard with KPIs, lead funnel, brand breakdown, message volume
- **Twilio Integration** — Webhook for inbound messages, delivery status tracking, rate-limited sending
- **Template System** — Pre-built and custom message templates with variable substitution ({{name}}, {{company}}, etc.)

## Architecture

```
Browser (mugdata.com)
  ↓ HTTPS
Vercel (Next.js API Routes)
  ↓ HTTPS
Cloudflare Tunnel              Twilio WhatsApp API
  ↓ HTTP                         ↕ Webhook
Local Ollama (localhost:11434)  /api/whatsapp/webhook
```

## Quick Start

### Prerequisites

1. [Ollama](https://ollama.ai) installed locally
2. A vision model pulled: `ollama pull llava:7b`
3. [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (for remote access)

### Local Development

```bash
# Clone the repository
git clone https://github.com/Kalisiyatrust/DataMug.git
cd DataMug

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Ollama tunnel URL

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `LLM_ENDPOINT` | Ollama API endpoint URL | `https://ollama.mugdata.com/v1` |
| `OPENAI_API_KEY` | API key for Ollama (any string) | `ollama` |
| `DEFAULT_MODEL` | Default vision model | `llava:7b` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | — |
| `TWILIO_AUTH_TOKEN` | Twilio account auth token | — |
| `NEXT_PUBLIC_BASE_URL` | Public URL for webhook | `https://mugdata.com` |

### Supported Vision Models

| Model | Size | Best For |
|---|---|---|
| `llava:7b` | 4.7 GB | General vision, good balance |
| `llava:13b` | 8.0 GB | Higher accuracy, slower |
| `llama3.2-vision` | 7.9 GB | Latest Llama vision capabilities |
| `qwen2.5vl:7b` | 5.3 GB | Strong OCR and document analysis |
| `minicpm-v` | 5.1 GB | Efficient, good quality |
| `moondream2` | 1.8 GB | Lightweight, fastest |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘N` | New chat |
| `⌘T` | Prompt templates |
| `⌘G` | Image gallery |
| `⌘,` | Settings |
| `⌘⇧V` | Upload image |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Esc` | Stop generation |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout with SEO metadata
│   ├── not-found.tsx         # 404 page
│   ├── globals.css           # CSS variables, dark mode, animations
│   ├── sitemap.ts            # Dynamic sitemap
│   ├── chat/
│   │   └── page.tsx          # Chat application page
│   ├── whatsapp/             # WhatsApp Marketing Dashboard
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── layout-client.tsx # Client-side sidebar navigation
│   │   ├── page.tsx          # Analytics dashboard
│   │   ├── conversations/    # WhatsApp chat interface
│   │   ├── contacts/         # CRM contact management
│   │   ├── campaigns/        # Campaign manager
│   │   ├── templates/        # Message template editor
│   │   └── settings/         # System settings
│   └── api/
│       ├── vision/route.ts   # Vision API with streaming
│       ├── models/route.ts   # Model listing endpoint
│       ├── health/route.ts   # Health check endpoint
│       └── whatsapp/         # WhatsApp API routes
│           ├── webhook/      # Twilio inbound webhook
│           ├── send/         # Manual message sending
│           ├── contacts/     # Contact CRUD + CSV import
│           ├── campaigns/    # Campaign management
│           ├── templates/    # Template CRUD
│           ├── analytics/    # Marketing analytics
│           └── status/       # Delivery status callback
├── components/
│   ├── whatsapp/             # WhatsApp Marketing components
│   │   ├── brand-badge.tsx   # Brand indicator with colors
│   │   ├── stage-badge.tsx   # Lead stage badges
│   │   ├── score-indicator.tsx # Lead score display
│   │   ├── contact-form.tsx  # Contact create/edit form
│   │   ├── csv-import-modal.tsx # CSV import wizard
│   │   ├── template-editor.tsx # Template editor with preview
│   │   └── message-bubble.tsx # WhatsApp-style message bubbles
│   ├── chat-interface.tsx    # Main chat UI (orchestrates all features)
│   ├── message-bubble.tsx    # Message display with markdown
│   ├── image-upload.tsx      # Single image upload with drag-drop
│   ├── multi-image-upload.tsx # Multi-image comparison mode
│   ├── model-selector.tsx    # Model dropdown with capabilities
│   ├── preset-buttons.tsx    # Quick analysis preset buttons
│   ├── thread-sidebar.tsx    # Thread list with search, import/export
│   ├── connection-banner.tsx # Ollama connection status
│   ├── theme-toggle.tsx      # Dark/light mode toggle
│   ├── empty-state.tsx       # Welcome screen
│   ├── typing-indicator.tsx  # AI thinking animation
│   ├── share-menu.tsx        # Export/share options
│   ├── template-library.tsx  # Prompt template browser (Week 3)
│   ├── image-gallery.tsx     # Image gallery modal (Week 3)
│   ├── batch-analysis.tsx    # Batch image analysis (Week 3)
│   ├── command-palette.tsx   # ⌘K command palette (Week 3)
│   ├── settings-panel.tsx    # App settings (Week 3)
│   ├── analytics-dashboard.tsx # Usage analytics (Week 3)
│   ├── error-boundary.tsx    # Error boundary (Week 3)
│   ├── lazy-components.tsx   # Code-split dynamic imports
│   └── optimized-image.tsx   # Lazy-loaded images
├── hooks/
│   └── use-virtualized-messages.ts # Virtual scrolling
├── lib/
│   ├── constants.ts          # Presets, system prompt, model capabilities
│   ├── threads.ts            # Thread CRUD, import/export
│   ├── ollama-client.ts      # OpenAI SDK wrapper for Ollama
│   ├── image-utils.ts        # Client-side image processing
│   ├── export-utils.ts       # Export to HTML/text
│   ├── comparison-presets.ts # Multi-image comparison prompts
│   ├── rate-limit.ts         # IP-based rate limiting
│   ├── validation.ts         # Input sanitization
│   ├── prompt-templates.ts   # Template CRUD (Week 3)
│   ├── gallery.ts            # Image gallery store (Week 3)
│   ├── analytics.ts          # Usage tracking (Week 3)
│   ├── brands.ts             # Multi-brand WhatsApp config
│   ├── twilio-client.ts      # Twilio REST API client
│   ├── crm-store.ts          # CRM JSON data store
│   ├── ai-responder.ts       # AI conversational engine
│   └── campaign-engine.ts    # Campaign & drip management
├── middleware.ts              # Security headers, CSP, path blocking
└── types/
    ├── index.ts              # Vision TypeScript interfaces
    └── whatsapp.ts           # WhatsApp/CRM type definitions
public/
├── manifest.json             # PWA manifest (Week 3)
├── sw.js                     # Service worker (Week 3)
├── offline.html              # Offline fallback (Week 3)
├── favicon.svg               # SVG favicon
├── robots.txt                # SEO robots
└── icons/                    # PWA icons (Week 3)
```

## Development Timeline

- **Week 1 (Days 1-7)**: Core chat UI, vision API, streaming, image handling, threads, presets, deployment
- **Week 2 (Days 8-14)**: Responsive design, multi-image, export/share, optimizations, landing page, security, docs
- **Week 3 (Days 15-21)**: Templates, gallery, batch analysis, command palette, settings, analytics, PWA, polish
- **Week 4 (v0.4.0)**: WhatsApp Marketing Suite — multi-brand CRM, AI chatbot, campaigns, drip sequences, Twilio integration

## License

MIT
