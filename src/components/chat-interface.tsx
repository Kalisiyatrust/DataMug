"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message, OllamaModel } from "@/types";
import { ANALYSIS_PRESETS, generateId } from "@/lib/constants";
import { ImageUpload } from "./image-upload";
import { MessageBubble } from "./message-bubble";
import { ModelSelector } from "./model-selector";
import { PresetButtons } from "./preset-buttons";
import {
  Send,
  Loader2,
  ImagePlus,
  Trash2,
  StopCircle,
  Coffee,
} from "lucide-react";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null); // base64 data URL
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("datamug-history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("datamug-history", JSON.stringify(messages));
    }
  }, [messages]);

  async function fetchModels() {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.error) {
        setConnectionError(data.error);
      } else {
        setModels(data.models || []);
        setConnectionError(null);
        // Set default model
        if (data.models?.length > 0 && !selectedModel) {
          // Prefer vision models
          const visionModel = data.models.find(
            (m: OllamaModel) =>
              m.name.includes("llava") ||
              m.name.includes("vision") ||
              m.name.includes("qwen2.5vl") ||
              m.name.includes("minicpm-v")
          );
          setSelectedModel(visionModel?.id || data.models[0].id);
        }
      }
    } catch {
      setConnectionError(
        "Cannot connect to Ollama. Make sure it is running."
      );
    }
  }

  const handleSubmit = useCallback(
    async (customPrompt?: string) => {
      const messageText = customPrompt || input.trim();
      if (!messageText && !image) return;
      if (isLoading) return;

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: messageText || "Analyze this image",
        image: image || undefined,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setStreamingContent("");
      setConnectionError(null);

      // Set up abort controller
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch("/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: messageText || "Analyze this image",
            image: image || undefined,
            model: selectedModel || undefined,
            history: messages.slice(-10),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Request failed with status ${res.status}`
          );
        }

        // Read the SSE stream
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // Skip invalid JSON chunks
                if (e instanceof Error && e.message !== "Stream error") {
                  // Only throw if it's an actual error, not a parse error
                  if (data !== "[DONE]" && !data.startsWith("{")) {
                    continue;
                  }
                }
              }
            }
          }
        }

        // Add assistant message
        if (fullContent) {
          const assistantMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // User cancelled — add partial content if any
          if (streamingContent) {
            const partialMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: streamingContent + "\n\n_(Stopped by user)_",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, partialMessage]);
          }
        } else {
          const errMsg =
            error instanceof Error
              ? error.message
              : "An error occurred";

          // Check if it's a connection error
          if (
            errMsg.includes("Cannot connect") ||
            errMsg.includes("ECONNREFUSED")
          ) {
            setConnectionError(errMsg);
          }

          const errorMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: `**Error:** ${errMsg}`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        setImage(null);
        setShowUpload(false);
        abortControllerRef.current = null;
        inputRef.current?.focus();
      }
    },
    [input, image, isLoading, selectedModel, messages, streamingContent]
  );

  function handleStop() {
    abortControllerRef.current?.abort();
  }

  function handleClearHistory() {
    setMessages([]);
    localStorage.removeItem("datamug-history");
  }

  function handlePresetClick(presetId: string) {
    const preset = ANALYSIS_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      handleSubmit(preset.prompt);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleImageSelect(dataUrl: string) {
    setImage(dataUrl);
    setShowUpload(false);
  }

  const hasImage = !!image;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <Coffee size={24} style={{ color: "var(--color-accent)" }} />
          <h1 className="text-lg font-semibold">DataMug</h1>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: "var(--color-accent-light)",
              color: "var(--color-accent)",
            }}
          >
            Vision AI
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ModelSelector
            models={models}
            selected={selectedModel}
            onChange={setSelectedModel}
            onRefresh={fetchModels}
          />
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
              title="Clear chat history"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Connection Error Banner */}
      {connectionError && (
        <div
          className="px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: "var(--color-error)",
            color: "white",
          }}
        >
          <span className="font-medium">Connection Error:</span>
          <span>{connectionError}</span>
          <button
            onClick={fetchModels}
            className="ml-auto underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Coffee
                size={48}
                style={{ color: "var(--color-text-secondary)" }}
              />
              <h2 className="text-2xl font-semibold">
                Welcome to DataMug
              </h2>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Upload an image and ask questions about it, or use a
                preset below.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg">
              {ANALYSIS_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setShowUpload(true);
                    setInput(preset.prompt);
                  }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-sm transition-colors cursor-pointer border"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <span className="text-xs font-medium">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Streaming response */}
            {isLoading && streamingContent && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: Date.now(),
                }}
                isStreaming
              />
            )}

            {/* Loading indicator */}
            {isLoading && !streamingContent && (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ color: "var(--color-accent)" }}
                />
                <span
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Analyzing{hasImage ? " image" : ""}...
                </span>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="border-t px-4 py-3"
        style={{ borderColor: "var(--color-border)" }}
      >
        {/* Image Preview & Upload */}
        {(showUpload || image) && (
          <div className="mb-3">
            <ImageUpload
              image={image}
              onImageSelect={handleImageSelect}
              onImageRemove={() => setImage(null)}
            />
          </div>
        )}

        {/* Preset buttons when image is loaded */}
        {image && !isLoading && (
          <div className="mb-3">
            <PresetButtons onSelect={handlePresetClick} />
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="p-2.5 rounded-xl transition-colors cursor-pointer"
            style={{
              background: showUpload
                ? "var(--color-accent-light)"
                : "var(--color-surface)",
              color: showUpload
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
              border: `1px solid ${showUpload ? "var(--color-accent)" : "var(--color-border)"}`,
            }}
            title="Upload image"
          >
            <ImagePlus size={20} />
          </button>

          <div
            className="flex-1 flex items-end rounded-xl border"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                image
                  ? "Ask about this image..."
                  : "Upload an image and ask a question..."
              }
              rows={1}
              className="flex-1 px-4 py-2.5 bg-transparent outline-none resize-none text-sm"
              style={{
                color: "var(--color-text)",
                maxHeight: "120px",
              }}
              disabled={isLoading}
            />
          </div>

          {isLoading ? (
            <button
              onClick={handleStop}
              className="p-2.5 rounded-xl transition-colors cursor-pointer"
              style={{
                background: "var(--color-error)",
                color: "white",
              }}
              title="Stop generation"
            >
              <StopCircle size={20} />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() && !image}
              className="p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              style={{
                background: "var(--color-accent)",
                color: "white",
              }}
              title="Send message"
            >
              <Send size={20} />
            </button>
          )}
        </div>

        <p
          className="text-xs mt-2 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          DataMug uses local AI models via Ollama — your images never leave
          your network.
        </p>
      </div>
    </div>
  );
}
