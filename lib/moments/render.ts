import { bookmarkLabels } from "@/lib/bookmarks/labels";
import type { MomentContext } from "./types";

/**
 * Template renderer.
 *
 * Interpolates `{key}` placeholders in copy templates against
 * `ctx.vars`. Unknown placeholders are left in place so admins see
 * what's missing rather than silently empty strings. Markdown is left
 * untouched — the client adapter parses `**...**` as <strong> at render
 * time.
 *
 * Supported placeholders (resolved before render is called):
 *   {count}, {target}, {remaining}, {ordinal}
 *   {category}, {category_noun}, {category_list_noun}, {category_article}
 *   {handle}, {first_name}
 *   …plus anything the caller stuffs into ctx.vars
 */

export function renderTemplate(
  template: string,
  ctx: MomentContext,
): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const v = ctx.vars[key];
    if (v === undefined || v === null) return match;
    return String(v);
  });
}

/** Plural-genitive list nouns ("στις ταινίες σου", "στα βιβλία σου").
 *  Mirrors the listLabel function previously inline in
 *  BookmarkSavedModal — single source of truth here. */
const CATEGORY_LIST_NOUN: Record<string, string> = {
  movies:  "ταινίες",
  series:  "σειρές",
  books:   "βιβλία",
  food:    "εστιατόρια",
  bars:    "bars",
  hotels:  "ξενοδοχεία",
  theater: "παραστάσεις",
  events:  "εκδηλώσεις",
  recipes: "συνταγές",
};

/** Greek tier ordinals matching badge tiers (Verified→1st, Gold→2nd, …). */
const TIER_ORDINAL: Record<string, string> = {
  verified: "πρώτο",
  gold:     "δεύτερό",
  expert:   "τρίτο",
  platinum: "τέταρτο",
};

/**
 * Build the `vars` map for a given event payload + user. Centralises
 * the boring "how do I derive the category noun" logic so callers
 * don't have to remember.
 *
 * Caller can pass extra keys via `extraVars` — they take precedence
 * over the derived defaults (useful for one-off placeholders).
 */
export function buildVars(args: {
  user:     { display_name?: string | null; handle?: string | null };
  category?: string | null;
  count?:    number | null;
  target?:   number | null;
  badge?:    string | null;
  extra?:    Record<string, string | number>;
}): Record<string, string | number> {
  const { user, category, count, target, badge, extra } = args;

  const vars: Record<string, string | number> = {};

  if (typeof count === "number") {
    vars.count = count;
    if (typeof target === "number") {
      vars.target    = target;
      vars.remaining = Math.max(0, target - count);
    }
  } else if (typeof target === "number") {
    vars.target = target;
  }

  if (badge && TIER_ORDINAL[badge]) {
    vars.ordinal = TIER_ORDINAL[badge];
  }

  if (category) {
    vars.category           = category;
    const labels            = bookmarkLabels(category);
    vars.category_noun      = labels.noun;
    vars.category_article   = labels.article;
    vars.category_list_noun = CATEGORY_LIST_NOUN[category] ?? labels.noun;
  }

  if (user.handle)       vars.handle     = user.handle;
  if (user.display_name) vars.first_name = user.display_name.split(/\s+/)[0] ?? "";

  if (extra) {
    for (const [k, v] of Object.entries(extra)) vars[k] = v;
  }

  return vars;
}
