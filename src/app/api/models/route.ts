import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const endpoint = process.env.LLM_ENDPOINT || "http://localhost:11434/v1";
    const baseUrl = endpoint.replace("/v1", "");

    // Try Ollama's native API first (richer data)
    try {
      const nativeResponse = await fetch(`${baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (nativeResponse.ok) {
        const nativeData = await nativeResponse.json();
        const models = (nativeData.models || []).map((m: any) => ({
          id: m.name,
          name: m.name,
          size: m.size,
          modified_at: m.modified_at,
          details: m.details
            ? {
                family: m.details.family,
                parameter_size: m.details.parameter_size,
                quantization_level: m.details.quantization_level,
              }
            : undefined,
        }));

        return NextResponse.json({ models });
      }
    } catch {
      // Fallback to OpenAI-compatible endpoint
    }

    // Fallback: OpenAI-compatible /v1/models
    const response = await fetch(`${endpoint}/models`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || "ollama"}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch models from Ollama");
    }

    const data = await response.json();
    const models = (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.id,
    }));

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Models API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch models";

    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      message.includes("abort")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to Ollama. Ensure it is running at the configured endpoint.",
          models: [],
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: message, models: [] },
      { status: 500 }
    );
  }
}
