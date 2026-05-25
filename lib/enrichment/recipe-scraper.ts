/**
 * Recipe scraper — hands the user-facing wizard structured data when
 * they paste a URL from a known recipe site.
 *
 * Strategy:
 *   1. Schema.org Recipe JSON-LD extractor (covers ~60% of recipe
 *      sites for free — most modern Greek + international sites emit
 *      it as part of SEO best practice).
 *   2. Per-site adapter dispatcher for hosts that don't emit JSON-LD
 *      or use a non-standard shape. Add new adapters as we observe
 *      they're needed.
 *   3. Fail soft — when nothing extracts cleanly, return null so the
 *      UI falls back to "start manually" without erroring out.
 *
 * NOT designed to evade anti-bot measures. We respect robots.txt
 * implicitly by using a normal user-agent + low request volume.
 */

import { RECIPE_UNIT_LABELS } from "@/lib/recipes/units";

export interface ScrapedRecipe {
  source_url: string;
  title:       string;
  description: string | null;
  cover_url:   string | null;
  ingredients: Array<{ qty: string; unit: string; name: string }>;
  steps:       string[];
  yields:      number | null;
  prep_min:    number | null;
  cook_min:    number | null;
  /** Adapter that produced this — useful for debugging which path
   *  worked. "jsonld" = schema.org JSON-LD; otherwise host name. */
  via: string;
}

const FETCH_TIMEOUT_MS = 8000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; ProteinoBot/1.0; +https://proteino.gr) AppleWebKit/537.36";

/** Find the first http(s) URL in arbitrary text. Returns null when
 *  the text doesn't contain a parseable URL. */
export function detectRecipeUrl(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\bhttps?:\/\/[^\s<>"']+/i);
  if (!m) return null;
  // Trim trailing punctuation that's almost certainly not part of the URL.
  return m[0].replace(/[.,;:!?'"\)]+$/, "");
}

/** Main entry point — fetches the page, runs the JSON-LD extractor,
 *  optionally hands off to a host-specific adapter, returns a
 *  ScrapedRecipe or null on failure. */
export async function scrapeRecipe(url: string): Promise<ScrapedRecipe | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const html = await fetchHtml(url);
  if (!html) return null;

  // Try Schema.org JSON-LD first — covers most modern recipe sites
  // including (last we checked) akispetretzikis.com,
  // argiro.gr, pentanostimo.gr.
  const fromLd = extractRecipeFromJsonLd(html);
  if (fromLd) {
    return { ...fromLd, source_url: url, via: "jsonld" };
  }

  // Per-host adapter slot. Add cases as we discover sites that don't
  // emit Recipe JSON-LD cleanly.
  // const host = parsed.host.replace(/^www\./, "");
  // switch (host) { case "...": return scrapeXxx(html, url); }

  return null;
}

// ─────────────────────────────────────────────────────────────────
// Fetch + HTML helpers
// ─────────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        "accept-language": "el-GR,el;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`[recipe-scraper] fetch ${url} → ${res.status}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      console.warn(`[recipe-scraper] fetch ${url} non-html content-type: ${ct}`);
      return null;
    }
    return await res.text();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn(`[recipe-scraper] fetch ${url} timed out after ${FETCH_TIMEOUT_MS}ms`);
    } else {
      console.warn(`[recipe-scraper] fetch ${url} error:`, err?.message ?? err);
    }
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────────────────────────────
// Schema.org JSON-LD extractor
// ─────────────────────────────────────────────────────────────────

/** Pull all <script type="application/ld+json"> blocks out of an
 *  HTML string. Returns the parsed JSON for each block — silently
 *  skips blocks that don't parse. */
function extractLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  // Non-greedy match between opening + closing tag. Case-insensitive
  // attribute order doesn't matter because we anchor on the type=
  // attribute presence. Strip CDATA wrappers some CMSes still emit.
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
    if (!raw) continue;
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Ignore — some CMSes ship broken JSON-LD; we just skip.
    }
  }
  return out;
}

/** Walk a JSON-LD blob and find the first Recipe node. Handles three
 *  common shapes: a bare Recipe at the top, an array of nodes, or a
 *  @graph wrapper (common with Yoast / Rank Math). */
