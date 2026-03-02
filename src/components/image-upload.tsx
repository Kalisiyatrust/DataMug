"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface Props {
  image: string | null;
  onImageSelect: (dataUrl: string) => void;
  onImageRemove: () => void;
}

export function ImageUpload({ image, onImageSelect, onImageRemove }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please upload an image file.");
        return;
      }

      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be under 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        onImageSelect(result);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Handle paste from clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              onImageSelect(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    },
    [onImageSelect]
  );

  if (image) {
    return (
      <div className="relative inline-block">
        <div
          className="rounded-xl overflow-hidden border max-w-xs"
          style={{ borderColor: "var(--color-border)" }}
        >
          <img
            src={image}
            alt="Selected"
            className="max-w-full h-auto max-h-48 object-contain"
          />
        </div>
        <button
          onClick={onImageRemove}
          className="absolute -top-2 -right-2 p-1 rounded-full cursor-pointer"
          style={{
            background: "var(--color-error)",
            color: "white",
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      onPaste={handlePaste}
      className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
      style={{
        borderColor: isDragActive
          ? "var(--color-accent)"
          : "var(--color-border)",
        background: isDragActive
          ? "var(--color-accent-light)"
          : "var(--color-surface)",
      }}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <>
          <ImageIcon size={32} style={{ color: "var(--color-accent)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>
            Drop image here
          </p>
        </>
      ) : (
        <>
          <Upload size={32} style={{ color: "var(--color-text-secondary)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Drag & drop an image, click to browse, or paste from clipboard
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            PNG, JPG, GIF, WebP — up to 10MB
          </p>
        </>
      )}
    </div>
  );
}
