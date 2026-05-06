import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { suggestionId, itemId, category, itemData, suggestionData, extData, metadataPatch } = body;

  if (!suggestionId || !itemId || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  // Merge metadataPatch into existing item.metadata before issuing the
  // items.update — admins editing one metadata field shouldn't blow
  // away other keys (poster URLs, tags, rating_distribution, etc).
  let mergedItemData = itemData;
  if (metadataPatch && typeof metadataPatch === "object") {
    const { data: existing } = await supabase
      .from("items")
      .select("metadata")
      .eq("id", itemId)
      .maybeSingle();
    const currentMeta = (existing as any)?.metadata ?? {};
    mergedItemData = {
      ...(itemData ?? {}),
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

  return NextResponse.json({ ok: true });
}
