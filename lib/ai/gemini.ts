import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import type { Item, SubmissionAnalysis, SearchAnalysis, CategorySlug } from "@/types";
import type { AIService } from "./index";
import { assessQuality } from "./quality";
import { getTaxonomy, renderTaxonomyForPrompt } from "./taxonomy";

/**
 * Gemini-backed AIService.
 *
 * Uses Gemini 2.5 Flash-Lite for the latency-sensitive, structured-
 * extraction tasks (search intent, submission match). Falls back to
 * the existing server endpoints when the model errors out so the
 * user-facing flow never degrades to a hard error.
 *
 * Model selection rationale (verified via side-by-side test):
 *   - Flash-Lite is 2-3× faster than Flash (~750ms vs ~1700ms)
 *   - Flash-Lite is ~½ the cost (~$0.00003/search vs ~$0.0001)
 *   - Flash-Lite has 3× the free-tier rate limit (15 RPM vs 5)
 *   - Quality is comparable for extraction tasks; Flash-Lite is
 *     actually MORE conservative about hallucinating canonical names,
 *     which is desirable since we hand off to TMDB/Books/Places for
 *     verification anyway
 *   - text-embedding-004 for vectors (Phase B pgvector work)
 */
const MODEL_FLASH = "gemini-2.5-flash-lite";
const MODEL_EMBEDDING = "text-embedding-004";

const VALID_CATEGORIES: CategorySlug[] = [
  "movies", "series", "books", "food", "recipes", "bars", "hotels", "theater", "events",
];