function findRecipeNode(blob: unknown): Record<string, unknown> | null {
  if (!blob || typeof blob !== "object") return null;
  const visit = (node: any): Record<string, unknown> | null => {
    if (!node || typeof node !== "object") return null;
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Recipe")) return node;
    if (Array.isArray(node)) {
      for (const it of node) {
        const hit = visit(it);
        if (hit) return hit;
      }
    }
    if (Array.isArray(node["@graph"])) {
      for (const it of node["@graph"]) {
        const hit = visit(it);
        if (hit) return hit;
      }
    }
    return null;
  };
  return visit(blob);
}

function extractRecipeFromJsonLd(html: string): Omit<ScrapedRecipe, "source_url" | "via"> | null {
  const blocks = extractLdBlocks(html);
  for (const blob of blocks) {
    const recipe = findRecipeNode(blob);
    if (!recipe) continue;
    return mapRecipeNode(recipe);
  }
  return null;
}

function mapRecipeNode(r: Record<string, unknown>): Omit<ScrapedRecipe, "source_url" | "via"> | null {
  const title = pickString(r.name);
  if (!title) return null;

  return {
    title,
    description: pickString(r.description ?? r.summary) ?? null,
    cover_url:   pickImage(r.image),
    ingredients: pickIngredients(r.recipeIngredient ?? r.ingredients),
    steps:       pickSteps(r.recipeInstructions ?? r.instructions),
    yields:      pickYield(r.recipeYield ?? r.yield),
    prep_min:    pickIso8601Minutes(r.prepTime),
    cook_min:    pickIso8601Minutes(r.cookTime),
  };
}

// ─────────────────────────────────────────────────────────────────
// Field mappers
// ─────────────────────────────────────────────────────────────────

function pickString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v) && v.length > 0) return pickString(v[0]);
  if (v && typeof v === "object") {
    const text = (v as any).text ?? (v as any)["@value"];
    if (typeof text === "string") return text.trim() || null;
  }
  return null;
}

function pickImage(v: unknown): string | null {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v) && v.length > 0) return pickImage(v[0]);
  if (v && typeof v === "object") {
    const url = (v as any).url ?? (v as any)["@id"];
    if (typeof url === "string") return url.trim();
  }
  return null;
}

/** Parse one ingredient line ("1 1/2 κούπες αλεύρι") into
 *  {qty, unit, name}. Recognises:
 *   - whole numbers + decimals + fractions ("1", "0.5", "1/2",
 *     "1 1/2", "½", "1½")
 *   - unit abbreviations from RECIPE_UNIT_LABELS plus a few common
 *     long-forms we map back (γραμμάρια → γρ.)
 *   - everything after the unit (or after the qty if no unit) is
 *     the ingredient name. Trailing notes after commas are kept.
 *
 *  Falls back to {qty: "", unit: "", name: line} so weird lines
 *  still round-trip into the wizard for the user to clean up. */
const VULGAR_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3",
  "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6",
  "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

const UNIT_NORMALISATIONS: Record<string, string> = {
  // Greek long forms → canonical abbreviation
  "γραμμάρια":     "γρ.",
  "γραμμάριο":     "γρ.",
  "γραμμαρια":     "γρ.",
  "γρ":            "γρ.",
  "κιλά":          "κιλό",
  "κιλα":          "κιλό",
  "λίτρα":         "λίτρο",
  "λιτρα":         "λίτρο",
  "λίτρo":         "λίτρο",
  "κούπα":         "φλ.",
  "κούπες":        "φλ.",
  "φλιτζάνι":      "φλ.",
  "φλιτζάνια":     "φλ.",
  "κουταλιά της σούπας":   "κ.σ.",
  "κουταλιές της σούπας":  "κ.σ.",
  "κουταλιά του γλυκού":   "κ.γ.",
  "κουταλιές του γλυκού":  "κ.γ.",
  "κουτ. σούπας":          "κ.σ.",
  "κουτ. γλυκού":          "κ.γ.",
  "σκελίδα":               "σκελ.",
  "σκελίδες":              "σκελ.",
  "κλωνάρι":               "κλ.",
  "κλωνάρια":              "κλ.",
  "τεμάχιο":               "τεμ.",
  "τεμάχια":               "τεμ.",
  // International long forms → canonical
  "tablespoon":   "κ.σ.",
  "tablespoons":  "κ.σ.",
  "teaspoon":     "κ.γ.",
  "teaspoons":    "κ.γ.",
  "grams":        "γρ.",
  "gram":         "γρ.",
  "kilograms":    "κιλό",
  "kilogram":     "κιλό",
  "millilitres":  "ml",
  "milliliters":  "ml",
  "liter":        "λίτρο",
  "litre":        "λίτρο",
  "liters":       "λίτρο",
  "litres":       "λίτρο",
  "cups":         "φλ.",
  "pieces":       "τεμ.",
  "piece":        "τεμ.",
  "pinch":        "τσιμπιά",
};

