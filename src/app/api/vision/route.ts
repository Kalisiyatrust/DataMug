import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/ollama-client";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes max for vision processing

const TIMEOUT_MS = 90_000; // 90 second timeout for Ollama response
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;

/**
 * Sleep helper for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("socket hang up") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("aborted") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("429")
  );
}

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

    // Validate image size (rough check on base64 string length)
    // ~15MB base64 ≈ ~11MB raw image
    if (image && image.length > 15_000_000) {
      return NextResponse.json(
        {
          error:
            "Image is too large. Please use an image under 10MB. Tip: try a JPEG instead of PNG for smaller file sizes.",
        },
        { status: 413 }
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

    // Retry loop for transient errors
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(
            `Vision API retry attempt ${attempt}/${MAX_RETRIES}`
          );
          await sleep(RETRY_DELAY_MS * attempt); // Exponential-ish backoff
        }

        // Create streaming completion with timeout
        const streamPromise = client.chat.completions.create({
          model: selectedModel,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  "Request timed out. The model may be loading or the image is too complex. Try a simpler prompt or smaller image."
                )
              ),
            TIMEOUT_MS
          );
        });

        const stream = await Promise.race([streamPromise, timeoutPromise]);

        // Convert to ReadableStream with SSE format
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              let hasContent = false;
              for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                  hasContent = true;
                  const data = JSON.stringify({ content });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                if (chunk.choices[0]?.finish_reason === "stop") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              }

              // If we got no content at all, send a helpful message
              if (!hasContent) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      content:
                        "The model returned an empty response. This can happen if the model doesn't support vision or the image format isn't supported. Try a different model.",
                    })}\n\n`
                  )
                );
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
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-store",
            Connection: "keep-alive",
            "X-Model": selectedModel,
            "X-Attempt": String(attempt + 1),
          },
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on transient/network errors, not on 4xx
        if (!isRetryable(error) || attempt === MAX_RETRIES) {
          break;
        }
      }
    }

    // All retries exhausted — return error
    const message2 = lastError?.message || "Unknown error occurred";
    console.error("Vision API error after retries:", message2);

    // Connection errors
    if (
      message2.includes("ECONNREFUSED") ||
      message2.includes("fetch failed") ||
      message2.includes("ENOTFOUND")
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to Ollama. Make sure Ollama is running (`ollama serve`) and accessible at the configured endpoint.",
          retryable: true,
        },
        { status: 503 }
      );
    }

    // Timeout errors
    if (message2.includes("timed out") || message2.includes("timeout")) {
      return NextResponse.json(
        {
          error: message2,
          retryable: true,
        },
        { status: 504 }
      );
    }

    // Model not found
    if (message2.includes("model") && message2.includes("not found")) {
      return NextResponse.json(
        {
          error: `Model not found. Pull it first with: ollama pull ${lastError?.message.match(/model '(.+?)'/)?.[1] || "llava:7b"}`,
          retryable: false,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: `Vision analysis failed: ${message2}`,
        retryable: isRetryable(lastError),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Vision API unexpected error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Unexpected error: ${message}`, retryable: false },
      { status: 500 }
    );
  }
}