const SEARCH_PROMPT = `Είσαι assistant για το Proteino, μια ελληνική πλατφόρμα προτάσεων. Ο χρήστης γράφει ένα query σε ελληνικά (ή greeklish).

Εξάγαγε δομημένη πρόθεση από το query. Επέστρεψε ΜΟΝΟ JSON ΑΥΤΉΣ ΤΗΣ ΑΚΡΙΒΏΣ ΜΟΡΦΉΣ:

{
  "intent": "<original query verbatim>",
  "categories": [<one or more from: movies, series, books, food, recipes, bars, hotels, theater, events>],
  "vibe": "<MOOD/ATMOSPHERE — cozy, romantic, lively, chill, family — ή null>",
  "type": "<establishment/sub-type — ταβέρνα, μεζεδοπωλείο, ψαροταβέρνα, cocktail-bar, music-bar, rooftop, sushi, vegan — ή null>",
  "genre": "<κατηγορία περιεχομένου ως όνομα subcategory: 'Κωμωδία', 'Θρίλερ', 'Παιδικά', 'Sci-Fi', 'Ντοκιμαντέρ', 'Animation', 'Ψυχολογίας', 'Συναυλία', 'Festival' — ή null>",
  "channel": "<πλατφόρμα/κανάλι: 'Netflix', 'HBO', 'Disney+', 'Apple TV+', 'Amazon Prime', 'Mega', 'ANT1' — ή null>",
  "status": "<'completed' (ολοκληρωμένη/τελείωσε) ή 'ongoing' (νέες σεζόν/συνεχίζεται) — ή null. Μόνο για σειρές.>",
  "period": "<χρονική περίοδος: 'summer', 'winter', 'spring', 'autumn', 'december', 'july', 'weekend' — ή null. Μόνο για events/theater.>",
  "duration_min": <ελάχιστη διάρκεια σε λεπτά για ταινίες ('πάνω από 120 λεπτά' → 120) ή null>,
  "duration_max": <μέγιστη διάρκεια σε λεπτά για ταινίες ('κάτω από 90 λεπτά' → 90) ή null>,
  "decade": "<πχ '1990s', '2010s' ή null>",
  "price": "<'budget' / 'mid' / 'high' ή null>",
  "person": "<όνομα ηθοποιού/σκηνοθέτη/συγγραφέα/περφόρμερ ή null>",
  "location": "<Greek place name (πόλη/περιοχή/νησί) ή null>"
}

ΚΡΙΣΙΜΟΙ ΚΑΝΟΝΕΣ:
- "vibe" = ΜΟΝΟ συναίσθημα/ατμόσφαιρα. ΟΧΙ τύπος, ΟΧΙ θέμα, ΟΧΙ τιμή.
  ΣΩΣΤΑ: "cozy", "romantic", "energetic", "chill", "family"
  ΛΑΘΟΣ: "μουσική" (αυτό είναι type), "1990s" (decade), "φθηνά" (price), "ψυχολογίας" (genre)
- "type" = είδος καταστήματος Ή κουζίνα Ή sub-type. ΣΥΝΔΥΑΖΕΙ δύο σημασίες για venues:
    food (establishment): "ταβέρνα", "μεζεδοπωλείο", "ψαροταβέρνα", "εστιατόριο", "ουζερί"
    food (cuisine): "ιταλική", "ελληνική", "ασιατική", "ιαπωνική", "βόρεια", "burger", "sushi", "vegan"
    bars: "cocktail-bar", "wine-bar", "rooftop", "jazz-bar"
    hotels: "ξενοδοχείο", "διαμέρισμα", "camping"
  Αν το user input είναι κουζίνα ("ιταλικό", "ασιατικό"), ΒΑΛΤΟ ΕΔΩ — όχι στο genre.
  Normalize gender variants: "ιταλικό"/"ιταλικά" → "ιταλική" (canonical feminine).
- "genre" = ΥΠΟΧΡΕΩΤΙΚΑ ΕΝΑ ΑΚΡΙΒΕΣ όνομα subcategory από το KANONIKES TIMES list παρακάτω. ΜΗΝ εφεύρεις τιμές που δεν είναι στο list. Παραδείγματα ισοδυναμιών:
    "παιδικά / παιδική" (movies) → "Animation"
    "νουάρ" → "Θρίλερ"
    "νεο-νουαρ" → "Θρίλερ"
    "ψυχολογικό" (movies) → "Θρίλερ" ή "Δράμα"
    "ντοκυμαντέρ" → "Ντοκιμαντέρ"
    "rock συναυλία" (events) → "Συναυλία"
  Αν το user input δεν αντιστοιχεί σε καμία canonical τιμή, βάλε null για το genre — ΜΗΝ βάλεις την user-typed λέξη.
- "channel" = πλατφόρμα streaming ή τηλεοπτικός σταθμός. Normalize στο πιο γνωστό όνομα (το "νετφλιξ" / "netflix" → "Netflix").
- "status" = ΜΟΝΟ για σειρές. "ολοκληρωμένες σειρές" → "completed". "νέα σεζόν" / "τρέχουσες" → "ongoing".
- "period" = χρονική περίοδος γεγονότος. "καλοκαίρι" → "summer", "Δεκέμβρης" → "december", "σαββατοκύριακο" → "weekend".
- "duration_min" / "duration_max" = αριθμητικά bounds για ταινίες. "κάτω από 90 λεπτά" → duration_max=90. "πάνω από 2 ώρες" → duration_min=120 (μετάτρεψε ώρες σε λεπτά). "ανάμεσα 90 και 120 λεπτά" → duration_min=90, duration_max=120.
- "decade" = δεκαετία ή χρονιά (όπως "2010s")
- "price" = "budget" (φθηνά/cheap), "mid", "high" (premium/ακριβά)
- "person" = κύρια ονόματα. Sebastian Fitzek, Nolan, Παπαδιαμάντης, Σπύρος Μπιμπίλας. Επίσης για theater/events: όνομα performer/ηθοποιού.
- "location" = περιοχή/πόλη/νησί ΑΥΤΟΥΣΙΑ όπως το έγραψε ο user. Επέστρεψε null για: "κοντά μου", "κέντρο" χωρίς πόλη, "γύρω", "εδώ". ΜΟΝΟ συγκεκριμένα γεωγραφικά ονόματα. ΜΗΝ αλλάξεις την κατεύθυνση — "Βόρεια Προάστια" παραμένει "Βόρεια Προάστια", ΟΧΙ "Νότια Προάστια". Παραδείγματα: Αθήνα, Γλυφάδα, Μύκονος, Βόρεια Προάστια, Νότια Προάστια, Χαλάνδρι, Παγκράτι.
- Greeklish like "kalifeisi" → "Καλλιθέα", normalize στα ελληνικά.
- Multi-category όταν είναι αμφίσημο (πχ "κωμωδίες netflix" → ["movies", "series"]).
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown, χωρίς σχόλια.`;

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

