import type { SupabaseClient } from "@supabase/supabase-js";
import {
  processItemImage,
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

export interface ItemImagesShape {
  poster?:   { s?: string; m?: string; l?: string; xl?: string };
  backdrop?: { s?: string; m?: string; l?: string; xl?: string };
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
