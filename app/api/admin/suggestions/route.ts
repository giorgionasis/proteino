import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { revalidateItem } from "@/lib/revalidate";
import { mergeGalleryIntoImages, type GalleryImage } from "@/lib/images/gallery";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { suggestionId, itemId, category, itemData, suggestionData, extData, metadataPatch, gallery } = body;

  if (!suggestionId || !itemId || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  // Auto-stamp admin_reviewed_by when admin_reviewed_at is being set.
  // Clear admin_reviewed_by when admin_reviewed_at is being nulled
  // (un-review toggle). Lookup uses the cookie-aware client so we get
  // the actual admin user id from the session.
  let mergedItemData = itemData ? { ...itemData } : null;
  if (mergedItemData && "admin_reviewed_at" in mergedItemData) {
    if (mergedItemData.admin_reviewed_at) {
      const cookieSb = await createClient();
      const { data: { user } } = await cookieSb.auth.getUser();
      mergedItemData.admin_reviewed_by = user?.id ?? null;
    } else {
      mergedItemData.admin_reviewed_by = null;
    }
  }

  // Server-side gallery merge — the client sends only the admin-edited
  // `gallery` array; the server re-reads the row's current `images` blob
  // and merges, so pipeline-managed poster/backdrop/og keys can't be
  // wiped by a stale client copy. Wrong-shape galleries silently coerce
  // to an empty array — we still want to give the admin the ability to
  // remove all gallery photos by clearing them.
  // Reject the legacy "client computed mergedImages" path (itemData.images)
  // so two writers can't fight over the same column.
  if (mergedItemData && "images" in mergedItemData) {
    delete mergedItemData.images;
  }
  if (Array.isArray(gallery)) {
    const safeGallery: GalleryImage[] = (gallery as unknown[])
      .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === "object" && typeof (g as { url?: unknown }).url === "string")
      .map((g) => ({
        url: String(g.url),
        tab: typeof g.tab === "string" ? g.tab : undefined,
        alt: typeof g.alt === "string" ? g.alt : undefined,
        isDefault: g.isDefault === true ? true : undefined,
      }));
    const { data: existing } = await supabase
      .from("items")
      .select("images")
      .eq("id", itemId)
      .maybeSingle();
    const currentImages = (existing as any)?.images ?? null;
    const nextImages = mergeGalleryIntoImages(currentImages, safeGallery);
    mergedItemData = { ...(mergedItemData ?? {}), images: nextImages };
  }

  // Merge metadataPatch into existing item.metadata before issuing the
  // items.update — admins editing one metadata field shouldn't blow
  // away other keys (poster URLs, tags, rating_distribution, etc).
  if (metadataPatch && typeof metadataPatch === "object") {
    const { data: existing } = await supabase
      .from("items")
      .select("metadata")
      .eq("id", itemId)
      .maybeSingle();
    const currentMeta = (existing as any)?.metadata ?? {};
    mergedItemData = {
      ...(mergedItemData ?? {}),
      metadata: { ...currentMeta, ...metadataPatch },
    };
  }

  if (mergedItemData && Object.keys(mergedItemData).length > 0) {
    const { error } = await (supabase.from("items") as any).update(mergedItemData).eq("id", itemId);
    if (error) errors.push(`items: ${error.message}`);
  }

  if (suggestionData && Object.keys(suggestionData).length > 0) {
    const { error } = await (supabase.from("suggestions") as any).update(suggestionData).eq("id", suggestionId);
    if (error) errors.push(`suggestions: ${error.message}`);
  }

  if (extData && Object.keys(extData).length > 0) {
    const table = `item_${category}` as any;
    const { error } = await supabase
      .from(table)
      .upsert({ item_id: itemId, ...extData }, { onConflict: "item_id" });
    if (error) errors.push(`${table}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  // Invalidate the frontend pages that show this item — detail,
  // category listing, reviews subpage, home. Without this the admin
  // edit doesn't appear publicly until the next ISR tick / rebuild.
  // `slug` may not be in the payload; revalidateItem handles null.
  revalidateItem(category, mergedItemData?.slug ?? null);

  return NextResponse.json({ ok: true });
}