const COACHING_PROMPT = `Είσαι coach για το Proteino, μια ελληνική πλατφόρμα προτάσεων. Ο χρήστης γράφει μια κριτική / πρόταση για κάτι (ταινία, βιβλίο, εστιατόριο κτλ).

Διάβασε το κείμενο. Επέστρεψε ΜΟΝΟ JSON:

{
  "ready": <true αν η πρόταση είναι ήδη πολύ καλή και δεν χρειάζεται tip, αλλιώς false>,
  "tip": "<μία σύντομη πρόταση (max 80 chars) που λέει τι λείπει — π.χ. 'Πες ποια σκηνή σε άγγιξε' / 'Γιατί το προτείνεις σε κάποιον;' / 'Πες κάτι πιο προσωπικό'. ή null αν ready=true>"
}

Κανόνες για το tip:
- ΜΗ γενικότητες όπως 'γράψε περισσότερα'
- Συγκεκριμένο και ενεργητικό: 'Πες ποια σκηνή σε άγγιξε', 'Πες πώς σε έκανε να νιώσεις'
- Αν λείπει το ΓΙΑΤΙ → 'Γιατί ξεχωρίζει για σένα;'
- Αν λείπει συναίσθημα → 'Τι σου άφησε στο τέλος;'
- Αν λείπει συγκεκριμένη λεπτομέρεια → 'Πες μια στιγμή/σκηνή/χαρακτήρα που έμεινε'
- Αν είναι πολύ πλούσιο και προσωπικό → ready: true, tip: null
- ΜΟΝΟ ελληνικά. ΜΟΝΟ έγκυρο JSON.`;

const FALLBACK_PROMPT = `Είσαι assistant για το Proteino. Ο χρήστης έκανε αναζήτηση και δεν βρήκε αποτέλεσμα. Δώσε μια σύντομη, βοηθητική ερώτηση που να τον κάνει να πει περισσότερα.

Επέστρεψε ΜΟΝΟ JSON:
{
  "question": "<μία σύντομη ερώτηση max 120 chars στα ελληνικά>"
}

Κανόνες:
- Συγκεκριμένη και βοηθητική ερώτηση
- Πχ αν "γαλατσι μπαρ": "Τι ψάχνεις πιο συγκεκριμένα — cocktails, ζωντανή μουσική, ή κάτι ήσυχο για κουβέντα;"
- Πχ αν "ταινιες δραμα": "Έχεις προτίμηση σε εποχή ή σκηνοθέτη; Ή θες κάτι σύγχρονο;"
- ΜΟΝΟ μία ερώτηση, όχι λίστα
- ΜΟΝΟ ελληνικά. ΜΟΝΟ έγκυρο JSON.`;

interface GeminiSearchExtraction {
  intent: string;
  categories: string[];
  vibe: string | null;
  type: string | null;
  genre: string | null;
  channel: string | null;
  status: string | null;
  period: string | null;
  duration_min: number | null;
  duration_max: number | null;
  decade: string | null;
  price: string | null;
  person: string | null;
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
  // 0.1 (was 0.2) — extraction is factual, we want maximum determinism.
  // Combined with the Postgres cache (lib/ai/cache-and-log.ts), repeat
  // queries return identical results.
  temperature: 0.1,
  topP: 0.9,
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

