import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  processItemImage,
  processMainImage,
  variantStoragePath,
  fetchImageBuffer,
  type Slot,
} from "./image-pipeline";

/**
 * Higher-level helpers that wrap the pure image-pipeline (Sharp resize +
 * variant generation) with Supabase Storage upload + items table update.
 *
 * Used by:
 *   - /api/admin/upload-item-image    (file or URL — admin direct flow)
 *   - /api/suggestions                (auto-pipeline on new item creation)
 *   - scripts/bulk-enrich.js          (via the HTTP endpoint, but the
 *                                      logic is the same shape)
 *
 * Returns the merged images jsonb so the caller can decide whether to
 * surface it or just fire-and-forget.
 */

export interface MainImageShape {
  /** width (px) → public URL, ascending. Uncropped, aspect preserved. */
  widths: Record<string, string>;
  aspect: number;
  focal:  { x: number; y: number };
}

export interface ItemImagesShape {
  poster?:   { s?: string; m?: string; l?: string; xl?: string };
  backdrop?: { s?: string; m?: string; l?: string; xl?: string };
  main?:     MainImageShape;
  og?:       string;
}

/**
 * Process a buffer for a slot, upload all variants to Supabase Storage,
 * and merge URLs into items.images jsonb (preserving the other slot if
 * already populated). Also updates the legacy poster_url / backdrop_url
 * column to the 'l' variant so non-migrated frontends still benefit.
 *
 * Throws on any storage or DB error.
 */
export async function processAndStoreItemImage(
  sb: SupabaseClient<any>,
  itemId: string,
  slot: Slot,
  buffer: Buffer,
): Promise<ItemImagesShape> {
  const variants = await processItemImage(buffer, slot);

  const uploads = variants.map(async (v) => {
    const path = variantStoragePath(itemId, slot, v.variant);
    const { error } = await sb.storage.from("media").upload(path, v.buffer, {
      contentType: v.contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw new Error(`Upload failed for ${slot}.${v.variant}: ${error.message}`);
    const { data: pub } = sb.storage.from("media").getPublicUrl(path);
    return { variant: v.variant, url: pub.publicUrl };
  });

  const uploaded = await Promise.all(uploads);

  const slotImages: Record<string, string> = {};
  let ogUrl: string | null = null;
  for (const u of uploaded) {
    if (u.variant === "og") ogUrl = u.url;
    else slotImages[u.variant] = u.url;
  }

  const { data: existing } = await sb
    .from("items")
    .select("images")
    .eq("id", itemId)
    .single<{ images: any }>();

  const prevImages = (existing?.images ?? {}) as Record<string, any>;
  const baseImages = Array.isArray(prevImages) ? {} : prevImages;
  const newImages: ItemImagesShape = {
    ...baseImages,
    [slot]: slotImages,
    ...(ogUrl ? { og: ogUrl } : {}),
  };

  const legacyColumn = slot === "poster" ? "poster_url" : "backdrop_url";
  const updatePayload: Record<string, any> = {
    images: newImages,
    [legacyColumn]: slotImages.l ?? slotImages.m ?? slotImages.s,
  };

  const { error: updateErr } = await (sb.from("items") as any)
    .update(updatePayload)
    .eq("id", itemId);

  if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

  return newImages;
}

/**
 * Same as processAndStoreItemImage but takes a source URL (TMDB / Google
 * Books / Google Places etc.). Fetches with timeout + size limit, then
 * delegates to the buffer version.
 *
 * URLs are auto-upgraded to the largest available size before fetch
 * (TMDB w500 → original, Google Books zoom=1 → zoom=0).
 */
export async function processAndStoreItemImageFromUrl(
  sb: SupabaseClient<any>,
  itemId: string,
  slot: Slot,
  sourceUrl: string,
): Promise<ItemImagesShape> {
  const { buffer } = await fetchImageBuffer(sourceUrl);
  return processAndStoreItemImage(sb, itemId, slot, buffer);
}

/**
 * "Store whole, crop on display" (see processMainImage). Uploads the width
 * ladder + OG to `items/{itemId}/main-{w}.webp` / `og.jpg`, merges
 * `images.main` + `images.og` into the existing images jsonb (gallery and
 * pipeline keys preserved — never narrows the dual shape), and points
 * cover_url (≤640w, list surfaces) and the category's legacy column
 * (largest width) at the new files so un-migrated surfaces render too.
 *
 * URLs carry `?v=<content hash>` because objects are cached for a year.
 */
export async function storeMainImage(
  sb: SupabaseClient<any>,
  itemId: string,
  buffer: Buffer,
  { portrait }: { portrait: boolean },
): Promise<{ main: MainImageShape; og: string }> {
  const processed = await processMainImage(buffer, { portrait });

  // Sequential + retried: every Storage upload also writes object metadata
  // to Postgres, and parallel bursts exhaust the free-tier connection pool
  // ("Too many connections issued to the database").
  const upload = async (path: string, body: Buffer, contentType: string) => {
    for (let attempt = 1; ; attempt++) {
      const { error } = await sb.storage.from("media").upload(path, body, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });
      if (!error) break;
      if (attempt >= 5) throw new Error(`Upload failed for ${path}: ${error.message}`);
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
    const v = createHash("sha1").update(body).digest("hex").slice(0, 8);
    return `${sb.storage.from("media").getPublicUrl(path).data.publicUrl}?v=${v}`;
  };

  const widths: Record<string, string> = {};
  for (const v of processed.variants) {
    widths[v.width] = await upload(`items/${itemId}/main-${v.width}.webp`, v.buffer, "image/webp");
  }
  const og = await upload(`items/${itemId}/og.jpg`, processed.og, "image/jpeg");

  const main: MainImageShape = { widths, aspect: processed.aspect, focal: processed.focal };

  const { data: existing, error: readErr } = await sb
    .from("items")
    .select("images")
    .eq("id", itemId)
    .single<{ images: unknown }>();
  if (readErr) throw new Error(`Read failed: ${readErr.message}`);

  // Legacy array shape = gallery (see lib/images/gallery.ts) — keep it.
  const prev = existing?.images;
  const base: Record<string, unknown> = Array.isArray(prev)
    ? (prev.length ? { gallery: prev } : {})
    : (prev && typeof prev === "object" ? { ...(prev as Record<string, unknown>) } : {});

  const sorted = Object.keys(widths).map(Number).sort((a, b) => a - b);
  const cover = widths[sorted.filter((w) => w <= 640).pop() ?? sorted[0]];
  const largest = widths[sorted[sorted.length - 1]];

  const { error: updateErr } = await (sb.from("items") as any)
    .update({
      images: { ...base, main, og },
      cover_url: cover,
      [portrait ? "poster_url" : "backdrop_url"]: largest,
    })
    .eq("id", itemId);
  if (updateErr) throw new Error(`Update failed: ${updateErr.message}`);

  return { main, og };
}
