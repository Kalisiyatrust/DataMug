/**
 * Client-side image processing utilities.
 * Handles compression, resizing, and format conversion before upload.
 */

const MAX_DIMENSION = 2048; // Max width or height
const QUALITY = 0.85; // JPEG quality
const MAX_BASE64_LENGTH = 10_000_000; // ~7.5MB raw image

/**
 * Compress and resize an image file, returning a base64 data URL.
 * Converts all formats to JPEG (except PNG with transparency → kept as PNG).
 */
export async function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Downscale if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Determine format: keep PNG if it might have transparency, else JPEG
      const isPng =
        file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
      const format = isPng ? "image/png" : "image/jpeg";
      const quality = isPng ? undefined : QUALITY;

      let dataUrl = canvas.toDataURL(format, quality);

      // If still too large, progressively reduce quality
      if (dataUrl.length > MAX_BASE64_LENGTH && !isPng) {
        let q = 0.7;
        while (dataUrl.length > MAX_BASE64_LENGTH && q > 0.2) {
          dataUrl = canvas.toDataURL("image/jpeg", q);
          q -= 0.1;
        }
      }

      // If PNG is too large, convert to JPEG
      if (dataUrl.length > MAX_BASE64_LENGTH && isPng) {
        dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image. The format may not be supported."));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions and file size info from a data URL.
 */
export function getImageInfo(dataUrl: string): {
  sizeKB: number;
  format: string;
} {
  // Estimate size: base64 is ~33% larger than raw
  const base64 = dataUrl.split(",")[1] || "";
  const sizeKB = Math.round((base64.length * 3) / 4 / 1024);

  // Get format from data URL
  const match = dataUrl.match(/^data:image\/(\w+)/);
  const format = match ? match[1].toUpperCase() : "Unknown";

  return { sizeKB, format };
}

/**
 * Check if a file type is a supported image format.
 */
export function isSupportedImage(file: File): boolean {
  const supported = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    "image/tiff",
    "image/heic",
    "image/heif",
    "image/avif",
  ];
  return supported.includes(file.type) || /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|heic|heif|avif)$/i.test(file.name);
}
