import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*, collection_placements(*)")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const supabase = createAdminClient();

  const {
    type, title, title_specific, alias, image_url,
    source_category, tags, filters, item_limit,
    is_published, valid_from, valid_until, target_audience,
    placements,
  } = body;

  // Build patch object — only fields explicitly passed
  const patch: Record<string, any> = {};
  if (type !== undefined) patch.type = type;
  if (title !== undefined) patch.title = title;
  if (title_specific !== undefined) patch.title_specific = title_specific || null;
  if (alias !== undefined) patch.alias = alias;
  if (image_url !== undefined) patch.image_url = image_url || null;
  if (source_category !== undefined) patch.source_category = source_category || null;
  if (tags !== undefined) patch.tags = tags;
  if (filters !== undefined) patch.filters = filters;
  if (item_limit !== undefined) patch.item_limit = item_limit;
  if (is_published !== undefined) patch.is_published = is_published;
  if (valid_from !== undefined) patch.valid_from = valid_from || null;
  if (valid_until !== undefined) patch.valid_until = valid_until || null;
  if (target_audience !== undefined) patch.target_audience = target_audience;

  if (Object.keys(patch).length > 0) {
    const { error } = await (supabase.from("collections") as any)
      .update(patch)
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace placements if provided. Strategy: load existing, diff, surgical add/remove.
  // Preserves display_order for placements that didn't change.
  if (Array.isArray(placements)) {
    const { data: existing } = await supabase
      .from("collection_placements")
      .select("id, context, category")
      .eq("collection_id", params.id);

    const key = (p: { context: string; category: string | null | undefined }) =>
      `${p.context}:${p.category ?? ""}`;

    const existingMap = new Map(
      (existing ?? []).map((p: any) => [key(p), p.id])
    );
    const incomingKeys = new Set(
      placements.map((p: any) => key({
        context: p.context,
        category: p.context === "home" ? null : p.category,
      }))
    );

    // Remove placements no longer wanted
    const toRemove = (existing ?? [])
      .filter((p: any) => !incomingKeys.has(key(p)))
      .map((p: any) => p.id);

    if (toRemove.length > 0) {
      await supabase.from("collection_placements").delete().in("id", toRemove);
    }

    // Add placements that don't exist yet, appending to bucket
    for (const p of placements) {
      const cat = p.context === "home" ? null : p.category;
      const k = key({ context: p.context, category: cat });
      if (existingMap.has(k)) continue;

      const { data: maxRow } = await supabase
        .from("collection_placements")
        .select("display_order")
        .eq("context", p.context)
        .is("category", cat as any)
        .order("display_order", { ascending: false })
        .limit(1);
      const next = ((maxRow as any)?.[0]?.display_order ?? -1) + 1;

      await (supabase.from("collection_placements") as any).insert({
        collection_id: params.id,
        context: p.context,
        category: cat,
        display_order: next,
      });
    }
  }

  const { data: full, error: fetchErr } = await supabase
    .from("collections")
    .select("*, collection_placements(*)")
    .eq("id", params.id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  return NextResponse.json(full);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  // Placements cascade via FK ON DELETE CASCADE
  const { error } = await supabase.from("collections").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
