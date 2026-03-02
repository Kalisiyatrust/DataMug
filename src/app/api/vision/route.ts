import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/ollama-client";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes max for vision processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, image, model, history } = body;

    if (!message && !image) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    const client = getOpenAIClient();
    const selectedModel = model || process.env.DEFAULT_MODEL || "llava:7b";

    // Build messages array
    const messages: any[] = [
      { role: "system", content: DEFAULT_SYSTEM_PROMPT },
    ];

    // Add conversation history (last 10 messages for context)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
      for (const msg of recentHistory) {
        if (msg.role === "user") {
          if (msg.image) {
            messages.push({
              role: "user",
              content: [
                { type: "text", text: msg.content },
                {
                  type: "image_url",
                  image_url: { url: msg.image },
                },
              ],
            });
          } else {
            messages.push({ role: "user", content: msg.content });
          }
        } else if (msg.role === "assistant") {
          messages.push({ role: "assistant", content: msg.content });
        }
      }
    }

    // Add current message
    if (image) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: message || "Describe this image." },
          {
            type: "image_url",
            image_url: { url: image },
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: message });
    }

    // Create streaming completion
    const stream = await client.chat.completions.create({
      model: selectedModel,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    });

    // Convert to ReadableStream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Send as SSE format
              const data = JSON.stringify({ content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            if (chunk.choices[0]?.finish_reason === "stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          }
        } catch (error) {
          const errMsg =
            error instanceof Error ? error.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errMsg })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Vision API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Check for specific Ollama connection errors
    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to Ollama. Make sure Ollama is running and accessible at the configured endpoint.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: `Vision analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
