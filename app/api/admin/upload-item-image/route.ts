import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { processItemImage, variantStoragePath, SLOTS, MAX_INPUT_BYTES, type Slot } from "@/lib/image-pipeline";

const ALLOWED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Force Node runtime — Sharp uses native bindings, can't run on Edge.
export const runtime = "nodejs";
// Generous body limit for image uploads.
export const maxDuration = 60;

/**
 * POST /api/admin/upload-item-image
 *
 * multipart/form-data:
 *   file:   <File>          original image (≤10 MB)
 *   itemId: <string>        target item UUID
 *   slot:   "poster"|"backdrop"
 *
 * Pipeline:
 *   1. Validate (type, size, dimensions)
 *   2. Sharp → 4 WebP variants (s/m/l/xl) + 1 JPEG OG
 *   3. Upload all variants to Supabase Storage (media bucket)
 *   4. Update items.images jsonb with { [slot]: { s, m, l, xl }, og }
 *
 * Returns: { images: <updated images jsonb> }
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  const itemId = formData.get("itemId");
  const slot = formData.get("slot");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (typeof itemId !== "string" || !/^[a-f0-9-]{36}$/.test(itemId)) {
    return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
  }
  if (typeof slot !== "string" || !SLOTS.includes(slot as Slot)) {
    return NextResponse.json({ error: `Invalid slot. Must be one of: ${SLOTS.join(", ")}.` }, { status: 400 });
  }
  if (!ALLOWED_INPUT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type (${file.type}). Allowed: JPG, PNG, WebP, GIF.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 10 MB.` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let variants;
  try {
    variants = await processItemImage(buffer, slot as Slot);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Image processing failed." }, { status: 400 });
  }

  const sb = createAdminClient();

  // Upload each variant to storage. Use upsert: true so re-uploading the
  // same slot for an item replaces the old variants cleanly.
  const uploads = variants.map(async (v) => {
    const path = variantStoragePath(itemId, slot as Slot, v.variant);
    const { error } = await sb.storage.from("media").upload(path, v.buffer, {
      contentType: v.contentType,
      upsert: true,
      cacheControl: "31536000", // 1 year — variant content is immutable per (itemId, slot, variant)
    });
    if (error) throw new Error(`Upload failed for ${v.variant}: ${error.message}`);
    const { data: pub } = sb.storage.from("media").getPublicUrl(path);
    return { variant: v.variant, url: pub.publicUrl };
  });

  let uploaded;
  try {
    uploaded = await Promise.all(uploads);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Storage upload failed." }, { status: 500 });
  }

  // Build the slot object: { s, m, l, xl } and OG (single).
  const slotImages: Record<string, string> = {};
  let ogUrl: string | null = null;
  for (const u of uploaded) {
    if (u.variant === "og") ogUrl = u.url;
    else slotImages[u.variant] = u.url;
  }

  // Merge into items.images jsonb. Preserve other slots (if poster was
  // uploaded earlier, keep it when uploading a backdrop now).
  const { data: existing } = await sb
    .from("items")
    .select("images")
    .eq("id", itemId)
    .single<{ images: any }>();

  const prevImages = (existing?.images ?? {}) as Record<string, any>;
  // Some legacy data has `images` as an array; coerce to object.
  const baseImages = Array.isArray(prevImages) ? {} : prevImages;
  const newImages = {
    ...baseImages,
    [slot as string]: slotImages,
    ...(ogUrl ? { og: ogUrl } : {}),
  };

  const { error: updateErr } = await (sb.from("items") as any)
    .update({ images: newImages })
    .eq("id", itemId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ images: newImages });
}
