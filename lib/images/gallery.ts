/**
 * Helpers for the dual-shape `items.images` JSONB.
 *
 * Two writers, two shapes that need to coexist:
 *
 *   Pipeline (lib/item-image-upload.ts) writes object keys:
 *     { poster: {s,m,l,xl}, backdrop: {...}, og: "...url..." }
 *
 *   Admin gallery editor writes a `gallery` array under the same root:
 *     { gallery: [{url, tab?, alt?, isDefault?}, ...] }
 *
 *   Both shapes can — and do — live side by side:
 *     { poster: {...}, backdrop: {...}, og: "...", gallery: [...] }
 *
 * Legacy K2-migrated rows may have `images` stored as a plain array
 * (no `gallery` key). These helpers treat that array as if it were
 * `images.gallery` so the admin/frontend keep rendering it; the next
 * admin save normalises it into the object shape.
 */
export interface GalleryImage {
  url: string;
  alt?: string;
  tab?: string;
  isDefault?: boolean;
}

interface PipelineImages {
  poster?: { s?: string; m?: string; l?: string; xl?: string };
  backdrop?: { s?: string; m?: string; l?: string; xl?: string };
  og?: string;
  gallery?: GalleryImage[];
}

/** Extract the gallery image array regardless of which shape was
 *  written. Returns [] when nothing usable is present. */
export function extractGalleryImages(images: unknown): GalleryImage[] {
  if (!images) return [];
  // Legacy: array stored directly at root.
  if (Array.isArray(images)) return images.filter(isGalleryImage);
  // New object shape with explicit `gallery` key.
  if (typeof images === "object") {
    const obj = images as PipelineImages;
    if (Array.isArray(obj.gallery)) return obj.gallery.filter(isGalleryImage);
  }
  return [];
}

/** Merge a fresh gallery array back into the dual-shape object,
 *  preserving any pipeline-managed poster/backdrop/og keys. Pass the
 *  ORIGINAL images value (whatever shape it was) so we don't drop
 *  pipeline data on save. */
export function mergeGalleryIntoImages(
  original: unknown,
  gallery: GalleryImage[],
): Record<string, unknown> {
  const base: Record<string, unknown> =
    original && typeof original === "object" && !Array.isArray(original)
      ? { ...(original as Record<string, unknown>) }
      : {};
  if (gallery.length > 0) {
    base.gallery = gallery;
  } else {
    delete base.gallery;
  }
  return base;
}

/** Cover URL preference order:
 *    1. admin-set default in `gallery[].isDefault` (manual override)
 *    2. pipeline-managed images.poster (best variant available)
 *    3. items.cover_url fallback (legacy column)
 *
 * Used by detail pages so the admin's "Set cover" choice wins. */
export function pickCoverUrl(
  images: unknown,
  fallback?: string | null,
): string | null {
  const gallery = extractGalleryImages(images);
  const def = gallery.find((g) => g.isDefault === true);
  if (def?.url) return def.url;
  if (images && typeof images === "object" && !Array.isArray(images)) {
    const obj = images as PipelineImages;
    const poster = obj.poster;
    if (poster) {
      return poster.l ?? poster.m ?? poster.xl ?? poster.s ?? fallback ?? null;
    }
  }
  return fallback ?? null;
}

function isGalleryImage(v: unknown): v is GalleryImage {
  return Boolean(v) && typeof v === "object" && typeof (v as GalleryImage).url === "string";
}
