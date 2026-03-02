/**
 * Image gallery: persistent store of all images that have been analysed.
 * Stored in localStorage as thumbnail + metadata (full images stay in threads).
 */

export interface GalleryImage {
  id: string;
  thumbnail: string;       // small base64 data-URL (~150px wide)
  originalSize: number;    // bytes (approx) of the original
  threadId: string;
  messageId: string;
  analysisPreview: string; // first 120 chars of the AI response
  model: string;
  createdAt: number;
  tags: string[];          // auto-generated from analysis
}

const STORAGE_KEY = "datamug-gallery";
const MAX_GALLERY = 200;
const THUMB_SIZE = 150;    // px

/**
 * Create a thumbnail from a base64 data-URL.
 */
export function createThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = THUMB_SIZE / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Extract rough tags from an AI response.
 */
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lower = text.toLowerCase();
  const keywords = [
    "text", "code", "document", "receipt", "invoice", "table",
    "chart", "photo", "screenshot", "diagram", "logo",
    "person", "animal", "food", "landscape", "building",
    "handwriting", "math", "equation",
  ];
  for (const kw of keywords) {
    if (lower.includes(kw)) tags.push(kw);
  }
  return tags.slice(0, 5);
}

/**
 * Get all gallery images.
 */
export function getGalleryImages(): GalleryImage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Add an image to the gallery.
 */
export async function addToGallery(params: {
  imageDataUrl: string;
  threadId: string;
  messageId: string;
  analysisText: string;
  model: string;
}): Promise<GalleryImage> {
  const thumbnail = await createThumbnail(params.imageDataUrl);

  const entry: GalleryImage = {
    id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    thumbnail,
    originalSize: Math.round((params.imageDataUrl.length * 3) / 4),
    threadId: params.threadId,
    messageId: params.messageId,
    analysisPreview: params.analysisText.slice(0, 120),
    model: params.model,
    createdAt: Date.now(),
    tags: extractTags(params.analysisText),
  };

  const gallery = getGalleryImages();
  gallery.unshift(entry);

  // Enforce max
  const trimmed = gallery.slice(0, MAX_GALLERY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

  return entry;
}

/**
 * Delete a gallery image.
 */
export function deleteGalleryImage(id: string): void {
  const gallery = getGalleryImages().filter((g) => g.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery));
}

/**
 * Search gallery images by tags or preview text.
 */
export function searchGallery(query: string): GalleryImage[] {
  if (!query.trim()) return getGalleryImages();
  const lower = query.toLowerCase();
  return getGalleryImages().filter(
    (g) =>
      g.tags.some((t) => t.includes(lower)) ||
      g.analysisPreview.toLowerCase().includes(lower) ||
      g.model.toLowerCase().includes(lower)
  );
}

/**
 * Clear entire gallery.
 */
export function clearGallery(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get gallery stats.
 */
export function getGalleryStats(): {
  totalImages: number;
  totalSize: number;
  topTags: { tag: string; count: number }[];
} {
  const gallery = getGalleryImages();
  const tagCounts: Record<string, number> = {};

  let totalSize = 0;
  for (const img of gallery) {
    totalSize += img.originalSize;
    for (const tag of img.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalImages: gallery.length, totalSize, topTags };
}
