import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import type { Item, SubmissionAnalysis, SearchAnalysis, CategorySlug } from "@/types";
import type { AIService } from "./index";
import { assessQuality } from "./quality";

/**
 * Gemini-backed AIService.
 *
 * Uses Gemini 2.5 Flash for the latency-sensitive, structured-extraction
 * tasks (search intent, submission match). Falls back to the existing
 * server endpoints when the model errors out so the user-facing flow
 * never degrades to a hard error.
 *
 * Model selection:
 *   - 2.5 Flash for everything except embeddings — cheap, ~500ms, free
 *     tier covers all dev usage
 *   - text-embedding-004 for vectors (when we wire pgvector in Phase B)
 */
const MODEL_FLASH = "gemini-2.5-flash";
const MODEL_EMBEDDING = "text-embedding-004";

const VALID_CATEGORIES: CategorySlug[] = [
  "movies", "series", "books", "food", "recipes", "bars", "hotels", "theater", "events",
];

const SEARCH_PROMPT = `Είσαι assistant για το Proteino, μια ελληνική πλατφόρμα προτάσεων. Ο χρήστης γράφει ένα query σε ελληνικά (ή greeklish).

Εξάγαγε δομημένη πρόθεση από το query. Επέστρεψε ΜΟΝΟ JSON με αυτή τη μορφή:

{
  "intent": "<original query>",
  "categories": [<one or more from: movies, series, books, food, recipes, bars, hotels, theater, events>],
  "vibe": "<short vibe descriptor or null>",
  "type": "<sub-type like 'cocktail-bar', 'sushi', 'comedy' or null>",
  "location": "<Greek place name as it appears, or null>"
}

Κανόνες:
- Αν το query είναι αμφίσημο, βάλε πολλαπλές categories
- Greeklish like "kalifeisi" → "Καλλιθέα", normalize στα ελληνικά
- "νολαν" / "nolan" / "scorsese" → category: ["movies"]
- "κοντά μου" → location: null (δεν είναι περιοχή)
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown.`;

const SUBMISSION_PROMPT = `Είσαι assistant για το Proteino. Ο χρήστης περιγράφει κάτι που του άρεσε σε ελληνικά. Εξάγαγε δομημένα στοιχεία από το κείμενό του.

Επέστρεψε ΜΟΝΟ JSON:

{
  "title": "<τίτλος αν αναγνωρίζεται, αλλιώς null>",
  "category": "<one of: movies, series, books, food, recipes, bars, hotels, theater, events, ή null αν άγνωστο>",
  "confidence": <0-100>,
  "year_hint": <number ή null>,
  "actor_hint": "<όνομα ηθοποιού/συγγραφέα/καλλιτέχνη ή null>",
  "director_hint": "<όνομα σκηνοθέτη/συγγραφέα ή null>",
  "mood": "<short emotional descriptor ή null>"
}

Κανόνες:
- Αν ο χρήστης λέει "είδα το X" / "διάβασα το Y" / "πήγα στο Z" → προσπάθησε να εντοπίσεις τον τίτλο
- Greeklish + ελληνικά mixed: normalize στα ελληνικά
- confidence 0-30: άγνωστο/ασαφές, 30-70: πιθανός match, 70-100: σχεδόν σίγουρο
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown.`;

interface GeminiSearchExtraction {
  intent: string;
  categories: string[];
  vibe: string | null;
  type: string | null;
  location: string | null;
}

interface GeminiSubmissionExtraction {
  title: string | null;
  category: string | null;
  confidence: number;
  year_hint: number | null;
  actor_hint: string | null;
  director_hint: string | null;
  mood: string | null;
}

const GEN_CONFIG: GenerationConfig = {
  temperature: 0.2,        // factual extraction, low creativity
  topP: 0.95,
  responseMimeType: "application/json",
};