function parseIngredientLine(line: string): { qty: string; unit: string; name: string } {
  if (!line) return { qty: "", unit: "", name: "" };
  let s = line.trim();
  if (!s) return { qty: "", unit: "", name: "" };

  // Replace vulgar fractions with ASCII variants.
  for (const [glyph, ascii] of Object.entries(VULGAR_FRACTIONS)) {
    s = s.replace(new RegExp(glyph, "g"), ` ${ascii}`);
  }
  s = s.replace(/\s+/g, " ").trim();

  // Match leading qty: "1", "0.5", "1/2", "1 1/2"
  const qtyRe = /^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s+(.*)$/;
  const qtyMatch = s.match(qtyRe);
  let qty = "";
  let rest = s;
  if (qtyMatch) {
    qty = qtyMatch[1].replace(",", ".").trim();
    rest = qtyMatch[2].trim();
  }

  // Try multi-word unit phrases first (sorted longest-first so
  // "κουταλιά της σούπας" beats "κουταλιά"). Anchored at the start
  // of `rest`; case-insensitive.
  const unitKeys = Object.keys(UNIT_NORMALISATIONS).sort((a, b) => b.length - a.length);
  const lowered = rest.toLowerCase();
  let unit = "";
  for (const key of unitKeys) {
    if (lowered.startsWith(key.toLowerCase() + " ") || lowered === key.toLowerCase()) {
      unit = UNIT_NORMALISATIONS[key];
      rest = rest.slice(key.length).trim();
      break;
    }
  }
  // Then try canonical single-word labels.
  if (!unit) {
    for (const label of RECIPE_UNIT_LABELS) {
      if (
        lowered.startsWith(label.toLowerCase() + " ") ||
        lowered === label.toLowerCase()
      ) {
        unit = label;
        rest = rest.slice(label.length).trim();
        break;
      }
    }
  }

  return { qty, unit, name: rest };
}

function pickIngredients(v: unknown): Array<{ qty: string; unit: string; name: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((entry) => {
      const text = typeof entry === "string" ? entry : pickString(entry);
      if (!text) return null;
      return parseIngredientLine(text);
    })
    .filter((x): x is { qty: string; unit: string; name: string } => x !== null && !!x.name);
}

function pickSteps(v: unknown): string[] {
  if (!v) return [];

  // String-only path — some sites emit the whole instructions block
  // as one giant string with line breaks. Split on numbered list
  // markers + newlines.
  if (typeof v === "string") {
    return v
      .split(/(?:\r?\n|\d+[\.\)]\s*)/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(v)) {
    // Single HowToStep object
    const txt = pickString((v as any).text ?? v);
    return txt ? [txt] : [];
  }

  const out: string[] = [];
  for (const entry of v) {
    if (typeof entry === "string") {
      out.push(entry.trim());
      continue;
    }
    if (!entry || typeof entry !== "object") continue;
    const type = (entry as any)["@type"];
    // HowToSection wraps multiple HowToSteps under itemListElement.
    if (type === "HowToSection" && Array.isArray((entry as any).itemListElement)) {
      for (const sub of (entry as any).itemListElement) {
        const t = pickString(sub.text ?? sub.name ?? sub);
        if (t) out.push(t);
      }
      continue;
    }
    const t = pickString((entry as any).text ?? (entry as any).name ?? entry);
    if (t) out.push(t);
  }
  return out.filter(Boolean);
}

/** Parse Schema.org yield. Accepts numbers, "4", "4 servings",
 *  "Μερίδες: 4", "4 άτομα" — returns the first integer found. */
function pickYield(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = pickString(v);
  if (!s) return null;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Parse ISO-8601 durations (PT15M, PT1H30M, PT2H). Returns total
 *  minutes. Returns null for missing or unparseable values. */
function pickIso8601Minutes(v: unknown): number | null {
  const s = pickString(v);
  if (!s) return null;
  const m = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) {
    // Some sites emit plain "30 min" — last-ditch numeric extraction.
    const n = s.match(/\d+/);
    return n ? parseInt(n[0], 10) : null;
  }
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = m[2] ? parseInt(m[2], 10) : 0;
  return h * 60 + min || null;
}
