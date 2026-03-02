"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  Plus,
  AlertCircle,
  Columns2,
  Image as ImageIcon,
} from "lucide-react";
import { processImage, isSupportedImage } from "@/lib/image-utils";

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB raw (will be compressed)

export function MultiImageUpload({
  images,
  onImagesChange,
  maxImages = 4,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [processingCount, setProcessingCount] = useState(0);
  // Track which slot index is the active drag target (-1 = the "add" zone)
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const isProcessing = processingCount > 0;
  const canAddMore = images.length < maxImages;

  // ── Core file handler ──────────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      const slots = maxImages - images.length;
      const toProcess = files.slice(0, slots);

      if (toProcess.length === 0) return;

      // Validate all files before processing any
      for (const file of toProcess) {
        if (!isSupportedImage(file)) {
          setError("Unsupported format. Use PNG, JPG, GIF, WebP, BMP, or SVG.");
          return;
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(
            `"${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 20MB per image.`
          );
          return;
        }
      }

      setProcessingCount((c) => c + toProcess.length);

      try {
        const dataUrls = await Promise.all(
          toProcess.map((file) => processImage(file))
        );
        onImagesChange([...images, ...dataUrls]);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to process one or more images. Try again."
        );
      } finally {
        setProcessingCount((c) => c - toProcess.length);
      }
    },
    [images, maxImages, onImagesChange]
  );

  // ── Remove a single image by index ────────────────────────────────────────
  const handleRemove = useCallback(
    (index: number) => {
      const next = images.filter((_, i) => i !== index);
      onImagesChange(next);
      setError(null);
    },
    [images, onImagesChange]
  );

  // ── Dropzone for the "add more" zone ──────────────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDragTarget(null);
      handleFiles(acceptedFiles);
    },
    [handleFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".bmp",
        ".svg",
        ".tiff",
        ".tif",
        ".heic",
        ".heif",
        ".avif",
      ],
    },
    maxFiles: maxImages - images.length,
    multiple: true,
    disabled: isProcessing || !canAddMore,
    noClick: true, // We handle click on the + button ourselves
    onDragEnter: () => setDragTarget(-1),
    onDragLeave: () => setDragTarget(null),
  });

  // ── Empty state: full drop zone ────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="animate-slideUp">
        <div
          {...getRootProps()}
          onClick={() => addInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200"
          style={{
            borderColor: isDragActive
              ? "var(--color-accent)"
              : error
                ? "var(--color-error)"
                : "var(--color-border)",
            background: isDragActive
              ? "var(--color-accent-light)"
              : "var(--color-surface)",
            opacity: isProcessing ? 0.6 : 1,
          }}
        >
          <input {...getInputProps()} ref={addInputRef} />

          {isDragActive ? (
            <>
              <ImageIcon size={28} style={{ color: "var(--color-accent)" }} />
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-accent)" }}
              >
                Drop images here
              </p>
            </>
          ) : isProcessing ? (
            <>
              <div
                className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--color-accent)",
                  borderTopColor: "transparent",
                }}
              />
              <p
                className="text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Optimizing images…
              </p>
            </>
          ) : (
            <>
              <Upload
                size={28}
                style={{ color: "var(--color-text-secondary)" }}
              />
              <div className="text-center">
                <p
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Drag & drop up to{" "}
                  <span
                    className="font-medium"
                    style={{ color: "var(--color-text)" }}
                  >
                    {maxImages} images
                  </span>{" "}
                  or click to browse
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  PNG, JPG, GIF, WebP, BMP, HEIC, TIFF — auto-compressed
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div
            className="flex items-center gap-1.5 mt-2 text-xs animate-slideDown"
            style={{ color: "var(--color-error)" }}
          >
            <AlertCircle size={12} />
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── Thumbnail row (1–4 images loaded) ─────────────────────────────────────
  return (
    <div className="animate-fadeIn flex flex-col gap-2">
      {/* Thumbnails */}
      <div
        {...getRootProps()}
        className="flex flex-row flex-wrap gap-2"
        style={{ outline: "none" }}
      >
        {/* Hidden input for add-more */}
        <input {...getInputProps()} ref={addInputRef} />

        {/* Existing image thumbnails */}
        {images.map((src, i) => (
          <Thumbnail
            key={i}
            src={src}
            index={i}
            onRemove={handleRemove}
            isDragOver={dragTarget === i}
          />
        ))}

        {/* Add-more slot */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => addInputRef.current?.click()}
            disabled={isProcessing}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              width: 72,
              height: 72,
              borderColor:
                isDragActive || dragTarget === -1
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              background:
                isDragActive || dragTarget === -1
                  ? "var(--color-accent-light)"
                  : "var(--color-surface)",
              opacity: isProcessing ? 0.5 : 1,
              flexShrink: 0,
            }}
            title={`Add image (${images.length}/${maxImages})`}
          >
            {isProcessing ? (
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{
                  borderColor: "var(--color-accent)",
                  borderTopColor: "transparent",
                }}
              />
            ) : (
              <>
                <Plus
                  size={20}
                  style={{ color: "var(--color-text-secondary)" }}
                />
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {images.length}/{maxImages}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Compare button — visible when 2+ images are attached */}
      {images.length >= 2 && (
        <CompareButton
          count={images.length}
          onImagesChange={onImagesChange}
        />
      )}

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-1.5 text-xs animate-slideDown"
          style={{ color: "var(--color-error)" }}
        >
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface ThumbnailProps {
  src: string;
  index: number;
  onRemove: (index: number) => void;
  isDragOver?: boolean;
}

function Thumbnail({ src, index, onRemove, isDragOver }: ThumbnailProps) {
  return (
    <div
      className="relative flex-shrink-0 rounded-xl overflow-hidden border transition-all duration-150"
      style={{
        width: 72,
        height: 72,
        borderColor: isDragOver
          ? "var(--color-accent)"
          : "var(--color-border)",
        boxShadow: isDragOver ? "0 0 0 2px var(--color-accent)" : undefined,
      }}
    >
      <img
        src={src}
        alt={`Image ${index + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-1 right-1 p-0.5 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110"
        style={{
          background: "var(--color-error)",
          color: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        }}
        title="Remove image"
      >
        <X size={10} />
      </button>
      {/* Index badge */}
      <div
        className="absolute bottom-1 left-1 text-xs font-medium px-1 rounded"
        style={{
          background: "rgba(0,0,0,0.55)",
          color: "white",
          fontSize: "0.65rem",
          lineHeight: "1.4",
        }}
      >
        {index + 1}
      </div>
    </div>
  );
}

interface CompareButtonProps {
  count: number;
  /** Exposed so parent can wire in a "compare" action if needed */
  onImagesChange: (images: string[]) => void;
}

/**
 * Renders a "Compare" pill button.
 * The actual comparison logic is driven by the parent — this button signals
 * intent so the chat interface can inject a comparison preset prompt.
 * It dispatches a custom DOM event `datamug:compare` that chat-interface can
 * listen to, keeping this component decoupled.
 */
function CompareButton({ count }: CompareButtonProps) {
  function handleCompare() {
    window.dispatchEvent(new CustomEvent("datamug:compare", { detail: { count } }));
  }

  return (
    <button
      type="button"
      onClick={handleCompare}
      className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer"
      style={{
        background: "var(--color-accent)",
        color: "white",
      }}
    >
      <Columns2 size={13} />
      Compare {count} images
    </button>
  );
}