    // Build full system prompt with DB taxonomy injected. getTaxonomy()
    // is module-cached for 5min so this is a fast lookup after first call.
    let fullPrompt = SEARCH_PROMPT;
    try {
      const taxonomy = await getTaxonomy();
      fullPrompt = SEARCH_PROMPT + "\n\n" + renderTaxonomyForPrompt(taxonomy);
    } catch {
      // Taxonomy unavailable (DB down) — fall through with base prompt.
    }

    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: fullPrompt,
        generationConfig: GEN_CONFIG,
      });
      const res = await model.generateContent(query);
      const text = res.response.text();
      const parsed = JSON.parse(text) as GeminiSearchExtraction;

      const categories = (parsed.categories ?? [])
        .filter((c): c is CategorySlug => VALID_CATEGORIES.includes(c as CategorySlug));

      // Status normalization — Gemini may return Greek aliases.
      const rawStatus = (parsed.status ?? "").toString().toLowerCase().trim();
      const status: "completed" | "ongoing" | null =
        rawStatus === "completed" ? "completed"
        : rawStatus === "ongoing" ? "ongoing"
        : null;

      // Numeric coercion — Gemini occasionally returns durations as
      // strings. Accept both, reject NaN.
      const toMinutes = (v: unknown): number | null => {
        if (v == null) return null;
        const n = typeof v === "number" ? v : parseInt(String(v), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      return {
        intent: parsed.intent ?? query,
        vibe: parsed.vibe ?? null,
        type: parsed.type ?? null,
        location: parsed.location ?? null,
        categories,
        query,
        decade: parsed.decade ?? null,
        price: (parsed.price === "budget" || parsed.price === "mid" || parsed.price === "high") ? parsed.price : null,
        person: parsed.person ?? null,
        genre: parsed.genre ?? null,
        channel: parsed.channel ?? null,
        status,
        period: parsed.period ?? null,
        duration_min: toMinutes(parsed.duration_min),
        duration_max: toMinutes(parsed.duration_max),
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

    let fullSubmissionPrompt = SUBMISSION_PROMPT;
    try {
      const taxonomy = await getTaxonomy();
      fullSubmissionPrompt = SUBMISSION_PROMPT + "\n\n" + renderTaxonomyForPrompt(taxonomy);
    } catch {
      /* taxonomy unavailable — base prompt only */
    }

    let extraction: GeminiSubmissionExtraction | null = null;
    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: fullSubmissionPrompt,
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
      if (typeof extraction?.confidence === "number") {
        url.searchParams.set("confidence_hint", String(extraction.confidence));
      }

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

  async getSemanticQualityTip(text: string): Promise<string | null> {
    if (text.trim().length < 60) return null; // not substantive enough yet
    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: COACHING_PROMPT,
        generationConfig: { temperature: 0.6, topP: 0.9, responseMimeType: "application/json" },
      });
      const res = await model.generateContent(text);
      const parsed = JSON.parse(res.response.text()) as { tip?: string | null; ready?: boolean };
      if (parsed.ready) return null; // user's writing is good — no tip
      const tip = (parsed.tip ?? "").trim();
      return tip.length > 0 && tip.length <= 80 ? tip : null;
    } catch (err) {
      console.error("[gemini.getSemanticQualityTip]", err);
      return null;
    }
  }

  async conversationalSearchFallback(query: string, hint?: string): Promise<string | null> {
    if (query.trim().length < 3) return null;
    try {
      const model = this.client.getGenerativeModel({
        model: MODEL_FLASH,
        systemInstruction: FALLBACK_PROMPT,
        generationConfig: { temperature: 0.6, topP: 0.9, responseMimeType: "application/json" },
      });
      const input = hint ? `Query: "${query}"\nHint: ${hint}` : `Query: "${query}"`;
      const res = await model.generateContent(input);
      const parsed = JSON.parse(res.response.text()) as { question?: string | null };
      const q = (parsed.question ?? "").trim();
      return q.length > 0 && q.length <= 120 ? q : null;
    } catch (err) {
      console.error("[gemini.conversationalSearchFallback]", err);
      return null;
    }
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
