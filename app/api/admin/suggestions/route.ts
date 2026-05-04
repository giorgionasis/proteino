import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { suggestionId, itemId, category, itemData, suggestionData, extData } = body;

  if (!suggestionId || !itemId || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  if (itemData && Object.keys(itemData).length > 0) {
    const { error } = await (supabase.from("items") as any).update(itemData).eq("id", itemId);
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
