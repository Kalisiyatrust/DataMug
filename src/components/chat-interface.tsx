"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message, OllamaModel } from "@/types";
import { ANALYSIS_PRESETS, generateId } from "@/lib/constants";
import { ImageUpload } from "./image-upload";
import { MessageBubble } from "./message-bubble";
import { ModelSelector } from "./model-selector";
import { PresetButtons } from "./preset-buttons";
import { ConnectionBanner } from "./connection-banner";
import { EmptyState } from "./empty-state";
import { TypingIndicator } from "./typing-indicator";
import {
  Send,
  ImagePlus,
  Trash2,
  StopCircle,
  Coffee,
} from "lucide-react";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "checking"
  >("checking");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Smooth scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("datamug-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save chat history (debounced)
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        localStorage.setItem("datamug-history", JSON.stringify(messages));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [input]);

  async function fetchModels() {
    setConnectionStatus("checking");
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.error) {
        setConnectionError(data.error);
        setConnectionStatus("disconnected");
      } else {
        setModels(data.models || []);
        setConnectionError(null);
        setConnectionStatus("connected");
        if (data.models?.length > 0 && !selectedModel) {
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
      setConnectionError("Cannot connect to Ollama. Make sure it is running.");
      setConnectionStatus("disconnected");
    }
  }

  const handleSubmit = useCallback(
    async (customPrompt?: string) => {
      const messageText = customPrompt || input.trim();
      if (!messageText && !image) return;
      if (isLoading) return;

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

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || "";

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
                if (
                  e instanceof Error &&
                  e.message !== "Stream error" &&
                  e.message.includes("Unexpected")
                ) {
                  continue; // Skip JSON parse errors on partial chunks
                }
                if (e instanceof Error && !e.message.includes("Unexpected")) {
                  throw e;
                }
              }
            }
          }
        }

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
          if (streamingContent) {
            const partialMessage: Message = {
              id: generateId(),
              role: "assistant",
              content: streamingContent + "\n\n---\n_Generation stopped_",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, partialMessage]);
          }
        } else {
          const errMsg =
            error instanceof Error ? error.message : "An error occurred";

          if (
            errMsg.includes("Cannot connect") ||
            errMsg.includes("ECONNREFUSED") ||
            errMsg.includes("fetch failed")
          ) {
            setConnectionError(errMsg);
            setConnectionStatus("disconnected");
          }

          const errorMessage: Message = {
            id: generateId(),
            role: "assistant",
            content: `**Error:** ${errMsg}\n\nMake sure Ollama is running with a vision model. Try: \`ollama serve\` and \`ollama pull llava:7b\``,
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
    // Cmd/Ctrl + Shift + V to toggle image upload
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "v") {
      e.preventDefault();
      setShowUpload(!showUpload);
    }
    // Escape to cancel generation
    if (e.key === "Escape" && isLoading) {
      handleStop();
    }
  }

  // Global paste handler for images
  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              setImage(reader.result as string);
              setShowUpload(false);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    }
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, []);

  function handleImageSelect(dataUrl: string) {
    setImage(dataUrl);
    setShowUpload(false);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-sm sticky top-0 z-10"
        style={{
          borderColor: "var(--color-border)",
          background: "color-mix(in srgb, var(--color-bg) 85%, transparent)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-accent)" }}
          >
            <Coffee size={18} color="white" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">DataMug</h1>
            <p
              className="text-xs leading-tight"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Vision AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModelSelector
            models={models}
            selected={selectedModel}
            onChange={setSelectedModel}
            onRefresh={fetchModels}
            connectionStatus={connectionStatus}
          />
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
              title="Clear chat history"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Connection Error Banner */}
      <ConnectionBanner
        status={connectionStatus}
        error={connectionError}
        onRetry={fetchModels}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth">
        {messages.length === 0 && !isLoading ? (
          <EmptyState
            onPresetClick={(prompt) => {
              setShowUpload(true);
              setInput(prompt);
            }}
          />
        ) : (
          <div className="space-y-6">
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

            {/* Typing indicator */}
            {isLoading && !streamingContent && (
              <TypingIndicator hasImage={!!image} />
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div
        className="border-t px-4 sm:px-6 py-3 space-y-3"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg)",
        }}
      >
        {/* Image Preview & Upload */}
        {(showUpload || image) && (
          <ImageUpload
            image={image}
            onImageSelect={handleImageSelect}
            onImageRemove={() => setImage(null)}
          />
        )}

        {/* Preset buttons when image is loaded */}
        {image && !isLoading && (
          <PresetButtons onSelect={handlePresetClick} />
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0"
            style={{
              background: showUpload
                ? "var(--color-accent)"
                : "var(--color-surface)",
              color: showUpload ? "white" : "var(--color-text-secondary)",
              border: `1px solid ${showUpload ? "var(--color-accent)" : "var(--color-border)"}`,
            }}
            title="Upload image (Ctrl+Shift+V)"
          >
            <ImagePlus size={18} />
          </button>

          <div
            className="flex-1 flex items-end rounded-xl border transition-colors duration-200"
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
                  ? "Ask about this image... (Enter to send)"
                  : "Upload an image and ask a question... (Ctrl+Shift+V for image)"
              }
              rows={1}
              className="flex-1 px-4 py-2.5 bg-transparent outline-none resize-none text-sm leading-relaxed"
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
              className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 animate-pulse"
              style={{
                background: "var(--color-error)",
                color: "white",
              }}
              title="Stop generation (Esc)"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() && !image}
              className="p-2.5 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                background:
                  input.trim() || image
                    ? "var(--color-accent)"
                    : "var(--color-surface-hover)",
                color:
                  input.trim() || image
                    ? "white"
                    : "var(--color-text-secondary)",
              }}
              title="Send message (Enter)"
            >
              <Send size={18} />
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>
            Your images never leave your network.
          </span>
          <span className="hidden sm:inline">
            Enter to send · Shift+Enter for new line · Esc to stop
          </span>
        </div>
      </div>
    </div>
  );
}
