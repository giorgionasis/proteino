import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECIPE_UNIT_LABELS } from "@/lib/recipes/units";

/**
 * GET /api/recipes/options
 *
 * Returns the catalogue the user-facing recipe wizard renders in its
 * dropdowns. Same source as admin SuggestionEditor — extra_field_options
 * rows where category='recipes', grouped by field_group. When the table
 * is empty (fresh dev DB, migration 045 not yet applied) we fall back
 * to the canonical static catalogues in `lib/recipes/units.ts` so the
 * wizard never renders an empty dropdown.
 *
 * Public — no auth required. RLS already gates the table.
 *
 * Response:
 *  {
 *    units:              string[]   // ordered display labels (κ.σ., κ.γ., φλ., ...)
 *    common_ingredients: string[]   // αλεύρι, ζάχαρη, ...
 *    levels:             string[]   // Easy, Medium, Hard
 *  }
 */
export async function GET() {
  const sb = await createClient();

  const { data, error } = await sb
    .from("extra_field_options")
    .select("field_group, label, display_order")
    .eq("category", "recipes")
    .eq("is_published", true)
    .in("field_group", ["unit", "common_ingredient", "level"])
    .order("field_group")
    .order("display_order");

  if (error) {
    console.warn("[recipes/options]", error);
    return NextResponse.json(
      {
        units: RECIPE_UNIT_LABELS,
        common_ingredients: [],
        levels: ["Easy", "Medium", "Hard"],
      },
      { status: 200 },
    );
  }

  const grouped: Record<string, string[]> = {};
  for (const row of (data ?? []) as Array<{ field_group: string; label: string }>) {
    if (!grouped[row.field_group]) grouped[row.field_group] = [];
    grouped[row.field_group].push(row.label);
  }

  // Fall back to canonical static lists when a field_group is empty.
  return NextResponse.json({
    units:              grouped.unit?.length              ? grouped.unit              : RECIPE_UNIT_LABELS,
    common_ingredients: grouped.common_ingredient ?? [],
    levels:             grouped.level?.length             ? grouped.level             : ["Easy", "Medium", "Hard"],
  });
}
