import type { CategorySlug, Item, SubmissionAnalysis, SearchAnalysis } from "@/types";
import type { AIService } from "./index";

// Heuristic category detection from keywords. Cheap stand-in until real AI lands.
const CATEGORY_KEYWORDS: Array<[CategorySlug, RegExp]> = [
  ["movies",  /\bταινί|movie|film|cinema|σινε[μν]/i],
  ["series",  /\bσειρ|series|season|σεζόν|episode|επεισόδι/i],
  ["books",   /\bβιβλί|book|novel|μυθιστόρ|author|συγγραφέ/i],
  ["recipes", /\bσυνταγ|recipe|μαγείρε|cook/i],
  ["food",    /\bεστιατόρι|restaurant|φαγητό|δείπνο|γεύμα|τρώω|τρώμε/i],
  ["bars",    /\bbar|μπαρ|καφέ|cafe|coffee|cocktail|wine/i],
  ["hotels",  /\bξενοδοχ|hotel|διαμον|airbnb|stay/i],
  ["theater", /\bθέατρ|theater|theatre|παράσταση|σκηνή/i],
  ["events",  /\bsynaul|συναυλ|festival|έκθεση|event/i],
];

function detectCategory(text: string): CategorySlug {
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(text)) return cat;
  return "movies"; // sane default for the most common case
}

// Pull what looks like a title from the user's text. We grab the longest
// quoted phrase, or the first capitalised noun phrase, or fall back to the
// first 5 words. This is a stand-in — real AI will do better.
function extractTitle(text: string): string {
  const quoted = text.match(/["«„''']([^"»"'']{2,80})["»"'']/);
  if (quoted) return quoted[1].trim();

  // First sequence of 1–6 capitalized words (handles "Dune Part Two", "The Alchemist", etc.)
  const cap = text.match(/\b([A-ZΑ-ΩΆ-Ώ][\wΆ-Ώά-ώ'-]+(?:\s+[A-ZΑ-ΩΆ-ΩA-Za-z0-9'-]+){0,5})/);
  if (cap) return cap[1].trim();

  // Fallback: first 5 words, max 60 chars
  const words = text.trim().split(/\s+/).slice(0, 5).join(" ");
  return words.length > 60 ? words.slice(0, 60) : words;
}

export class MockAIService implements AIService {
  async analyzeSubmission(text: string): Promise<SubmissionAnalysis> {
    // Simulate incremental analysis delay
    await new Promise((r) => setTimeout(r, 600));

    if (text.length < 10) {
      return {
        matched: false,
        title: null,
        category: null,
        confidence: 0,
        progress: Math.min(text.length * 8, 40),
        message: "Συνέχισε να γράφεις...",
        matchData: null,
      };
    }

    const title = extractTitle(text);
    const category = detectCategory(text);
    // Confidence scales with description length (cheap proxy for "more detail = more sure")
    const confidence = Math.min(0.6 + text.length / 400, 0.97);

    return {
      matched: true,
      title,
      category,
      confidence,
      progress: 100,
      message: "Βρήκα αντιστοιχία!",
      matchData: { source: "mock", score: confidence, derived_title: title },
    };
  }

  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    await new Promise((r) => setTimeout(r, 400));

    return {
      intent: query,
      vibe: query.toLowerCase().includes("cozy") ? "cozy" : null,
      type: null,
      location: null,
      categories: ["movies", "series"],
      query,
    };
  }

  async scoreDescriptionQuality(_text: string): Promise<number> {
    return 0.85;
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // 1536-dim mock embedding (all zeros — fine for dev)
    return Array(1536).fill(0);
  }

  async rerankRecommendations(_userId: string, candidates: Item[]): Promise<Item[]> {
    return candidates;
  }
}
