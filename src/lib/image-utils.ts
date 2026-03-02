/**
 * Client-side image processing utilities.
 * Handles compression, resizing, and format conversion before upload.
 * Includes retry logic for large images.
 */

const MAX_DIMENSION = 2048; // Max width or height
const QUALITY = 0.85; // JPEG quality
const MAX_BASE64_LENGTH = 10_000_000; // ~7.5MB raw image
const RETRY_MAX_DIMENSION = 1024; // Smaller max for retry

/**
 * Compress and resize an image file, returning a base64 data URL.
 * Converts all formats to JPEG (except PNG with transparency → kept as PNG).
 * Automatically retries with smaller dimensions if first attempt is too large.
 */
export async function processImage(file: File): Promise<string> {
  // First attempt with standard dimensions
  try {
    const result = await compressImage(file, MAX_DIMENSION, QUALITY);
    if (result.length <= MAX_BASE64_LENGTH) return result;

    // Image still too large — retry with smaller dimensions
    console.log("Image too large after first compression, retrying with smaller dimensions");
    const retry = await compressImage(file, RETRY_MAX_DIMENSION, 0.7);
    if (retry.length <= MAX_BASE64_LENGTH) return retry;

    // Last resort: very aggressive compression
    console.log("Image still too large, applying aggressive compression");
    return await compressImage(file, 768, 0.5);
  } catch (error) {
    // If canvas fails (e.g. CORS, unsupported format), throw descriptive error
    if (error instanceof Error) {
      if (error.message.includes("Canvas")) {
        throw new Error(
          "Could not process this image. Try saving it as a JPEG or PNG first."
        );
      }
      throw error;
    }
    throw new Error("Failed to process image. The format may not be supported.");
  }
}

/**
 * Core compression function.
 */
function compressImage(
  file: File,
  maxDim: number,
  quality: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    // Set a timeout for image loading
    const loadTimeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Image loading timed out. The file may be too large or corrupted."));
    }, 30_000);

    img.onload = () => {
      clearTimeout(loadTimeout);
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Downscale if needed
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
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
      const q = isPng ? undefined : quality;

      let dataUrl = canvas.toDataURL(format, q);

      // If still too large, progressively reduce quality
      if (dataUrl.length > MAX_BASE64_LENGTH && !isPng) {
        let currentQ = quality - 0.1;
        while (dataUrl.length > MAX_BASE64_LENGTH && currentQ > 0.2) {
          dataUrl = canvas.toDataURL("image/jpeg", currentQ);
          currentQ -= 0.1;
        }
      }

      // If PNG is too large, convert to JPEG
      if (dataUrl.length > MAX_BASE64_LENGTH && isPng) {
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      clearTimeout(loadTimeout);
      URL.revokeObjectURL(url);
      reject(
        new Error("Failed to load image. The format may not be supported.")
      );
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
  return (
    supported.includes(file.type) ||
    /\.(jpe?g|png|gif|webp|bmp|svg|tiff?|heic|heif|avif)$/i.test(file.name)
  );
}

/**
 * Estimate the upload size of a base64 data URL in MB.
 */
export function estimateSizeMB(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  return (base64.length * 3) / 4 / (1024 * 1024);
}
