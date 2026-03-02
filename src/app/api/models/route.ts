import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const endpoint = process.env.LLM_ENDPOINT || "http://localhost:11434/v1";
    // Ollama's OpenAI-compatible models endpoint
    const response = await fetch(`${endpoint}/models`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || "ollama"}`,
      },
    });

    if (!response.ok) {
      // Fallback: try Ollama's native API
      const baseUrl = endpoint.replace("/v1", "");
      const nativeResponse = await fetch(`${baseUrl}/api/tags`);

      if (!nativeResponse.ok) {
        throw new Error("Failed to fetch models from Ollama");
      }

      const nativeData = await nativeResponse.json();
      const models = (nativeData.models || []).map((m: any) => ({
        id: m.name,
        name: m.name,
        size: m.size,
        modified_at: m.modified_at,
      }));

      return NextResponse.json({ models });
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
      message.includes("fetch failed")
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
