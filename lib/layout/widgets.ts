/**
 * Layout widget registry — metadata only.
 *
 * Every widget the admin can place in a layout is registered here with
 * its label, compatibility rules, and (optional) admin config form
 * schema. Render functions live in each page shell (CategoryPageShell,
 * HomePage) because they need React component imports and closure over
 * shell-local state (activeTab, filterValues, etc.).
 *
 * Adding a new widget:
 *   1. Add an entry to WIDGET_REGISTRY below
 *   2. Add the render bridge case in the page shell's renderWidget()
 *   3. (Optional) Insert a seed row in a follow-up migration if you
 *      want every existing page to inherit the new widget by default
 */

import type { WidgetSpec } from "./types";

/* ─── Static carousel "source" presets ─────────────────────────────────
 *  Curated alternatives that don't require an admin to create a full
 *  Collection. Wired in the resolver / page-shell bridge.            */

export const STATIC_CAROUSEL_SOURCES = [
  { value: "top_rated",       label: "Top rated" },
  { value: "newest",          label: "Νεότερα" },
  { value: "most_bookmarked", label: "Πιο αποθηκευμένα" },
  { value: "most_reviewed",   label: "Πιο σχολιασμένα" },
] as const;

export type StaticCarouselSource = (typeof STATIC_CAROUSEL_SOURCES)[number]["value"];

/* ─── Registry ─────────────────────────────────────────────────────── */

