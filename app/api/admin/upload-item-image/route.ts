import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { SLOTS, MAX_INPUT_BYTES, type Slot } from "@/lib/image-pipeline";
import {
  processAndStoreItemImage,
  processAndStoreItemImageFromUrl,
} from "@/lib/item-image-upload";

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
  const sb = createAdminClient();

  if (contentType.includes("application/json")) {
    // ── MODE B: URL source ────────────────────────────────────────
    const body = (await req.json().catch(() => null)) as
      | { itemId?: string; slot?: string; sourceUrl?: string }
      | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

    if (typeof body.itemId !== "string" || !/^[a-f0-9-]{36}$/.test(body.itemId)) {
      return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
    }
    if (typeof body.slot !== "string" || !SLOTS.includes(body.slot as Slot)) {
      return NextResponse.json({ error: `Invalid slot.` }, { status: 400 });
    }
    if (typeof body.sourceUrl !== "string" || !/^https?:\/\//i.test(body.sourceUrl)) {
      return NextResponse.json({ error: "Invalid sourceUrl." }, { status: 400 });
    }

    try {
      const images = await processAndStoreItemImageFromUrl(sb, body.itemId, body.slot as Slot, body.sourceUrl);
      return NextResponse.json({ images });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? "Pipeline failed." }, { status: 500 });
    }
  }

  // ── MODE A: multipart file upload ───────────────────────────────
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
    return NextResponse.json({ error: `Invalid slot.` }, { status: 400 });
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
  try {
    const images = await processAndStoreItemImage(sb, itemIdRaw, slotRaw as Slot, buffer);
    return NextResponse.json({ images });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Pipeline failed." }, { status: 500 });
  }
}
