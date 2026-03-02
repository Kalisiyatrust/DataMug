"use client";

import { useState, useEffect } from "react";
import type { GalleryImage } from "@/lib/gallery";
import {
  getGalleryImages,
  searchGallery,
  deleteGalleryImage,
  clearGallery,
  getGalleryStats,
} from "@/lib/gallery";
import {
  X,
  Search,
  Trash2,
  Image as ImageIcon,
  Calendar,
  Tag,
  HardDrive,
} from "lucide-react";

interface ImageGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (threadId: string) => void;
}

export function ImageGallery({
  isOpen,
  onClose,
  onSelectImage,
}: ImageGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getGalleryStats> | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  function refresh() {
    setImages(search ? searchGallery(search) : getGalleryImages());
    setStats(getGalleryStats());
  }

  useEffect(() => {
    if (isOpen) {
      setImages(search ? searchGallery(search) : getGalleryImages());
    }
  }, [search, isOpen]);

  function handleDelete(id: string) {
    deleteGalleryImage(id);
    setSelectedImage(null);
    refresh();
  }

  function handleClearAll() {
    if (
      confirm(
        "Delete all gallery images? This only removes thumbnails — your conversation threads are not affected."
      )
    ) {
      clearGallery();
      refresh();
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)" }}
      />

      {/* Modal */}
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
            <ImageIcon size={18} style={{ color: "var(--color-accent)" }} />
            <h2 className="text-base font-semibold">Image Gallery</h2>
            {stats && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "var(--color-surface-hover)",
                  color: "var(--color-text-secondary)",
                }}
              >
                {stats.totalImages} images
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {images.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                style={{
                  color: "var(--color-error, #ef4444)",
                  background: "var(--color-surface)",
                }}
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <Search
              size={14}
              style={{ color: "var(--color-text-secondary)" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tags, content, model..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--color-text)" }}
            />
          </div>
        </div>

        {/* Stats bar */}
        {stats && stats.topTags.length > 0 && (
          <div className="px-5 pb-2 flex items-center gap-2 flex-wrap">
            {stats.topTags.slice(0, 6).map((t) => (
              <button
                key={t.tag}
                onClick={() => setSearch(t.tag)}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] cursor-pointer transition-colors"
                style={{
                  background:
                    search === t.tag
                      ? "var(--color-accent)"
                      : "var(--color-surface-hover)",
                  color:
                    search === t.tag
                      ? "white"
                      : "var(--color-text-secondary)",
                }}
              >
                <Tag size={10} />
                {t.tag}
                <span className="opacity-60">({t.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {images.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <ImageIcon size={40} strokeWidth={1} />
              <p className="text-sm">
                {search
                  ? "No images match your search"
                  : "No images yet. Analyze an image to see it here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-150"
                  style={{
                    borderColor:
                      selectedImage?.id === img.id
                        ? "var(--color-accent)"
                        : "var(--color-border)",
                  }}
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.thumbnail}
                    alt="Analyzed image"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col justify-end p-2"
                    style={{
                      background:
                        "linear-gradient(transparent, rgba(0,0,0,0.7))",
                    }}
                  >
                    <span className="text-[10px] text-white/80 font-mono">
                      {img.model.split(":")[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image detail panel */}
        {selectedImage && (
          <div
            className="border-t px-5 py-3 flex items-start gap-4"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <img
              src={selectedImage.thumbnail}
              alt="Selected"
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs line-clamp-2" style={{ color: "var(--color-text)" }}>
                {selectedImage.analysisPreview}...
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <Calendar size={10} />
                  {formatDate(selectedImage.createdAt)}
                </span>
                <span
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  <HardDrive size={10} />
                  {formatSize(selectedImage.originalSize)}
                </span>
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {selectedImage.model}
                </span>
              </div>
              {selectedImage.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {selectedImage.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "var(--color-surface-hover)",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onSelectImage(selectedImage.threadId)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                }}
              >
                Go to thread
              </button>
              <button
                onClick={() => handleDelete(selectedImage.id)}
                className="p-1.5 rounded-lg transition-colors cursor-pointer"
                style={{ color: "var(--color-error, #ef4444)" }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
