"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface Props {
  image: string | null;
  onImageSelect: (dataUrl: string) => void;
  onImageRemove: () => void;
}

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function ImageUpload({ image, onImageSelect, onImageRemove }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (PNG, JPG, GIF, WebP).");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError(`Image must be under ${MAX_SIZE_MB}MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
        return;
      }

      setIsProcessing(true);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageSelect(result);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setError("Failed to read the image. Please try another file.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      processFile(file);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isProcessing,
  });

  if (image) {
    return (
      <div className="relative inline-block animate-fadeIn">
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
          onClick={onImageRemove}
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
              style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Processing...
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
                <span className="font-medium" style={{ color: "var(--color-text)" }}>
                  paste
                </span>{" "}
                from clipboard
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                PNG, JPG, GIF, WebP — up to {MAX_SIZE_MB}MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
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
