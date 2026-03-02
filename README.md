# DataMug — AI Vision Analysis

Upload images. Get AI-powered analysis. Runs entirely on your hardware.

DataMug is a computer vision application built with Next.js that connects to locally-hosted Ollama vision models. Your images never leave your network.

## Features

- **Image Analysis** — Drag-drop, paste, or browse to upload images
- **Vision AI** — Uses Ollama vision models (LLaVA, Llama 3.2 Vision, Qwen2.5-VL)
- **Streaming Responses** — Real-time token-by-token analysis display
- **Analysis Presets** — One-click OCR, object detection, document analysis
- **Model Selector** — Switch between installed Ollama vision models
- **Conversation History** — Multi-turn conversations with context
- **Privacy First** — All processing happens locally on your machine
- **Dark Mode** — Automatic based on system preference

## Quick Start

### Prerequisites

1. **Install Ollama**: [ollama.com](https://ollama.com)
2. **Pull a vision model**:
   ```bash
   ollama pull llava:7b
   # Or for better OCR/document analysis:
   ollama pull qwen2.5vl:7b
   ```
3. **Start Ollama**:
   ```bash
   ollama serve
   ```

### Run DataMug

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/datamug.git
cd datamug

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment (Vercel + Cloudflare Tunnel)

### 1. Set up Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ollama-tunnel

# Configure (create ~/.cloudflared/config.yml)
tunnel: <TUNNEL_UUID>
credentials-file: ~/.cloudflared/<TUNNEL_UUID>.json
ingress:
  - hostname: ollama.datamug.com
    service: http://localhost:11434
    originRequest:
      httpHostHeader: "localhost:11434"
  - service: http_status:404

# Route DNS
cloudflared tunnel route dns ollama-tunnel ollama.datamug.com

# Run tunnel
cloudflared tunnel run ollama-tunnel
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set environment variables in Vercel dashboard:
- `LLM_ENDPOINT` = `https://ollama.datamug.com/v1`
- `OPENAI_API_KEY` = `ollama`
- `DEFAULT_MODEL` = `llava:7b`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI Client | OpenAI JS SDK (Ollama-compatible) |
| LLM Host | Ollama (local) |
| Tunnel | Cloudflare Tunnel |
| Hosting | Vercel |

## Recommended Vision Models

| Model | Size | Best For |
|-------|------|----------|
| llava:7b | ~4.7 GB | General vision, fast |
| llama3.2-vision | ~7.9 GB | Advanced reasoning |
| qwen2.5vl:7b | ~6 GB | OCR, documents, charts |
| minicpm-v | ~5.5 GB | Lightweight, fast |

## License

MIT
