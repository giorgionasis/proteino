/**
 * /api/admin/page-sections
 *
 * GET  ?context=…&category=…    — list all sections in a bucket
 *                                 (always returns ALL audiences; admin
 *                                 client filters in-browser for display)
 * POST { context, category, section_type, … } — create a new section
 *
 * Admin-only (no auth check here yet; relies on /admin layout's
 * role=admin gate + sidebar navigation. Service-role client used so
 * RLS doesn't mask draft / inactive rows).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateCategory, revalidateHome } from "@/lib/revalidate";
import { WIDGET_REGISTRY, isWidgetSingleton } from "@/lib/layout/widgets";
import {
  executeWithAuditFallback,
  getAdminAuditUserId,
  resolveAdminUserMap,
} from "@/lib/admin/audit";

const VALID_CONTEXTS = new Set(["home", "category", "suggestions"]);
const VALID_AUDIENCES = new Set(["all", "registered", "guest"]);
const VALID_TYPES = new Set(["collection", "widget", "divider"]);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const context = sp.get("context");
  const category = sp.get("category");

  if (!context || !VALID_CONTEXTS.has(context)) {
    return NextResponse.json({ error: "context required (home|category|suggestions)" }, { status: 400 });
  }

  const sb = createAdminClient();
  let q = (sb.from("page_sections") as any)
    .select(
      "id, section_type, collection_id, widget_key, context, category, display_order, audience, config, is_active, valid_from, valid_until, created_at, modified_at, modified_by, collection:collections(id, type, title, title_specific, alias, image_url, source_category, tags, is_published)"
    )
    .eq("context", context)
    .order("display_order");

  if (context === "home") q = q.is("category", null);
  else if (category) q = q.eq("category", category);

  let { data, error } = await q;
  // Pre-040 fallback: retry without modified_by if the column is missing.
  if (error && (error as { code?: string }).code === "42703") {
    let retry = (sb.from("page_sections") as any)
      .select(
        "id, section_type, collection_id, widget_key, context, category, display_order, audience, config, is_active, valid_from, valid_until, created_at, modified_at, collection:collections(id, type, title, title_specific, alias, image_url, source_category, tags, is_published)"
      )
      .eq("context", context)
      .order("display_order");
    if (context === "home") retry = retry.is("category", null);
    else if (category) retry = retry.eq("category", category);
    ({ data, error } = await retry);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Array<{ modified_by?: string | null }>;
  const userMap = await resolveAdminUserMap(sb, rows);

  return NextResponse.json({ sections: data ?? [], userMap });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    context, category, section_type, widget_key, collection_id,
    audience, config, display_order,
  } = body as {
    context: string;
    category: string | null;
    section_type: string;
    widget_key?: string | null;
    collection_id?: string | null;
    audience?: string;
    config?: Record<string, unknown>;
    display_order?: number;
  };

  if (!context || !VALID_CONTEXTS.has(context)) {
    return NextResponse.json({ error: "context required" }, { status: 400 });
  }
  if (context !== "home" && !category) {
    return NextResponse.json({ error: "category required for non-home contexts" }, { status: 400 });
  }
  if (!section_type || !VALID_TYPES.has(section_type)) {
    return NextResponse.json({ error: "section_type required (collection|widget|divider)" }, { status: 400 });
  }
  if (audience && !VALID_AUDIENCES.has(audience)) {
    return NextResponse.json({ error: "audience invalid" }, { status: 400 });
  }

  // Type-ref consistency (mirrors the CHECK constraint).
  if (section_type === "collection" && !collection_id) {
    return NextResponse.json({ error: "collection_id required for collection" }, { status: 400 });
  }
  if (section_type === "widget" && !widget_key) {
    return NextResponse.json({ error: "widget_key required for widget" }, { status: 400 });
  }
  if (section_type === "widget") {
    const spec = WIDGET_REGISTRY[widget_key!];
    if (!spec) {
      return NextResponse.json({ error: `Unknown widget_key: ${widget_key}` }, { status: 400 });
    }
    if (!spec.contexts.includes(context as never)) {
      return NextResponse.json({ error: `Widget ${widget_key} not allowed in context ${context}` }, { status: 400 });
    }
    if (category && spec.categories && !spec.categories.includes(category as never)) {
      return NextResponse.json({ error: `Widget ${widget_key} not allowed in category ${category}` }, { status: 400 });
    }
  }

  const sb = createAdminClient();

  // Singleton enforcement — check no existing row exists for this widget
  // in this (context, category, audience) bucket.
  if (section_type === "widget" && isWidgetSingleton(widget_key!)) {
    let dup = (sb.from("page_sections") as any)
      .select("id")
      .eq("section_type", "widget")
      .eq("widget_key", widget_key)
      .eq("context", context)
      .eq("audience", audience ?? "all");
    dup = context === "home" ? dup.is("category", null) : dup.eq("category", category);
    const { data: existing } = await dup;
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: `Widget ${widget_key} already placed in this bucket (singleton)` },
        { status: 409 }
      );
    }
  }

  // Default display_order = max + 10 within the bucket (puts new
  // section at the bottom). Admin can drag-reorder afterward.
  let finalOrder = display_order;
  if (typeof finalOrder !== "number") {
    let maxQ = (sb.from("page_sections") as any)
      .select("display_order")
      .eq("context", context)
      .order("display_order", { ascending: false })
      .limit(1);
    maxQ = context === "home" ? maxQ.is("category", null) : maxQ.eq("category", category);
    const { data: maxRow } = await maxQ;
    const currentMax = (maxRow?.[0]?.display_order as number | undefined) ?? 0;
    finalOrder = currentMax + 10;
  }

  const userId = await getAdminAuditUserId();
  const { data, error } = await executeWithAuditFallback(
    (stamped) =>
      (sb.from("page_sections") as any)
        .insert(stamped)
        .select()
        .single(),
    {
      context,
      category: context === "home" ? null : category,
      section_type,
      widget_key: section_type === "widget" ? widget_key : null,
      collection_id: section_type === "collection" ? collection_id : null,
      audience: audience ?? "all",
      config: config ?? {},
      display_order: finalOrder,
      is_active: true,
    },
    userId,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (context === "home") revalidateHome();
  else if (category) revalidateCategory(category);

  return NextResponse.json({ section: data });
}
