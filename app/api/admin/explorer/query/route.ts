import { requireAdmin } from "@/lib/admin/require-admin";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runExplorerQuery,
  VALID_CATEGORIES,
  type ExplorerQueryInput,
} from "@/lib/admin/explorer-query";
import type { CategorySlug } from "@/types";

/**
 * POST /api/admin/explorer/query
 *
 * Body: { category, filters, adminFacets, minRating?, sample? }
 *
 * Thin wrapper over `runExplorerQuery` (lib/admin/explorer-query). The
 * heavy lifting — match items, compute distincts, sample — lives in
 * the lib so the server page (`app/admin/content/filters/page.tsx`)
 * can also pre-run the empty-selection query to eliminate the
 * count-card flicker on first paint.
 *
 * See lib comment for the matching contract and helpers.
 */

interface ExplorerRequestBody {
  category?:    unknown;
  filters?:     unknown;
  adminFacets?: unknown;
  minRating?:   unknown;
  sample?:      "rating" | "popular" | "newest";
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  let body: ExplorerRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const category = body.category as CategorySlug;
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const filtersRaw = (body.filters ?? {}) as Record<string, unknown>;
  const filters: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(filtersRaw)) {
    if (typeof v === "string") filters[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) filters[k] = v as string[];
  }

  const adminFacetsRaw = (body.adminFacets ?? {}) as Record<string, unknown>;
  const adminFacets: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(adminFacetsRaw)) {
    if (typeof v === "string") adminFacets[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "string")) adminFacets[k] = v as string[];
  }

  const minRating = typeof body.minRating === "number" && body.minRating > 0 ? body.minRating : null;

  const input: ExplorerQueryInput = { category, filters, adminFacets, minRating, sample: body.sample };

  const sb = createAdminClient();
  try {
    const result = await runExplorerQuery(sb, input);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