export class GeminiAIService implements AIService {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    if (!query || query.trim().length < 2) {
      return { intent: query, vibe: null, type: null, location: null, categories: [], query };
    }

    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: SEARCH_PROMPT,
        generationConfig: GEN_CONFIG,
      });
      const res = await model.generateContent(query);
      const text = res.response.text();
      const parsed = JSON.parse(text) as GeminiSearchExtraction;

      const categories = (parsed.categories ?? [])
        .filter((c): c is CategorySlug => VALID_CATEGORIES.includes(c as CategorySlug));

      return {
        intent: parsed.intent ?? query,
        vibe: parsed.vibe ?? null,
        type: parsed.type ?? null,
        location: parsed.location ?? null,
        categories,
        query,
      };
    } catch (err) {
      console.error("[gemini.analyzeSearchQuery]", err);
      // Graceful degradation: return passthrough so the regex-based
      // fallback in /api/search still produces results.
      return { intent: query, vibe: null, type: null, location: null, categories: [], query };
    }
  }

  async analyzeSubmission(text: string): Promise<SubmissionAnalysis> {
    const quality = assessQuality(text);

    if (text.trim().length < 10) {
      return {
        matched: false,
        title: null,
        category: null,
        confidence: 0,
        progress: Math.min(text.length * 8, 40),
        message: quality.tip ?? "Συνέχισε να γράφεις...",
        matchData: null,
        quality,
      };
    }

    let extraction: GeminiSubmissionExtraction | null = null;
    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: SUBMISSION_PROMPT,
        generationConfig: GEN_CONFIG,
      });
      const res = await model.generateContent(text);
      extraction = JSON.parse(res.response.text()) as GeminiSubmissionExtraction;
    } catch (err) {
      console.error("[gemini.analyzeSubmission]", err);
    }

    // Hand off to /api/ai/match for the actual TMDB / Books / Places
    // confirmation step. Gemini's role is to extract a clean title +
    // category hint; the existing match endpoint does the canonical
    // lookup. Pass extracted hints via query params so the endpoint
    // can prefer them over raw-text heuristics.
    try {
      const url = new URL("/api/ai/match", window.location.origin);
      url.searchParams.set("text", text);
      if (extraction?.title) url.searchParams.set("title_hint", extraction.title);
      if (extraction?.category) url.searchParams.set("category_hint", extraction.category);
      if (extraction?.year_hint) url.searchParams.set("year_hint", String(extraction.year_hint));

      const res = await fetch(url.toString());
      if (res.ok) {
        const j = (await res.json()) as SubmissionAnalysis;
        return { ...j, quality };
      }
    } catch {
      /* fall through */
    }

    // Match endpoint unreachable: surface what Gemini gave us, don't
    // pretend to have a confirmed match.
    return {
      matched: false,
      title: extraction?.title ?? null,
      category: (extraction?.category as CategorySlug | undefined) ?? null,
      confidence: extraction?.confidence ?? 0,
      progress: 60,
      message: extraction?.title
        ? `Νομίζω είναι ${extraction.title}. Κάνε confirm για να συνεχίσουμε.`
        : "Δεν μπορώ να συνδεθώ με την υπηρεσία αναζήτησης.",
      matchData: extraction ? { gemini_extraction: extraction } : null,
      quality,
    };
  }

  async scoreDescriptionQuality(text: string): Promise<number> {
    // Quality coach stays local — fast, doesn't need an LLM round-trip
    // for length / sentence-count heuristics. Migrate to Gemini later
    // if we want semantic feedback ("πες ποια σκηνή σε άγγιξε").
    return assessQuality(text).score / 100;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.client.getGenerativeModel({ model: MODEL_EMBEDDING });
      const res = await model.embedContent(text);
      return res.embedding.values;
    } catch (err) {
      console.error("[gemini.generateEmbedding]", err);
      return [];
    }
  }

  async rerankRecommendations(_userId: string, candidates: Item[]): Promise<Item[]> {
    // Reranking lives in Phase B (recommendations). For now passthrough
    // so the AIService interface is satisfied.
    return candidates;
  }
}
