import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health check endpoint.
 * Returns the status of the app and Ollama connection.
 */
export async function GET() {
  const status: {
    status: "ok" | "degraded" | "error";
    app: string;
    version: string;
    timestamp: string;
    ollama: {
      status: "connected" | "disconnected" | "unknown";
      endpoint: string;
      models?: number;
      error?: string;
    };
  } = {
    status: "ok",
    app: "DataMug",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    ollama: {
      status: "unknown",
      endpoint: process.env.LLM_ENDPOINT || "http://localhost:11434/v1",
    },
  };

  try {
    const endpoint = process.env.LLM_ENDPOINT || "http://localhost:11434/v1";
    const baseUrl = endpoint.replace("/v1", "");

    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (response.ok) {
      const data = await response.json();
      status.ollama.status = "connected";
      status.ollama.models = data.models?.length || 0;
    } else {
      status.ollama.status = "disconnected";
      status.ollama.error = `HTTP ${response.status}`;
      status.status = "degraded";
    }
  } catch (error) {
    status.ollama.status = "disconnected";
    status.ollama.error =
      error instanceof Error ? error.message : "Connection failed";
    status.status = "degraded";
  }

  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-cache, no-store",
    },
  });
}
