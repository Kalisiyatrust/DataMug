"use client";

import { useState, useCallback, useRef } from "react";
import { processImage } from "@/lib/image-utils";
import {
  X,
  Upload,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader,
  FileImage,
  Trash2,
} from "lucide-react";

export interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: "queued" | "processing" | "done" | "error";
  result: string;
  error: string;
}

interface BatchAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
}

export function BatchAnalysis({
  isOpen,
  onClose,
  selectedModel,
}: BatchAnalysisProps) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [prompt, setPrompt] = useState(
    "Describe this image in detail. What do you see?"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const abortRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    const newItems: BatchItem[] = [];

    for (const file of fileArray) {
      const preview = await processImage(file);
      newItems.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        preview,
        status: "queued",
        result: "",
        error: "",
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  }, []);

  async function analyzeOne(
    item: BatchItem
  ): Promise<{ result: string; error: string }> {
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          image: item.preview,
          model: selectedModel || undefined,
          history: [],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { result: "", error: errData.error || `HTTP ${res.status}` };
      }

      const reader = res.body?.getReader();
      if (!reader) return { result: "", error: "No response stream" };

      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) full += parsed.content;
              if (parsed.error) return { result: full, error: parsed.error };
            } catch {
              // skip parse errors
            }
          }
        }
      }

      return { result: full || "(empty response)", error: "" };
    } catch (e) {
      return {
        result: "",
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }

  async function runBatch() {
    setIsRunning(true);
    abortRef.current = false;

    const queuedItems = items.filter((i) => i.status === "queued");

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      if (items[i].status !== "queued") continue;

      setCurrentIndex(i);
      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i ? { ...it, status: "processing" } : it
        )
      );

      const { result, error } = await analyzeOne(items[i]);

      setItems((prev) =>
        prev.map((it, idx) =>
          idx === i
            ? {
                ...it,
                status: error ? "error" : "done",
                result,
                error,
              }
            : it
        )
      );
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  }

  function stopBatch() {
    abortRef.current = true;
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function clearDone() {
    setItems((prev) => prev.filter((i) => i.status !== "done"));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const queuedCount = items.filter((i) => i.status === "queued").length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRunning) onClose();
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      <div
        className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <FileImage size={18} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-base font-semibold">Batch Analysis</h2>
            {items.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-surface-hover)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {doneCount}/{items.length} done
                {errorCount > 0 && ` · ${errorCount} errors`}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Prompt */}
        <div className="px-5 py-3 space-y-2">
          <label
            className="text-xs font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Prompt (applied to all images)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            disabled={isRunning}
            className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent outline-none resize-none"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        {/* Drop zone / file input */}
        {!isRunning && (
          <div className="px-5 pb-3">
            <div
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-surface)",
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload
                size={24}
                className="mx-auto mb-2"
                style={{ color: "var(--color-text-secondary)" }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Drop images here or click to browse
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Progress bar */}
        {isRunning && (
          <div className="px-5 pb-2">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--color-surface-hover)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${((doneCount + errorCount) / items.length) * 100}%`,
                  background: "var(--color-accent)",
                }}
              />
            </div>
          </div>
        )}

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-xl border"
              style={{
                borderColor:
                  item.status === "processing"
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <img
                src={item.preview}
                alt=""
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {item.file.name}
                  </span>
                  {item.status === "queued" && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--color-surface-hover)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Queued
                    </span>
                  )}
                  {item.status === "processing" && (
                    <Loader
                      size={14}
                      className="animate-spin"
                      style={{ color: "var(--color-accent)" }}
                    />
                  )}
                  {item.status === "done" && (
                    <CheckCircle size={14} style={{ color: "#22c55e" }} />
                  )}
                  {item.status === "error" && (
                    <AlertCircle
                      size={14}
                      style={{ color: "var(--color-error, #ef4444)" }}
                    />
                  )}
                </div>
                {item.result && (
                  <p
                    className="text-xs mt-1 line-clamp-2"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {item.result.slice(0, 200)}
                  </p>
                )}
                {item.error && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-error, #ef4444)" }}
                  >
                    {item.error}
                  </p>
                )}
              </div>
              {!isRunning && (
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-1 rounded-lg cursor-pointer flex-shrink-0"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <div className="flex items-center gap-2">
            {doneCount > 0 && !isRunning && (
              <button
                onClick={clearDone}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--color-surface-hover)",
                  color: "var(--color-text-secondary)",
                }}
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {selectedModel || "default model"}
            </span>
            {isRunning ? (
              <button
                onClick={stopBatch}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--color-error, #ef4444)",
                  color: "white",
                }}
              >
                <Pause size={14} />
                Stop
              </button>
            ) : (
              <button
                onClick={runBatch}
                disabled={queuedCount === 0 || !prompt.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-30"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                }}
              >
                <Play size={14} />
                Analyze {queuedCount > 0 ? `(${queuedCount})` : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
