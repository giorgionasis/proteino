import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  processItemImage,
  variantStoragePath,
  fetchImageBuffer,
  SLOTS,
  MAX_INPUT_BYTES,
  type Slot,
} from "@/lib/image-pipeline";

const ALLOWED_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Force Node runtime — Sharp uses native bindings, can't run on Edge.
export const runtime = "nodejs";
// Generous duration: URL fetch + Sharp pipeline + 9 storage uploads.
export const maxDuration = 60;

/**
 * Image upload endpoint. Two input modes — same pipeline + storage logic.
 *
 * MODE A — direct upload (multipart/form-data):
 *   file:   <File>          original image (≤10 MB)
 *   itemId: <string>        target item UUID
 *   slot:   "poster"|"backdrop"
 *
 * MODE B — fetch from URL (application/json):
 *   { itemId, slot, sourceUrl }
 *   sourceUrl is fetched server-side (TMDB, Google Books, etc.). The
 *   pipeline upgrades known CDN URLs to their largest size before
 *   processing (e.g. tmdb /t/p/w500/ → /t/p/original/) so we get the
 *   best source for our resize.
 *
 * Pipeline (both modes):
 *   1. Validate (type, size, dimensions)
 *   2. Sharp → 4 WebP variants (s/m/l/xl) + 1 JPEG OG
 *   3. Upload all variants to Supabase Storage (media bucket)
 *   4. Update items.images jsonb with { [slot]: { s, m, l, xl }, og }
 *   5. Update legacy poster_url/backdrop_url columns to point to the new
 *      large variant (so frontends that still read those columns get
 *      the optimized version)
 *
 * Returns: { images: <updated images jsonb> }
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let itemId: string;
  let slot: Slot;
  let buffer: Buffer;

  if (contentType.includes("application/json")) {
    // ── MODE B: URL source ────────────────────────────────────────
    const body = await req.json().catch(() => null) as
      | { itemId?: string; slot?: string; sourceUrl?: string }
      | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

    if (typeof body.itemId !== "string" || !/^[a-f0-9-]{36}$/.test(body.itemId)) {
      return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
    }
    if (typeof body.slot !== "string" || !SLOTS.includes(body.slot as Slot)) {
      return NextResponse.json({ error: `Invalid slot. Must be one of: ${SLOTS.join(", ")}.` }, { status: 400 });
    }
    if (typeof body.sourceUrl !== "string" || !/^https?:\/\//i.test(body.sourceUrl)) {
      return NextResponse.json({ error: "Invalid sourceUrl. Must be http(s)." }, { status: 400 });
    }

    itemId = body.itemId;
    slot = body.slot as Slot;

    try {
      const fetched = await fetchImageBuffer(body.sourceUrl);
      buffer = fetched.buffer;
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? "Failed to fetch source URL." }, { status: 400 });
    }
  } else {
    // ── MODE A: multipart file upload ─────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file");
    const itemIdRaw = formData.get("itemId");
    const slotRaw = formData.get("slot");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (typeof itemIdRaw !== "string" || !/^[a-f0-9-]{36}$/.test(itemIdRaw)) {
      return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
    }
    if (typeof slotRaw !== "string" || !SLOTS.includes(slotRaw as Slot)) {
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

    itemId = itemIdRaw;
    slot = slotRaw as Slot;
    buffer = Buffer.from(await file.arrayBuffer());
  }

  // ── Pipeline + storage (shared) ─────────────────────────────────
  let variants;
  try {
    variants = await processItemImage(buffer, slot);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Image processing failed." }, { status: 400 });
  }

  const sb = createAdminClient();

  const uploads = variants.map(async (v) => {
    const path = variantStoragePath(itemId, slot, v.variant);
    const { error } = await sb.storage.from("media").upload(path, v.buffer, {
      contentType: v.contentType,
      upsert: true,
      cacheControl: "31536000",
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
  const newImages = {
    ...baseImages,
    [slot]: slotImages,
    ...(ogUrl ? { og: ogUrl } : {}),
  };

  // Also update the legacy column for this slot to point to the 'l'
  // variant — frontends still reading poster_url/backdrop_url get an
  // optimized URL automatically. cover_url is set to whichever slot
  // is the "default" for the category (poster for portrait categories).
  const legacyColumn = slot === "poster" ? "poster_url" : "backdrop_url";
  const updatePayload: Record<string, any> = {
    images: newImages,
    [legacyColumn]: slotImages.l ?? slotImages.m ?? slotImages.s,
  };

  const { error: updateErr } = await (sb.from("items") as any)
    .update(updatePayload)
    .eq("id", itemId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ images: newImages });
}
