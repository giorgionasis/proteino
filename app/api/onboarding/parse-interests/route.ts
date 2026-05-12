import { NextRequest, NextResponse } from "next/server";
import { getAIService } from "@/lib/ai";
import { CATEGORY_SLUGS } from "@/constants/categories";
import { stripDiacritics } from "@/lib/utils/textSearch";

/**
 * POST /api/onboarding/parse-interests
 *
 *   Body: { text: string }
 *   Resp: { categories: string[] }
 *
 * Parses a Greek/greeklish self-description into Proteino category
 * slugs. Tries Gemini first (via the AIService abstraction); falls
 * back to a deterministic keyword matcher when the AI is unavailable,
 * misconfigured, or returns null.
 *
 * Unauthenticated by design — no PII flows through this route. Cheap
 * enough to be public (single Gemini call, ~100 input tokens).
 */

// Needles are pre-folded (lowercased + diacritics stripped) so a single
// folded haystack comparison handles every Greek tonal variant + every
// English casing. Inputs like "Σινεμά", "σινεμα", "ΣΙΝΕΜΆ" all match
// "σινεμ".
const KEYWORD_MAP: Record<string, string[]> = {
  movies:   ["ταιν", "σινεμ", "movie", "film", "cinem"],
  series:   ["σειρ", "series", "show", "τηλεορ"],
  books:    ["βιβλ", "διαβαζ", "διαβασ", "αναγνωσ", "book", "novel", "λογοτεχ", "μυθιστορ", "συγγραφ"],
  food:     ["εστιατ", "ταβερν", "φαγητ", "φαι", "restaurant", "dinner", "δειπν", "food"],
  recipes:  ["μαγειρ", "συνταγ", "recipe", "cook", "ψησιμ", "κουζιν"],
  bars:     ["μπαρ", "ποτ", "καφε", "cafe", "café", "bar", "cocktail", "drink"],
  hotels:   ["ξενοδ", "διαμον", "hotel", "airbnb", "ταξιδ", "vacation", "διακοπ", "trip"],
  theater:  ["θεατρ", "παραστασ", "theater", "theatre", "drama"],
  events:   ["συναυλ", "concert", "festival", "εκδηλωσ", "live ", "gig"],
};

function fold(s: string): string {
  return stripDiacritics(s).toLowerCase();
}

function heuristicExtract(text: string): string[] {
  const folded = fold(text);
  const found: string[] = [];
  for (const [slug, needles] of Object.entries(KEYWORD_MAP)) {
    if (needles.some((n) => folded.includes(n))) found.push(slug);
  }
  return found;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 4) {
    return NextResponse.json({ categories: [] });
  }
  if (text.length > 500) {
    // Sanity bound. Onboarding free-text shouldn't be paragraphs.
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  let categories: string[] = [];

  const ai = getAIService();
  if (typeof ai.extractInterests === "function") {
    try {
      const out = await ai.extractInterests(text);
      if (Array.isArray(out)) {
        categories = out.filter((s) => (CATEGORY_SLUGS as readonly string[]).includes(s));
      }
    } catch (err) {
      console.error("[parse-interests] AI error:", err);
    }
  }

  // Heuristic fallback. Always run when AI returned empty — covers the
  // free-tier rate-limit case + the no-API-key dev environment.
  if (categories.length === 0) {
    categories = heuristicExtract(text);
  }

  return NextResponse.json({ categories });
}
