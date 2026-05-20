import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateAfterCategoryEdit } from "../route";
import { CATEGORIES } from "@/constants/categories";

const VALID_SLUGS = new Set(CATEGORIES.map((c) => c.slug));

interface PatchBody {
  display_label_el?: string | null;
  icon?:             string | null;
  display_order?:    number;
  is_nav_published?: boolean;
}

/**
 * PATCH /api/admin/categories/[slug]
 *
 * Body: subset of `{ display_label_el, icon, display_order,
 * is_nav_published }`. Slug + capability flags (hasMap / hasTrailer
 * / etc) are immutable from admin — they live in
 * `constants/categories.ts` because they're tied to routes and
 * conditional component composition. See CLAUDE.md §48 for the
 * rationale.
 *
 * If the row doesn't exist yet (un-applied migration 041 seed, or a
 * new slug added to the code constant after seeding), we UPSERT so
 * the first edit creates the row.
 */
export async function PATCH(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  if (!VALID_SLUGS.has(slug as any)) {
    return NextResponse.json({ error: "Unknown category slug" }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (body.display_label_el !== undefined) {
    if (typeof body.display_label_el === "string" && body.display_label_el.trim() === "") {
      update.display_label_el = null;
    } else if (body.display_label_el === null) {
      update.display_label_el = null;
    } else if (typeof body.display_label_el === "string") {
      update.display_label_el = body.display_label_el.trim();
    } else {
      return NextResponse.json({ error: "display_label_el must be string or null" }, { status: 400 });
    }
  }
  if (body.icon !== undefined) {
    if (body.icon === null || (typeof body.icon === "string" && body.icon.trim() === "")) {
      update.icon = null;
    } else if (typeof body.icon === "string") {
      update.icon = body.icon.trim();
    } else {
      return NextResponse.json({ error: "icon must be string or null" }, { status: 400 });
    }
  }
  if (body.display_order !== undefined) {
    if (typeof body.display_order !== "number" || !Number.isFinite(body.display_order)) {
      return NextResponse.json({ error: "display_order must be a number" }, { status: 400 });
    }
    update.display_order = Math.round(body.display_order);
  }
  if (body.is_nav_published !== undefined) {
    if (typeof body.is_nav_published !== "boolean") {
      return NextResponse.json({ error: "is_nav_published must be boolean" }, { status: 400 });
    }
    update.is_nav_published = body.is_nav_published;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No editable fields supplied" }, { status: 400 });
  }

  update.modified_at = new Date().toISOString();

  const sb = createAdminClient();
  // UPSERT — handles the case where the migration's INSERT was skipped
  // (e.g. a slug added to CATEGORIES after the seed ran).
  // `category_meta` isn't in the generated Database types yet
  // (migration 041 is recent), so cast to `any` to skip the typed
  // builder.
  const { error } = await (sb.from("category_meta") as any)
    .upsert({ slug, ...update }, { onConflict: "slug" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateAfterCategoryEdit();
  return NextResponse.json({ ok: true });
}

/** Batch reorder — used by the admin UI when dragging rows. Body:
 *  `{ orders: { slug, display_order }[] }`. One write per row; small
 *  surface (9 categories max). */
export async function POST(req: NextRequest, _props: { params: Promise<{ slug: string }> }) {
  return NextResponse.json({ error: "Use POST /api/admin/categories/reorder" }, { status: 405 });
}
