import Link from "next/link";
import { Coffee, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex items-center justify-center min-h-screen p-6"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <div className="text-center max-w-md">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "var(--color-accent)" }}
        >
          <Coffee size={28} color="white" />
        </div>
        <h1 className="text-5xl font-bold mb-2">404</h1>
        <p
          className="text-base mb-6"
          style={{ color: "var(--color-text-secondary)" }}
        >
          This page doesn't exist. Maybe the mug is empty.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
            }}
          >
            <ArrowLeft size={14} />
            Home
          </Link>
          <Link
            href="/chat"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            Open App
          </Link>
        </div>
      </div>
    </div>
  );
}
