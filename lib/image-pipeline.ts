import sharp from "sharp";

/**
 * Image variant pipeline for item uploads.
 *
 * Each item can have:
 *   - poster   (2:3 portrait)   — required for movies/series/books
 *   - backdrop (16:9 landscape) — required for food/bars/hotels/etc.
 *   - og       (1.91:1 share)   — auto-derived from backdrop or poster
 *
 * Each slot generates 4 variants (s/m/l/xl) in WebP. OG is JPEG.
 *
 * Sharp pipeline always:
 *   - .rotate()           ← honor EXIF orientation, then strip
 *   - .removeAlpha()      ← strip transparency for predictable output
 *   - resize cover-fit    ← fill the frame, crop excess from center
 *   - WebP q=80 (or JPEG q=85 for OG)
 *
 * Source bytes capped at 10 MB and 5000×5000 px before processing.
 */

export const SLOTS = ["poster", "backdrop"] as const;
export type Slot = (typeof SLOTS)[number];

export type Variant = "s" | "m" | "l" | "xl";

interface Dim { w: number; h: number }

const DIMS: Record<Slot, Record<Variant, Dim>> = {
  poster: {
    s:  { w: 200,  h: 300  },
    m:  { w: 480,  h: 720  },
    l:  { w: 800,  h: 1200 },
    xl: { w: 1600, h: 2400 },
  },
  backdrop: {
    s:  { w: 320,  h: 180  },
    m:  { w: 640,  h: 360  },
    l:  { w: 1280, h: 720  },
    xl: { w: 2048, h: 1152 },
  },
};

const OG_DIM: Dim = { w: 1200, h: 630 };

const WEBP_QUALITY = 80;
const JPEG_QUALITY = 85;

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_INPUT_DIM = 5000;

const FETCH_TIMEOUT_MS = 20_000;

/**
 * Upgrade common third-party CDN URLs to their largest size before the
 * pipeline runs. We get a better source = better output. Idempotent.
 *
 * - TMDB: w500/w780/w1280/h632 etc. → original
 * - Google Books: zoom=1 (thumbnail) → zoom=0 (full); strip edge-curl effect
 * - Other URLs are returned unchanged.
 */
export function upgradeSourceUrl(url: string): string {
  // TMDB images: image.tmdb.org/t/p/{size}/{path}
  // Replace any w<NN> / h<NN> / original with original
  if (/image\.tmdb\.org\/t\/p\//.test(url)) {
    return url.replace(/\/t\/p\/[a-z0-9_]+\//, "/t/p/original/");
  }
  // Google Books image URLs
  if (/books\.google\.com\/books\/content/.test(url)) {
    return url
      .replace(/(&|\?)zoom=\d+/, "$1zoom=0")
      .replace(/(&|\?)edge=curl/, "");
  }
  return url;
}

/**
 * Fetch an image URL into a Buffer with timeout + size-limit safeguards.
 * Used by the URL-upload endpoint so external URLs (TMDB / Google Books /
 * Google Places) flow through the same pipeline as direct uploads.
 */
export async function fetchImageBuffer(rawUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  const url = upgradeSourceUrl(rawUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Spoof a real UA — some CDNs (Google Books) reject default node fetch UA.
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProteinoBot/1.0)" },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed: HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      throw new Error(`Source URL did not return an image (content-type: ${contentType})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_INPUT_BYTES) {
      throw new Error(`Source image too large (${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
    }
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } finally {
    clearTimeout(timeout);
  }
}

interface ProcessedVariant {
  variant: Variant | "og";
  buffer: Buffer;
  contentType: string;
  ext: string;
}

/**
 * Process a single uploaded image into all variants for the given slot,
 * plus an OG variant. Returns one buffer per variant, ready for upload.
 *
 * For `slot=poster`: generates 4 portrait variants. OG is built from a
 * letterboxed version (poster centered on a soft coral-tinted bg).
 *
 * For `slot=backdrop`: generates 4 landscape variants. OG is a 1200×630
 * crop of the same source (close to 16:9 but slightly taller).
 */
export async function processItemImage(
  inputBuffer: Buffer,
  slot: Slot,
): Promise<ProcessedVariant[]> {
  if (inputBuffer.length > MAX_INPUT_BYTES) {
    throw new Error(`File too large (${(inputBuffer.length / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`);
  }

  // Pre-process: auto-rotate from EXIF (then strip), validate dimensions.
  const base = sharp(inputBuffer, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions.");
  }
  if (meta.width > MAX_INPUT_DIM || meta.height > MAX_INPUT_DIM) {
    throw new Error(`Image too large: ${meta.width}×${meta.height}. Max ${MAX_INPUT_DIM}×${MAX_INPUT_DIM}.`);
  }

  // Pre-baked sharp pipeline buffer with EXIF stripped + alpha flattened.
  // Reuse for all variant generations.
  const cleanBuffer = await base
    .removeAlpha()
    .toBuffer();

  const dims = DIMS[slot];
  const variantBuffers = await Promise.all(
    (Object.keys(dims) as Variant[]).map(async (variant) => {
      const { w, h } = dims[variant];
      const buffer = await sharp(cleanBuffer)
        .resize(w, h, { fit: "cover", position: "centre" })
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toBuffer();
      return { variant, buffer, contentType: "image/webp", ext: "webp" } as ProcessedVariant;
    }),
  );

  // OG image: 1200×630 JPEG. For backdrop, simple cover-fit crop. For
  // poster, letterbox onto a coral-tinted bg (#fff5ec) so the portrait
  // poster is centered on a landscape canvas.
  let ogBuffer: Buffer;
  if (slot === "backdrop") {
    ogBuffer = await sharp(cleanBuffer)
      .resize(OG_DIM.w, OG_DIM.h, { fit: "cover", position: "centre" })
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();
  } else {
    // Poster → resize to fit within 1200×630, then composite onto bg
    const innerH = OG_DIM.h - 40; // 20px padding top/bottom
    const innerW = Math.round(innerH * (2 / 3)); // maintain 2:3
    const posterResized = await sharp(cleanBuffer)
      .resize(innerW, innerH, { fit: "contain" })
      .png()
      .toBuffer();
    ogBuffer = await sharp({
      create: {
        width: OG_DIM.w,
        height: OG_DIM.h,
        channels: 3,
        background: { r: 255, g: 245, b: 236 }, // coral-50 #FFF5EC
      },
    })
      .composite([{ input: posterResized, gravity: "centre" }])
      .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
      .toBuffer();
  }

  variantBuffers.push({
    variant: "og",
    buffer: ogBuffer,
    contentType: "image/jpeg",
    ext: "jpg",
  });

  return variantBuffers;
}

/**
 * Build the storage path for a variant.
 * Format: items/{itemId}/{slot}-{variant}.{ext}
 */
export function variantStoragePath(itemId: string, slot: Slot, variant: Variant | "og"): string {
  const ext = variant === "og" ? "jpg" : "webp";
  if (variant === "og") {
    return `items/${itemId}/${slot}-og.${ext}`;
  }
  return `items/${itemId}/${slot}-${variant}.${ext}`;
}
