# DataMug — AI Vision Analysis

Upload images and get AI-powered analysis using locally-hosted Ollama vision models. OCR, object detection, document analysis, and visual Q&A — all running on your own hardware.

## Features

- **Image Analysis** — Drag-drop, paste, or upload images for AI analysis
- **Streaming Responses** — Real-time token-by-token display
- **Multiple Models** — Support for LLaVA, Llama 3.2 Vision, Qwen 2.5 VL, MiniCPM-V
- **Analysis Presets** — One-click OCR, Describe, Detect Objects, Analyze Document
- **Conversation Threads** — Multi-turn conversations with context
- **Thread Management** — Pin, search, rename, export/import conversations
- **Multi-turn Image Context** — Ask follow-up questions about uploaded images
- **Dark Mode** — Automatic system theme detection
- **Private** — Your images never leave your network (processed locally via Ollama)
- **Free** — $0 running cost (Ollama + Cloudflare Tunnel + Vercel Hobby)

## Architecture

```
Browser → Vercel (API Routes) → Cloudflare Tunnel (HTTPS) → Local Ollama (localhost:11434)
```

## Quick Start (Local Development)

### Prerequisites

- **Node.js** 18+
- **Ollama** installed and running (`ollama serve`)
- A vision model pulled: `ollama pull llava:7b`

### Install & Run

```bash
git clone https://github.com/Kalisiyatrust/DataMug.git
cd DataMug
npm install
cp .env.example .env.local
# Edit .env.local to set LLM_ENDPOINT=http://localhost:11434/v1
npm run dev
```

Open http://localhost:3000 and start analyzing images.

## Vercel Deployment

### 1. Connect GitHub Repo

1. Go to [vercel.com](https://vercel.com) → Import Project
2. Select `Kalisiyatrust/DataMug` repository
3. Framework Preset: **Next.js** (auto-detected)

### 2. Set Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable | Value | Notes |
|---|---|---|
| `LLM_ENDPOINT` | `https://ollama.mugdata.com/v1` | Your Cloudflare Tunnel URL |
| `OPENAI_API_KEY` | `ollama` | Dummy key (Ollama doesn't validate) |
| `DEFAULT_MODEL` | `llava:7b` | Default model for new users |

### 3. Custom Domain

Add `mugdata.com` (or your domain) in Vercel project settings → Domains.

### 4. Deploy

Push to `main` branch triggers automatic deployment.

## Cloudflare Tunnel Setup

The tunnel exposes your local Ollama server to the internet securely, so Vercel's serverless functions can reach it.

### Install cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux (Debian/Ubuntu)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Windows
winget install --id Cloudflare.cloudflared
```

### Quick Tunnel (Testing)

```bash
# Start a quick tunnel (gives a random URL)
cloudflared tunnel --url http://localhost:11434
```

This prints a URL like `https://random-words.trycloudflare.com`. Use this + `/v1` as your `LLM_ENDPOINT`.

### Named Tunnel (Production — Recommended)

```bash
# 1. Login to Cloudflare
cloudflared tunnel login

# 2. Create a named tunnel
cloudflared tunnel create ollama-tunnel

# 3. Configure DNS (creates ollama.mugdata.com)
cloudflared tunnel route dns ollama-tunnel ollama.mugdata.com

# 4. Create config file (~/.cloudflared/config.yml)
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: ollama-tunnel
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: ollama.mugdata.com
    service: http://localhost:11434
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF

# 5. Run the tunnel
cloudflared tunnel run ollama-tunnel
```

### Run as System Service

```bash
# Install as a service (auto-start on boot)
sudo cloudflared service install

# Or on macOS
sudo cloudflared service install
launchctl start com.cloudflare.cloudflared
```

### Verify Tunnel

```bash
# Test from any machine
curl https://ollama.mugdata.com/api/tags
# Should return list of Ollama models
```

### Security (Optional)

To restrict access to your tunnel, use [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/):

1. Go to Cloudflare Zero Trust dashboard
2. Create an Access Application for `ollama.mugdata.com`
3. Set a service token policy
4. Add the service token to Vercel as `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`

## Health Check

DataMug provides a health endpoint:

```bash
curl https://mugdata.com/api/health
```

Returns:
```json
{
  "status": "ok",
  "app": "DataMug",
  "version": "0.1.0",
  "timestamp": "2026-03-02T18:00:00Z",
  "ollama": {
    "status": "connected",
    "endpoint": "https://ollama.mugdata.com/v1",
    "models": 3
  }
}
```

## Recommended Vision Models

| Model | Size | Best For | Pull Command |
|-------|------|----------|-------------|
| llava:7b | ~4.7 GB | General vision, fast | `ollama pull llava:7b` |
| llama3.2-vision | ~7.9 GB | Advanced reasoning | `ollama pull llama3.2-vision` |
| qwen2.5vl:7b | ~6 GB | OCR, documents, charts | `ollama pull qwen2.5vl:7b` |
| minicpm-v | ~5.5 GB | Lightweight, fast | `ollama pull minicpm-v` |

## Cost

| Item | Cost |
|------|------|
| Ollama (local) | Free |
| Cloudflare Tunnel | Free |
| Vercel (Hobby) | Free |
| Domain | ~$12/year |
| **Total** | **$0 — $12/year** |

## Tech Stack

- **Framework**: Next.js 15 (App Router), TypeScript
- **Styling**: Tailwind CSS v4
- **AI SDK**: OpenAI JS SDK → Ollama's OpenAI-compatible API
- **Streaming**: Web Streams API (SSE)
- **Upload**: react-dropzone
- **Markdown**: react-markdown + remark-gfm
- **Icons**: Lucide React
- **Hosting**: Vercel
- **LLM**: Ollama (local) via Cloudflare Tunnel