export const WIDGET_REGISTRY: Record<string, WidgetSpec> = {
  /* ── Category-page chrome (fixed structural) ── */

  welcome_header: {
    key: "welcome_header",
    label: "Hero καλωσορίσματος",
    description: "Sticky header με τον αριθμό προτάσεων + κατηγορία.",
    icon: "👋",
    contexts: ["category"],
    fixed: true,
    singleton: true,
  },

  sub_category_tabs: {
    key: "sub_category_tabs",
    label: "Tabs υπο-κατηγορίας",
    description: "Sticky tabs με τις πιο δημοφιλείς υπο-κατηγορίες.",
    icon: "🗂",
    contexts: ["category"],
    fixed: true,
    singleton: true,
  },

  filter_row: {
    key: "filter_row",
    label: "Φίλτρα",
    description: "Φίλτρα · Κοντά μου · ενεργά chips.",
    icon: "⚙",
    contexts: ["category"],
    fixed: true,
    singleton: true,
  },

  items_list: {
    key: "items_list",
    label: "Λίστα αποτελεσμάτων",
    description: "Η κύρια λίστα των items της κατηγορίας με Load more.",
    icon: "📋",
    contexts: ["category"],
    fixed: true,
    singleton: true,
  },

  /* ── Category-page content (movable + deletable) ── */

  movies_tonight: {
    key: "movies_tonight",
    label: "Απόψε στην TV",
    description: "Λίστα ταινιών που παίζουν σήμερα. Εμφανίζεται μόνο όταν υπάρχει πρόγραμμα.",
    icon: "📺",
    contexts: ["home", "category"],
    categories: ["movies"],
    singleton: true,
  },

  open_map_button: {
    key: "open_map_button",
    label: "Άνοιγμα χάρτη",
    description: "Coral pill που εναλλάσσει λίστα ↔ χάρτη.",
    icon: "🗺",
    contexts: ["category"],
    categories: ["food", "bars", "hotels", "theater", "events"],
    singleton: true,
  },

  static_carousel: {
    key: "static_carousel",
    label: "Carousel (auto)",
    description: "Carousel με αυτόματη πηγή (top-rated, νεότερα, …). Μπορείς να βάλεις πολλά σε ένα page.",
    icon: "🎞",
    contexts: ["home", "category"],
    configSchema: [
      { kind: "text",   key: "title",  label: "Τίτλος",        placeholder: "π.χ. Δημοφιλή Μαγαζιά", required: true },
      { kind: "select", key: "source", label: "Πηγή",
        options: STATIC_CAROUSEL_SOURCES.map((s) => ({ value: s.value, label: s.label })),
        defaultValue: "top_rated" },
      { kind: "category", key: "category", label: "Κατηγορία (override)" },
      { kind: "number", key: "offset", label: "Offset", min: 0, defaultValue: 0 },
      { kind: "number", key: "limit",  label: "Limit",  min: 1, max: 20, defaultValue: 6 },
    ],
  },

  category_top_users: {
    key: "category_top_users",
    label: "Top contributors της κατηγορίας",
    description: "Κορυφαίος + 4 ακόμη contributors για την κατηγορία.",
    icon: "🏆",
    contexts: ["category"],
    singleton: true,
  },

  suggest_box: {
    key: "suggest_box",
    label: "CTA — Πρότεινε κάτι",
    description: "\"Δεν βρίσκεις αυτό που ψάχνεις;\" CTA.",
    icon: "✏",
    contexts: ["category"],
    singleton: true,
  },

  /* ── Home — guest stack ── */

  hero_discover: {
    key: "hero_discover",
    label: "Hero — Ανακάλυψε",
    description: "Guest hero με tiles των κατηγοριών.",
    icon: "🔍",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  hero_suggest: {
    key: "hero_suggest",
    label: "Hero — Πρότεινε",
    description: "Guest hero με testimonial style.",
    icon: "✨",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  hero_personalise: {
    key: "hero_personalise",
    label: "Hero — Personalise",
    description: "Guest hero με coral blur + chips.",
    icon: "🎯",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  category_tiles: {
    key: "category_tiles",
    label: "Πλέγμα κατηγοριών",
    description: "Guest 3×3 grid με τις 9 κατηγορίες.",
    icon: "🧩",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  suggestion_feed: {
    key: "suggestion_feed",
    label: "Feed προτάσεων (guest)",
    description: "Guest feed με category tabs.",
    icon: "📰",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  how_it_works: {
    key: "how_it_works",
    label: "How it works",
    description: "4-step onboarding section.",
    icon: "📖",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  register_promo: {
    key: "register_promo",
    label: "Promo εγγραφής",
    description: "CTA banner για εγγραφή.",
    icon: "🚀",
    contexts: ["home"],
    audiences: ["guest"],
    singleton: true,
  },

  /* ── Home — registered stack ── */

  greeting: {
    key: "greeting",
    label: "Greeting",
    description: "👋 Γεια σου, {name}.",
    icon: "👋",
    contexts: ["home"],
    audiences: ["registered"],
    singleton: true,
  },

  ai_chips: {
    key: "ai_chips",
    label: "AI category chips",
    description: "2×2 chips με τις κατηγορίες με τις περισσότερες προτάσεις.",
    icon: "🤖",
    contexts: ["home"],
    audiences: ["registered"],
    singleton: true,
  },

  suggested_users: {
    key: "suggested_users",
    label: "Προτεινόμενοι χρήστες",
    description: "Top contributors της πλατφόρμας.",
    icon: "👥",
    contexts: ["home"],
    audiences: ["registered"],
    singleton: true,
  },

  contribution_cta: {
    key: "contribution_cta",
    label: "CTA — Συνέισφερε",
    description: "Personalised CTA να προτείνει κάτι.",
    icon: "💡",
    contexts: ["home"],
    audiences: ["registered"],
    singleton: true,
  },

  /* ── Shared (any context, any audience) ── */

  support_section: {
    key: "support_section",
    label: "Υποστήριξη",
    description: "Footer-area κάρτα με support links.",
    icon: "🛟",
    contexts: ["home", "category"],
    singleton: true,
  },

  footer_mobile: {
    key: "footer_mobile",
    label: "Footer",
    description: "Mobile footer με credits και links.",
    icon: "🦶",
    contexts: ["home", "category"],
    fixed: true,
    singleton: true,
  },
};

/* ─── Lookup helpers ───────────────────────────────────────────────── */

export function getWidget(key: string): WidgetSpec | undefined {
  return WIDGET_REGISTRY[key];
}

/**
 * Widgets compatible with the given (context, category, audience).
 * Used by the admin section-picker modal to filter the available list.
 */
export function compatibleWidgets(
  context: "home" | "category" | "suggestions",
  category: string | null,
  audience: "all" | "registered" | "guest",
): WidgetSpec[] {
  return Object.values(WIDGET_REGISTRY).filter((w) => {
    if (!w.contexts.includes(context)) return false;
    if (category && w.categories && !w.categories.includes(category as never)) return false;
    if (w.audiences && !w.audiences.includes(audience)) {
      // Allow 'all' selections to see widgets that target a specific audience —
      // 'all' is a superset, so showing the widget is correct (the admin can
      // later flip the row's audience to match the widget's allowed set).
      if (audience !== "all") return false;
    }
    return true;
  });
}

/**
 * Subset of widgets that can be deleted from a page. Fixed widgets
 * (filter_row, items_list, footer_mobile, welcome_header, sub_category_tabs)
 * can be reordered or marked inactive but never removed from the DB.
 */
export function isWidgetFixed(key: string): boolean {
  return WIDGET_REGISTRY[key]?.fixed === true;
}

export function isWidgetSingleton(key: string): boolean {
  return WIDGET_REGISTRY[key]?.singleton === true;
}
