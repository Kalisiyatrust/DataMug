"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("DataMug Error Boundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex items-center justify-center min-h-screen p-6"
          style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
        >
          <div className="text-center max-w-md">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-error, #fef2f2)" }}
            >
              <AlertTriangle
                size={28}
                style={{ color: "var(--color-error, #ef4444)" }}
              />
            </div>
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p
              className="text-sm mb-1"
              style={{ color: "var(--color-text-secondary)" }}
            >
              DataMug encountered an unexpected error.
            </p>
            {this.state.error && (
              <p
                className="text-xs font-mono mb-4 p-2 rounded-lg"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {this.state.error.message.slice(0, 200)}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: "var(--color-accent)",
                color: "white",
              }}
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
