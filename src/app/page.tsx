import Link from "next/link";
import {
  Eye,
  Shield,
  Zap,
  Upload,
  MessageSquare,
  Layers,
  ArrowRight,
  Coffee,
  Github,
  MessageCircle,
} from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    title: "Vision AI Analysis",
    description:
      "Upload any image and get detailed AI-powered analysis. OCR, object detection, document parsing, and visual Q&A.",
  },
  {
    icon: Shield,
    title: "100% Private",
    description:
      "Your images are processed locally through Ollama. Nothing leaves your network. No cloud storage, no data collection.",
  },
  {
    icon: Zap,
    title: "Fast & Free",
    description:
      "No API costs, no rate limits, no subscriptions. Run as many analyses as you want on your own hardware.",
  },
  {
    icon: Upload,
    title: "Multi-Image Compare",
    description:
      "Upload up to 4 images at once for side-by-side comparison, spot-the-difference, and timeline analysis.",
  },
  {
    icon: MessageSquare,
    title: "Conversational",
    description:
      "Ask follow-up questions about your images. DataMug remembers context across your entire conversation thread.",
  },
  {
    icon: Layers,
    title: "Multiple Models",
    description:
      "Switch between vision models like LLaVA, Qwen2.5-VL, and MiniCPM-V. Use the best model for each task.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Install Ollama",
    description: "Download and run Ollama on your machine with a vision model.",
    code: "ollama pull llava:7b",
  },
  {
    step: "2",
    title: "Connect via Tunnel",
    description:
      "Set up a Cloudflare Tunnel to securely expose your local Ollama instance.",
    code: "cloudflared tunnel --url http://localhost:11434",
  },
  {
    step: "3",
    title: "Start Analysing",
    description:
      "Open mugdata.com, upload an image, and get instant AI-powered analysis.",
    code: null,
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* Nav */}
      <nav
        className="border-b sticky top-0 z-50 backdrop-blur-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "color-mix(in srgb, var(--color-bg) 90%, transparent)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--color-accent)" }}
            >
              <Coffee size={18} color="white" />
            </div>
            <span className="text-base font-semibold">DataMug</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Kalisiyatrust/DataMug"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors duration-200"
              style={{ color: "var(--color-text-secondary)" }}
              title="GitHub"
            >
              <Github size={18} />
            </a>
            <Link
              href="/whatsapp"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 border"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
              }}
            >
              <MessageCircle size={14} className="text-green-600" />
              WhatsApp
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              style={{
                background: "var(--color-accent)",
                color: "white",
              }}
            >
              Open App
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-6"
          style={{
            background: "var(--color-accent-light)",
            color: "var(--color-accent)",
          }}
        >
          <Shield size={12} />
          100% Private — Your images never leave your network
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight mb-4">
          AI Vision Analysis
          <br />
          <span style={{ color: "var(--color-accent)" }}>
            on Your Own Terms
          </span>
        </h1>

        <p
          className="text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Upload images and get instant AI-powered analysis using local vision
          models. OCR, document scanning, object detection, and visual Q&A — all
          running on your hardware.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-all duration-200"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            Start Analysing
            <ArrowRight size={16} />
          </Link>
          <a
            href="https://github.com/Kalisiyatrust/DataMug"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium border transition-all duration-200"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          >
            <Github size={16} />
            View on GitHub
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        className="border-t py-16 sm:py-20"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Everything you need for image analysis
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-5 rounded-xl border transition-colors duration-200"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{
                    background: "var(--color-accent-light)",
                    color: "var(--color-accent)",
                  }}
                >
                  <feature.icon size={20} />
                </div>
                <h3 className="text-base font-semibold mb-1.5">
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Get started in 3 steps
          </h2>

          <div className="space-y-6">
            {STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-4 p-5 rounded-xl border"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                  }}
                >
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold mb-1">
                    {step.title}
                  </h3>
                  <p
                    className="text-sm mb-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {step.description}
                  </p>
                  {step.code && (
                    <code
                      className="inline-block text-xs px-3 py-1.5 rounded-lg"
                      style={{
                        background: "var(--color-surface-hover)",
                        color: "var(--color-text)",
                        fontFamily: '"SF Mono", "Fira Code", monospace',
                      }}
                    >
                      {step.code}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported models */}
      <section
        className="border-t py-16 sm:py-20"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Works with popular vision models
          </h2>
          <p
            className="text-base mb-8"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Any Ollama-compatible vision model works out of the box.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "llava:7b",
              "llava:13b",
              "llama3.2-vision",
              "qwen2.5vl:7b",
              "minicpm-v",
              "moondream2",
            ].map((model) => (
              <span
                key={model}
                className="px-4 py-2 rounded-lg text-sm font-mono border"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to analyse your images?
          </h2>
          <p
            className="text-base mb-8"
            style={{ color: "var(--color-text-secondary)" }}
          >
            No signup required. No data collection. Just upload and analyse.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            Open DataMug
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* WhatsApp CTA floating badge */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link
          href="/whatsapp"
          className="flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium transition-all duration-200 hover:scale-105"
          style={{
            background: "#16a34a",
            color: "white",
          }}
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">WhatsApp Dashboard</span>
        </Link>
      </div>

      {/* Footer */}
      <footer
        className="border-t py-8"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coffee size={16} style={{ color: "var(--color-accent)" }} />
            <span
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              DataMug — Open Source AI Vision Analysis
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Kalisiyatrust/DataMug"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-colors duration-200"
              style={{ color: "var(--color-text-secondary)" }}
            >
              GitHub
            </a>
            <Link
              href="/chat"
              className="text-sm transition-colors duration-200"
              style={{ color: "var(--color-accent)" }}
            >
              Open App
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
