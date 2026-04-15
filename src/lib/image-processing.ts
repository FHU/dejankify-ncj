import sharp from "sharp";

const MAX_WIDTH = 800;
const JPEG_QUALITY = 80;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB source limit

export type VisionMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface ProcessedImage {
  base64: string;
  mediaType: VisionMediaType;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  sizeBytes: number;
}

/**
 * Resolve a potentially relative image src to an absolute URL.
 */
export function resolveImageUrl(src: string, pageUrl: string): string | null {
  if (!src || src.startsWith("data:")) return null;

  try {
    // Already absolute
    if (src.startsWith("http://") || src.startsWith("https://")) {
      return src;
    }
    // Protocol-relative
    if (src.startsWith("//")) {
      return `https:${src}`;
    }
    // Relative — resolve against page URL
    return new URL(src, pageUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Fetch an image from a URL and return the raw buffer.
 * Returns null if the fetch fails or the image is too large.
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Dejankify/1.0; +https://dejankify.app)",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    // Check Content-Length header first to avoid downloading huge files
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) return null;

    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Resize an image to max width, convert to JPEG, and return as base64.
 * Returns null if processing fails (e.g., SVG, corrupt file, animated GIF).
 */
export async function processImageForVision(
  imageUrl: string
): Promise<ProcessedImage | null> {
  const buffer = await fetchImageBuffer(imageUrl);
  if (!buffer) return null;

  try {
    const image = sharp(buffer, {
      // Disable animation to handle animated GIFs
      animated: false,
      // Limit pixel count to prevent memory issues
      limitInputPixels: 50_000_000,
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) return null;

    // Skip SVGs (sharp can read them but they're not useful for Vision analysis of photos)
    if (metadata.format === "svg") return null;

    const originalWidth = metadata.width;
    const originalHeight = metadata.height;

    // Determine if resize is needed
    let processedWidth = originalWidth;
    let processedHeight = originalHeight;

    let pipeline = image;

    if (originalWidth > MAX_WIDTH) {
      processedWidth = MAX_WIDTH;
      processedHeight = Math.round(
        originalHeight * (MAX_WIDTH / originalWidth)
      );
      pipeline = pipeline.resize(processedWidth, processedHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG for consistent, smaller payloads
    const outputBuffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return {
      base64: outputBuffer.toString("base64"),
      mediaType: "image/jpeg",
      originalWidth,
      originalHeight,
      processedWidth,
      processedHeight,
      sizeBytes: outputBuffer.byteLength,
    };
  } catch {
    // sharp can fail on corrupt images, unsupported formats, etc.
    return null;
  }
}
