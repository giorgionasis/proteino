/**
 * Canonical recipe-unit catalogue — single source of truth shared by
 * the admin SuggestionEditor's fallback list AND the user-facing recipe
 * wizard. The `extra_field_options` table (category="recipes",
 * field_group="unit") is seeded from this list via migration 045 and
 * remains the runtime source — admin can extend/edit via
 * /admin/extra-fields. When that table is empty (fresh dev DB, migration
 * not applied), consumers fall back to this list.
 *
 * Each entry:
 *  - `key`   stable identifier (only used internally if we ever need
 *            locale switching). The stored value in `ingredients[].unit`
 *            is the `label` string itself, not the key — matches the
 *            existing storage shape that admin already uses.
 *  - `label` Greek display label (often abbreviated — κ.σ. instead of
 *            κουταλιά της σούπας).
 *  - `full`  full spelled-out form for tooltips / accessibility.
 *  - `group` rough bucket so the dropdown can render section headers
 *            (Συνήθεις, Όγκος, Βάρος, Μετρήσεις, Ειδικά).
 */
export interface RecipeUnit {
  key: string;
  label: string;
  full: string;
  group: "common" | "volume" | "weight" | "count" | "special";
}

export const RECIPE_UNITS: RecipeUnit[] = [
  // ── Common kitchen measures (top of the dropdown) ─────────────
  { key: "tbsp",        label: "κ.σ.",          full: "κουταλιά της σούπας",  group: "common" },
  { key: "tsp",         label: "κ.γ.",          full: "κουταλιά του γλυκού",  group: "common" },
  { key: "cup",         label: "φλ.",           full: "φλιτζάνι",             group: "common" },
  { key: "cup_tea",     label: "φλ. τσαγιού",   full: "φλιτζάνι του τσαγιού", group: "common" },
  { key: "cup_coffee",  label: "φλ. καφέ",      full: "φλιτζάνι του καφέ",    group: "common" },

  // ── Volume ─────────────────────────────────────────────────────
  { key: "ml",          label: "ml",            full: "millilitres",          group: "volume" },
  { key: "l",           label: "λίτρο",         full: "λίτρα",                group: "volume" },

  // ── Weight ─────────────────────────────────────────────────────
  { key: "g",           label: "γρ.",           full: "γραμμάρια",            group: "weight" },
  { key: "kg",          label: "κιλό",          full: "κιλά",                 group: "weight" },

  // ── Count / portion ────────────────────────────────────────────
  { key: "pcs",         label: "τεμ.",          full: "τεμάχια",              group: "count" },
  { key: "slice",       label: "φέτες",         full: "φέτες",                group: "count" },
  { key: "clove",       label: "σκελ.",         full: "σκελίδες (σκόρδου)",   group: "count" },
  { key: "sprig",       label: "κλ.",           full: "κλωνάρι (μυρωδικών)",  group: "count" },
  { key: "bunch",       label: "ματσάκι",       full: "ματσάκι (μυρωδικών)",  group: "count" },
  { key: "head",        label: "κεφάλι",        full: "κεφάλι (μαρούλι κλπ)", group: "count" },

  // ── Specials ───────────────────────────────────────────────────
  { key: "pinch",       label: "τσιμπιά",       full: "τσιμπιά",              group: "special" },
  { key: "drop",        label: "σταγόνα",       full: "σταγόνες",             group: "special" },
  { key: "handful",     label: "χούφτα",        full: "χούφτα",               group: "special" },
  { key: "to_taste",    label: "κατά βούληση",  full: "όσο χρειάζεται / κατά βούληση", group: "special" },
];

/** Just the labels, in display order. Used as fallback when
 *  `extra_field_options.recipes.unit` is empty + as the seed for
 *  migration 045. */
export const RECIPE_UNIT_LABELS: string[] = RECIPE_UNITS.map((u) => u.label);

/** Group-by helper for rendering the dropdown with section headers. */
export const RECIPE_UNITS_BY_GROUP: Record<RecipeUnit["group"], RecipeUnit[]> = {
  common:  RECIPE_UNITS.filter((u) => u.group === "common"),
  volume:  RECIPE_UNITS.filter((u) => u.group === "volume"),
  weight:  RECIPE_UNITS.filter((u) => u.group === "weight"),
  count:   RECIPE_UNITS.filter((u) => u.group === "count"),
  special: RECIPE_UNITS.filter((u) => u.group === "special"),
};

export const RECIPE_UNIT_GROUP_LABELS: Record<RecipeUnit["group"], string> = {
  common:  "Συνήθεις",
  volume:  "Όγκος",
  weight:  "Βάρος",
  count:   "Μέτρηση",
  special: "Ειδικά",
};

/** Resolve a stored label back to its full spelled-out form, used in
 *  tooltips/accessibility. Returns null when the label isn't in the
 *  catalogue (e.g. admin added a custom one to extra_field_options). */
export function expandUnitLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const trimmed = label.trim();
  const hit = RECIPE_UNITS.find((u) => u.label === trimmed);
  return hit?.full ?? null;
}
