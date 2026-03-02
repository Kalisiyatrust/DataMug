"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, AlertCircle, Info } from "lucide-react";
import { processImage, getImageInfo, isSupportedImage } from "@/lib/image-utils";

interface Props {
  image: string | null;
  onImageSelect: (dataUrl: string) => void;
  onImageRemove: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB raw (will be compressed)

export function ImageUpload({ image, onImageSelect, onImageRemove }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ sizeKB: number; format: string } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!isSupportedImage(file)) {
        setError("Unsupported format. Use PNG, JPG, GIF, WebP, BMP, or SVG.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 20MB.`
        );
        return;
      }

      setIsProcessing(true);

      try {
        // Process: resize to max 2048px, compress to JPEG, optimize
        const dataUrl = await processImage(file);
        const info = getImageInfo(dataUrl);
        setImageInfo(info);
        onImageSelect(dataUrl);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to process image. Try another file."
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageSelect]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [
        ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".bmp", ".svg", ".tiff", ".tif", ".heic", ".heif", ".avif",
      ],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isProcessing,
  });

  if (image) {
    const info = imageInfo || getImageInfo(image);
    return (
      <div className="animate-fadeIn">
        <div className="relative inline-block">
          <div
            className="rounded-xl overflow-hidden border"
            style={{
              borderColor: "var(--color-border)",
              maxWidth: "240px",
            }}
          >
            <img
              src={image}
              alt="Selected"
              className="max-w-full h-auto object-contain"
              style={{ maxHeight: "160px" }}
            />
          </div>
          <button
            onClick={() => {
              onImageRemove();
              setImageInfo(null);
            }}
            className="absolute -top-2 -right-2 p-1 rounded-full cursor-pointer transition-transform duration-150 hover:scale-110"
            style={{
              background: "var(--color-error)",
              color: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            <X size={12} />
          </button>
        </div>
        {/* Image info badge */}
        <div
          className="flex items-center gap-1.5 mt-1.5 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Info size={10} />
          {info.format} · {info.sizeKB < 1024 ? `${info.sizeKB} KB` : `${(info.sizeKB / 1024).toFixed(1)} MB`}
          {info.sizeKB > 500 && (
            <span style={{ color: "var(--color-success)" }}>· Compressed</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slideUp">
      <div
        {...getRootProps()}
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
        <input {...getInputProps()} />

        {isDragActive ? (
          <>
            <ImageIcon size={28} style={{ color: "var(--color-accent)" }} />
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              Drop image here
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
              Optimizing image...
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
                Drag & drop, click to browse, or{" "}
                <span
                  className="font-medium"
                  style={{ color: "var(--color-text)" }}
                >
                  paste
                </span>{" "}
                from clipboard
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
