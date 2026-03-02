# DataMug — Private AI Vision Analysis

**AI-powered image analysis using local vision models via Ollama. 100% private — your images never leave your network.**

Live at [mugdata.com](https://mugdata.com) | [GitHub](https://github.com/Kalisiyatrust/DataMug)

---

## Features

- **Vision AI Analysis** — Upload images for OCR, object detection, document parsing, visual Q&A
- **100% Private** — All processing happens through your local Ollama instance
- **Multi-Image Compare** — Upload up to 4 images for side-by-side comparison
- **Conversational** — Follow-up questions with full conversation context
- **Multiple Models** — Switch between LLaVA, Qwen2.5-VL, MiniCPM-V, and more
- **Dark Mode** — System-aware + manual toggle
- **Export & Share** — Copy, download as HTML/text, share analysis results
- **Responsive** — Works on desktop, tablet, and mobile
- **Thread Management** — Multiple conversation threads with import/export

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **AI Backend**: Ollama (local) via OpenAI-compatible API
- **Network**: Cloudflare Tunnel for secure HTTPS exposure
- **Hosting**: Vercel
- **Domain**: mugdata.com

## Architecture

```
Browser (mugdata.com)
  ↓ HTTPS
Vercel (Next.js API Routes)
  ↓ HTTPS
Cloudflare Tunnel
  ↓ HTTP
Local Ollama (localhost:11434)
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

### Supported Vision Models

| Model | Size | Best For |
|---|---|---|
| `llava:7b` | 4.7 GB | General vision, good balance |
| `llava:13b` | 8.0 GB | Higher accuracy, slower |
| `llama3.2-vision` | 7.9 GB | Latest Llama vision capabilities |
| `qwen2.5vl:7b` | 5.3 GB | Strong OCR and document analysis |
| `minicpm-v` | 5.1 GB | Efficient, good quality |
| `moondream2` | 1.8 GB | Lightweight, fastest |

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── layout.tsx            # Root layout with SEO metadata
│   ├── globals.css           # CSS variables, dark mode, animations
│   ├── chat/
│   │   └── page.tsx          # Chat application page
│   └── api/
│       ├── vision/route.ts   # Vision API with streaming, rate limiting
│       ├── models/route.ts   # Model listing endpoint
│       └── health/route.ts   # Health check endpoint
├── components/
│   ├── chat-interface.tsx    # Main chat UI with threads, multi-image
│   ├── message-bubble.tsx    # Message display with markdown, share menu
│   ├── multi-image-upload.tsx # Multi-image drag & drop upload
│   ├── share-menu.tsx        # Export/share dropdown menu
│   ├── theme-toggle.tsx      # Dark mode toggle (light/dark/system)
│   ├── optimized-image.tsx   # Lazy-loaded images with IntersectionObserver
│   ├── thread-sidebar.tsx    # Thread management sidebar
│   ├── model-selector.tsx    # Model selection dropdown
│   └── ...                   # Other UI components
├── hooks/
│   └── use-virtualized-messages.ts  # Message windowing for performance
├── lib/
│   ├── ollama-client.ts      # OpenAI SDK client for Ollama
│   ├── constants.ts          # Prompts, presets, config
│   ├── threads.ts            # Thread CRUD (localStorage)
│   ├── image-utils.ts        # Image compression & processing
│   ├── export-utils.ts       # Export to HTML/text/markdown
│   ├── comparison-presets.ts # Multi-image comparison presets
│   ├── rate-limit.ts         # Sliding window rate limiter
│   └── validation.ts         # Input sanitization utilities
├── types/
│   └── index.ts              # TypeScript interfaces
└── middleware.ts             # Security headers, CSP, blocked paths
```

## Development Timeline

### Week 1 (Foundation)
- **Day 1**: Project scaffold, Next.js 15, Ollama streaming API
- **Day 2**: Streaming polish, error handling, UX improvements
- **Day 3-4**: Image handling, model selector, conversation threads
- **Day 5-7**: Thread polish, error recovery, deployment to Vercel

### Week 2 (Polish & Launch)
- **Day 8**: Responsive design, dark mode toggle, mobile sidebar
- **Day 9**: Multi-image upload, comparison mode, presets
- **Day 10**: Export/share menu (clipboard, HTML, text, markdown)
- **Day 11**: Performance (lazy loading, message virtualization, optimized images)
- **Day 12**: Landing page with SEO/OpenGraph
- **Day 13**: Security (rate limiting, input validation, CSP, middleware)
- **Day 14**: Documentation, testing, launch prep

## Security

- **Rate Limiting**: 30 requests/minute per IP on vision API
- **Input Validation**: Message sanitization, model name validation, history limits
- **CSP Headers**: Restrictive Content Security Policy via middleware
- **Security Headers**: HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff
- **Blocked Paths**: Common attack vectors (wp-admin, .env, .git) return 404
- **Privacy**: No telemetry, no analytics, no cookies. Images processed locally only.

## License

MIT

---

Built with Next.js, Ollama, and Cloudflare Tunnel. Deployed on Vercel.
