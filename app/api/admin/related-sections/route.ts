/**
 * /api/admin/related-sections
 *
 * GET  — list all rules across all categories
 * POST — create a new rule
 *
 * Writes call revalidatePath for the affected category so detail pages
 * pick up the new rule on next navigation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCategory } from "@/lib/revalidate";

const VALID_CATEGORIES = new Set([
  "books", "movies", "series", "food", "recipes",
  "bars", "hotels", "theater", "events",
]);

export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await (sb.from("related_sections_config") as any)
    .select("*")
    .order("category")
    .order("display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { category, field, title_template, min_items, item_limit, display_order, is_active } = body as {
    category: string;
    field: string;
    title_template: string;
    min_items?: number;
    item_limit?: number;
    display_order?: number;
    is_active?: boolean;
  };

  if (!category || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!field || typeof field !== "string" || field.trim().length === 0) {
    return NextResponse.json({ error: "field required" }, { status: 400 });
  }
  if (!title_template || typeof title_template !== "string") {
    return NextResponse.json({ error: "title_template required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const { data, error } = await (sb.from("related_sections_config") as any)
    .insert({
      category,
      field: field.trim(),
      title_template,
      min_items: typeof min_items === "number" && min_items >= 1 ? min_items : 2,
      item_limit: typeof item_limit === "number" && item_limit >= 1 && item_limit <= 20 ? item_limit : 6,
      display_order: typeof display_order === "number" ? display_order : 0,
      is_active: typeof is_active === "boolean" ? is_active : true,
    })
    .select()
    .single();

  if (error) {
    // UNIQUE(category, field) violation → 23505. Surface as 409.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: `Υπάρχει ήδη rule για ${category} / ${field}` }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateCategory(category);
  return NextResponse.json({ rule: data });
}
