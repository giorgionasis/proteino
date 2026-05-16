import { generateObject, embed } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import type { Item, SubmissionAnalysis, SearchAnalysis, CategorySlug } from "@/types";
import type { AIService } from "./index";
import { assessQuality } from "./quality";
import { getTaxonomy, renderTaxonomyForPrompt } from "./taxonomy";

/**
 * Gemini-backed AIService — now routed through Vercel AI Gateway.
 *
 * Switched from the raw `@google/generative-ai` SDK to the AI SDK's
 * `generateObject` + `gateway()` provider. Behaviour, prompts, and
 * cache keys are unchanged; the wire format is Gateway → Google. This
 * unlocks unified observability + zero-data-retention + fallback
 * routing without changing the AIService interface.
 *
 * Model id format: "google/gemini-2.5-flash-lite" (provider/model).
 *
 * Auth: the gateway picks up AI_GATEWAY_API_KEY from process.env
 * automatically. GEMINI_API_KEY is no longer read here (kept only for
 * the legacy direct-Gemini code path in lib/ai/index.ts during dev).
 */
const MODEL_FLASH = "google/gemini-2.5-flash-lite";
const MODEL_EMBEDDING = "google/text-embedding-004";

export const GEMINI_PROVIDER_LABEL = "gemini-gateway";
export const GEMINI_MODEL_ID = MODEL_FLASH;

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
  "mood": "<short emotional descriptor ή null>",
  "english_title_hint": "<canonical English title όταν το έργο είναι διεθνώς γνωστό με Λατινικό όνομα, αλλιώς null>",
  "english_author_hint": "<Λατινική γραφή του author/director όνομα όταν το έργο είναι μεταφρασμένο/διεθνές, αλλιώς null>",
  "location_hint": "<περιοχή/πόλη για venues (food/bars/hotels) — πχ 'Πλάκα Αθήνα', 'Μύκονος', 'Θεσσαλονίκη' — ή null όταν δεν αναφέρεται ή κατηγορία δεν είναι venue>"
}

Κανόνες:
- Αν ο χρήστης λέει "είδα το X" / "διάβασα το Y" / "πήγα στο Z" → προσπάθησε να εντοπίσεις τον τίτλο
- Greeklish + ελληνικά mixed: normalize στα ελληνικά
- confidence 0-30: άγνωστο/ασαφές, 30-70: πιθανός match, 70-100: σχεδόν σίγουρο
- english_title_hint: ΜΟΝΟ όταν ξέρεις τον επίσημο English τίτλο.
    "Ζορμπάς" → "Zorba the Greek"
    "Νησί του Δρ. Μορό" → "The Island of Doctor Moreau"
    "1984" → "1984" (ίδιο)
    "How Google Works" → null (ήδη English)
    Άγνωστο/Greek-only έργο → null
- english_author_hint: Λατινική γραφή ονόματος.
    "Καζαντζάκης" → "Kazantzakis"
    "Παπαδιαμάντης" → "Papadiamantis"
    Greek-only authors χωρίς διεθνή παρουσία → null
- location_hint: ΜΟΝΟ για venues. Εξάγαγε την περιοχή/πόλη/νησί που αναφέρει ο χρήστης:
    "ταβέρνα Διόνυσος στη Πλάκα" → "Πλάκα Αθήνα"
    "Six dogs στο κέντρο" → "Αθήνα"
    "ξενοδοχείο στην Παροικιά Πάρος" → "Παροικιά Πάρος"
    "καφέ στη Φωκαία Καβάλα" → "Φωκαία Καβάλα"
    Αν δεν αναφέρεται περιοχή, βάλε "Αθήνα" ως default για venues (η πιο πιθανή).
    Αν δεν είναι venue → null.
- INFERENCE από context: ακόμα κι όταν ο χρήστης ΔΕΝ αναφέρει συγκεκριμένα όνομα, αν ο τίτλος + το context πέφτει ξεκάθαρα σε γνωστό έργο, ΣΥΜΠΛΗΡΩΣΕ τον author hint από τις γνώσεις σου:
    "Hooked" + designers/product/habit → actor_hint: "Nir Eyal"
    "Sapiens" + history/anthropology → actor_hint: "Yuval Noah Harari"
    "Atomic Habits" + productivity → actor_hint: "James Clear"
    "1984" + dystopia → actor_hint: "George Orwell"
    "Ζορμπάς" → actor_hint: "Καζαντζάκης", english_author_hint: "Kazantzakis"
  Είναι ΚΡΙΣΙΜΟ — βιβλία με κοινούς τίτλους (πχ "Hooked" = και του Nir Eyal και της Emily McIntire) χρειάζονται author hint για να γίνει σωστή αντιστοίχιση. Συμπλήρωσε αυτό που βλέπεις ως πιθανότερο από το context.
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown.`;

const COACHING_PROMPT = `Είσαι ένας περίεργος + ευγενικός φίλος στο Proteino. Ο χρήστης γράφει κριτική για κάτι που του άρεσε. Σου δίνουμε την κατηγορία (movies/series/books/food/recipes/bars/hotels/theater/events) όταν είναι γνωστή και — όταν υπάρχει — το προηγούμενο tip που έδωσες, ώστε να ΜΗΝ το επαναλάβεις.

ΔΟΥΛΕΙΑ: διάβασε ΤΙ έχει γράψει, αναγνώρισέ το με ζεστασιά, και πρόσθεσε μια ΦΙΛΙΚΗ ΠΡΟΣΚΛΗΣΗ για μία επιπλέον γωνία που θα έκανε την κριτική πιο πλούσια. Όχι διόρθωση — πρόσκληση.

TONE — ΑΥΣΤΗΡΟΣ ΚΑΝΟΝΑΣ:
ΑΠΑΓΟΡΕΥΟΝΤΑΙ οι λέξεις/εκφράσεις που υπονοούν ότι ο χρήστης τα πάει χάλια ή είναι ανεπαρκής:
  ❌ "όμως" (αντιθετικό — υπονοεί έλλειψη)
  ❌ "ακριβώς" / "τι ακριβώς" (κλινικό — υπονοεί ότι ήταν γενικό)
  ❌ "είναι λίγο γενικό" / "δεν αρκεί" / "λείπει"
  ❌ "γράψε περισσότερα" / "πες περισσότερα"
  ❌ "θα ήταν καλύτερα αν..."

ΠΡΟΤΙΜΑΜΕ invitational ρήματα (conditional/υποθετικό αντί για imperative):
  ✓ "Θα ήθελες να μας πεις..."
  ✓ "Μήπως θες να μοιραστείς..."
  ✓ "Θα μ' ενδιέφερε να μάθω..."
  ✓ "Αν θέλεις, μπορείς να μας πεις..."
  ✓ "Θα μου άρεσε να ακούσω και..."

Λιγότερο προτεινόμενο (αλλά αποδεκτό όταν είναι ζεστό): "πες μας / πες μου".
ΑΠΟΦΥΓΕ ξερό imperative: "Πες μας X" / "Γράψε X" / "Μίλα για X" χωρίς ζεστασιά.

Παραδείγματα συνολικής φόρμας:
  ✓ "Ωραίο! Και αν θέλεις, μπορείς να μοιραστείς κάτι για..."
  ✓ "Μ' αρέσει που είπες για X. Θα μ' ενδιέφερε επίσης..."
  ✓ "Καλή παρατήρηση! Μήπως θες να μου πεις και..."
  ✓ "Τέλεια που σου άρεσε. Θα ήθελες να μας πεις τι σου έμεινε από..."
  ✓ "Φοβερό κομμάτι. Θα μου άρεσε να ακούσω και για..."

Σχήμα tip: "[ζεστή αναγνώριση 3-6 λέξεις]. [invitational πρόσκληση]"

JSON: {
  "ready": <true αν η κριτική είναι ήδη πλούσια+προσωπική>,
  "tip": <max 120 chars Greek string ή null αν ready=true>,
  "quality_label": <ένα από "poor" | "fair" | "good" | "excellent">
}

quality_label rubric:
- poor      → πολύ γενικό, μόνο "ωραίο/χάλια"
- fair      → 1-2 λεπτομέρειες, τίποτα προσωπικό
- good      → λεπτομέρειες ΚΑΙ συναίσθημα/προσωπική κρίση
- excellent → πλούσιο, συγκεκριμένο, με γιατί + λεπτομέρειες + συναίσθημα

Κανόνες:
- Εμπιστεύσου τις γνώσεις σου για το τι κάνει μια κριτική καλή
- Αν σου δοθεί "Προηγούμενο tip", ΑΠΑΓΟΡΕΥΕΤΑΙ να ξανα-ρωτήσεις για την ίδια γωνία — βρες ΑΛΛΗ
- Μη ζητάς κάτι που είπε ήδη
- Αν δεις επανάληψη (πχ "πολυ πολυ πολυ"), αναγνώρισε τον ενθουσιασμό χωρίς να τη σχολιάσεις αρνητικά
- Όταν quality_label = "excellent" → ready: true, tip: null
- Μόνο ελληνικά. Μόνο JSON.`;

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

const INTERESTS_PROMPT = `Διαβάζεις μια σύντομη αυτο-περιγραφή στα ελληνικά (ή greeklish). Εξάγαγε τις κατηγορίες ενδιαφέροντος του χρήστη από τη λίστα:

  movies   — ταινίες / σινεμά / film
  series   — σειρές / shows
  books    — βιβλία / μυθιστορήματα / διάβασμα
  food     — εστιατόρια / φαγητό έξω / ταβέρνες
  recipes  — μαγείρεμα / συνταγές
  bars     — μπαρ / καφέ / ποτό / cocktails
  hotels   — ξενοδοχεία / διαμονή / ταξίδια
  theater  — θέατρο / παραστάσεις
  events   — εκδηλώσεις / συναυλίες / festivals

Επέστρεψε ΜΟΝΟ JSON:
{
  "categories": [<one or more slugs from the list above, in the order they were mentioned>]
}

Κανόνες:
- Επέστρεψε ΜΟΝΟ slugs από τη λίστα. ΜΗΝ εφεύρεις slugs.
- Αν δεν αναφέρεται καμία κατηγορία, επέστρεψε άδειο array.
- "Μου αρέσει το διάβασμα" → ["books"]
- "Λατρεύω το σινεμά, τα ιαπωνικά εστιατόρια και τις συναυλίες ροκ" → ["movies", "food", "events"]
- "Μαγειρεύω συχνά αλλά τρώω και έξω" → ["recipes", "food"]
- ΟΧΙ επεξήγηση. ΜΟΝΟ έγκυρο JSON.`;

// ── Zod schemas — replace manual JSON.parse + ad-hoc validation ──────
// Used both here for non-streaming `generateObject` and re-exported for
// the streaming routes so the partial-object shape on the client is
// type-aligned with the final.

export const SearchExtractionSchema = z.object({
  intent: z.string(),
  categories: z.array(z.string()),
  vibe: z.string().nullable(),
  type: z.string().nullable(),
  genre: z.string().nullable(),
  channel: z.string().nullable(),
  status: z.string().nullable(),
  period: z.string().nullable(),
  duration_min: z.number().nullable(),
  duration_max: z.number().nullable(),
  decade: z.string().nullable(),
  price: z.string().nullable(),
  person: z.string().nullable(),
  location: z.string().nullable(),
});
export type SearchExtraction = z.infer<typeof SearchExtractionSchema>;

export const SubmissionExtractionSchema = z.object({
  title: z.string().nullable(),
  category: z.string().nullable(),
  confidence: z.number(),
  year_hint: z.number().nullable(),
  actor_hint: z.string().nullable(),
  director_hint: z.string().nullable(),
  mood: z.string().nullable(),
  /** Canonical English equivalent of the title — populated when the
   *  user typed in Greek but the work is internationally known under
   *  a Latin name (e.g. Καζαντζάκης's "Ζορμπάς" → "Zorba the Greek",
   *  Όργουελ's "1984" → "1984"). Null when the work is Greek-only or
   *  when no English equivalent exists. Drives the Google Books
   *  English-fallback tier when Greek-script queries return empty. */
  english_title_hint: z.string().nullable(),
  /** Latin-script transliteration of the author name (Καζαντζάκης →
   *  Kazantzakis). Same purpose as english_title_hint — gives the
   *  enrichment pipeline a fighting chance against APIs that only
   *  index foreign works under Latin spelling. */
  english_author_hint: z.string().nullable(),
  /** Geographic location hint for venue categories (food/bars/hotels).
   *  Gemini extracts neighborhood/city words from the user's text so
   *  Google Places can disambiguate same-name venues. Examples:
   *    "Διόνυσος στη Πλάκα" → "Πλάκα Αθήνα"
   *    "Six dogs στο κέντρο" → "Αθήνα"
   *    "ξενοδοχείο Mykonos View" → "Μύκονος"
   *  Null when no location mentioned or category is non-venue. */
  location_hint: z.string().nullable(),
});
export type SubmissionExtraction = z.infer<typeof SubmissionExtractionSchema>;

export const CoachingSchema = z.object({
  ready: z.boolean(),
  tip: z.string().nullable(),
  /** Gemini's own freshness judgment on the writing. Drives the panel
   *  badge dynamically so it actually moves as the user writes better
   *  content (instead of staying stuck on the regex-derived label). */
  quality_label: z.enum(["poor", "fair", "good", "excellent"]),
});
export type Coaching = z.infer<typeof CoachingSchema>;

export const FallbackSchema = z.object({
  question: z.string().nullable(),
});

export const InterestsSchema = z.object({
  categories: z.array(z.string()),
});

// 0.1 — extraction is factual, we want maximum determinism. Combined
// with the Postgres cache (lib/ai/cache-and-log.ts), repeat queries
// return identical results.
const DEFAULT_TEMPERATURE = 0.1;

export class GeminiAIService implements AIService {
  /** Public for cache-and-log to label usage rows with the right
   *  provider string instead of a hardcoded "gemini". */
  readonly provider = GEMINI_PROVIDER_LABEL;
  readonly model = GEMINI_MODEL_ID;

  constructor(_apiKeyIgnored?: string) {
    // Gateway picks up AI_GATEWAY_API_KEY automatically. The optional
    // arg is kept so existing callers (lib/ai/index.ts) compile
    // unchanged during the transition; it's a no-op now.
  }

  async analyzeSearchQuery(query: string): Promise<SearchAnalysis> {
    if (!query || query.trim().length < 2) {
      return { intent: query, vibe: null, type: null, location: null, categories: [], query };
    }

    let fullPrompt = SEARCH_PROMPT;
    try {
      const taxonomy = await getTaxonomy();
      fullPrompt = SEARCH_PROMPT + "\n\n" + renderTaxonomyForPrompt(taxonomy);
    } catch {
      /* taxonomy unavailable — base prompt only */
    }

    try {
      const { object } = await generateObject({
        model: gateway(MODEL_FLASH),
        schema: SearchExtractionSchema,
        system: fullPrompt,
        prompt: query,
        temperature: DEFAULT_TEMPERATURE,
      });

      const categories = (object.categories ?? [])
        .filter((c): c is CategorySlug => VALID_CATEGORIES.includes(c as CategorySlug));

      const rawStatus = (object.status ?? "").toString().toLowerCase().trim();
      const status: "completed" | "ongoing" | null =
        rawStatus === "completed" ? "completed"
        : rawStatus === "ongoing" ? "ongoing"
        : null;

      const toMinutes = (v: unknown): number | null => {
        if (v == null) return null;
        const n = typeof v === "number" ? v : parseInt(String(v), 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      return {
        intent: object.intent ?? query,
        vibe: object.vibe ?? null,
        type: object.type ?? null,
        location: object.location ?? null,
        categories,
        query,
        decade: object.decade ?? null,
        price: (object.price === "budget" || object.price === "mid" || object.price === "high") ? object.price : null,
        person: object.person ?? null,
        genre: object.genre ?? null,
        channel: object.channel ?? null,
        status,
        period: object.period ?? null,
        duration_min: toMinutes(object.duration_min),
        duration_max: toMinutes(object.duration_max),
      };
    } catch (err) {
      console.error("[gemini.analyzeSearchQuery]", err);
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

    const extraction = await extractSubmissionFields(text);

    // Hand off to /api/ai/match for the actual TMDB / Books / Places
    // confirmation step. Gemini's role is to extract a clean title +
    // category hint; the existing match endpoint does the canonical
    // lookup. Pass extracted hints via query params so the endpoint
    // can prefer them over raw-text heuristics.
    //
    // Only attempted on the client (where window exists). When invoked
    // server-side (e.g., from a Route Handler), we return the bare
    // extraction so the caller can wire the match call itself.
    if (typeof window !== "undefined") {
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
    }

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
    // Local-only heuristic — fast, free, no round-trip.
    return assessQuality(text).score / 100;
  }

  async getSemanticQualityTip(text: string, category?: string | null): Promise<string | null> {
    if (text.trim().length < 60) return null;
    try {
      const prompt = category
        ? `Κατηγορία: ${category}\n\nΚείμενο χρήστη:\n${text}`
        : `Κατηγορία: άγνωστη\n\nΚείμενο χρήστη:\n${text}`;
      const { object } = await generateObject({
        model: gateway(MODEL_FLASH),
        schema: CoachingSchema,
        system: COACHING_PROMPT,
        prompt,
        temperature: 0.6,
      });
      if (object.ready) return null;
      const tip = (object.tip ?? "").trim();
      return tip.length > 0 && tip.length <= 120 ? tip : null;
    } catch (err) {
      console.error("[gemini.getSemanticQualityTip]", err);
      return null;
    }
  }

  async conversationalSearchFallback(query: string, hint?: string): Promise<string | null> {
    if (query.trim().length < 3) return null;
    try {
      const input = hint ? `Query: "${query}"\nHint: ${hint}` : `Query: "${query}"`;
      const { object } = await generateObject({
        model: gateway(MODEL_FLASH),
        schema: FallbackSchema,
        system: FALLBACK_PROMPT,
        prompt: input,
        temperature: 0.6,
      });
      const q = (object.question ?? "").trim();
      return q.length > 0 && q.length <= 120 ? q : null;
    } catch (err) {
      console.error("[gemini.conversationalSearchFallback]", err);
      return null;
    }
  }

  async extractInterests(text: string): Promise<string[] | null> {
    const trimmed = text.trim();
    if (trimmed.length < 4) return null;
    try {
      const { object } = await generateObject({
        model: gateway(MODEL_FLASH),
        schema: InterestsSchema,
        system: INTERESTS_PROMPT,
        prompt: trimmed,
        temperature: DEFAULT_TEMPERATURE,
      });
      const valid = object.categories
        .filter((s) => typeof s === "string")
        .filter((s) => VALID_CATEGORIES.includes(s as CategorySlug));
      // De-dupe, preserve order.
      const seen = new Set<string>();
      const result: string[] = [];
      for (const s of valid) {
        if (!seen.has(s)) { seen.add(s); result.push(s); }
      }
      return result;
    } catch (err) {
      console.error("[gemini.extractInterests]", err);
      return null;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: gateway.textEmbeddingModel(MODEL_EMBEDDING),
        value: text,
      });
      return embedding;
    } catch (err) {
      console.error("[gemini.generateEmbedding]", err);
      return [];
    }
  }

  async rerankRecommendations(_userId: string, candidates: Item[]): Promise<Item[]> {
    // Reranking lives in Phase B. Passthrough so the interface is satisfied.
    return candidates;
  }
}

/**
 * Standalone Gemini extraction for a user submission. Returns just the
 * structured fields (title / category / confidence / hints) — no TMDB
 * handoff, no quality scoring, no message synthesis. Used by both
 * `analyzeSubmission` (which then orchestrates the TMDB call) and by
 * `/api/ai/match` server-side (which needs the extraction inline to
 * replace the regex first-capital-word fallback for non-movie/series
 * categories). Sub-10-char inputs return null without hitting the LLM.
 *
 * Best-effort: returns null on any provider error so callers degrade
 * gracefully to their regex fallback.
 */
export async function extractSubmissionFields(
  text: string,
): Promise<SubmissionExtraction | null> {
  if (!text || text.trim().length < 10) return null;

  let fullPrompt = SUBMISSION_PROMPT;
  try {
    const taxonomy = await getTaxonomy();
    fullPrompt = SUBMISSION_PROMPT + "\n\n" + renderTaxonomyForPrompt(taxonomy);
  } catch {
    /* taxonomy unavailable — base prompt only */
  }

  try {
    const { object } = await generateObject({
      model: gateway(MODEL_FLASH),
      schema: SubmissionExtractionSchema,
      system: fullPrompt,
      prompt: text,
      temperature: DEFAULT_TEMPERATURE,
    });
    return object;
  } catch (err) {
    console.error("[gemini.extractSubmissionFields]", err);
    return null;
  }
}

// Re-exported prompt + model constants for the streaming routes —
// keeps the system prompt single-sourced.
export {
  SEARCH_PROMPT,
  SUBMISSION_PROMPT,
  COACHING_PROMPT,
  FALLBACK_PROMPT,
  INTERESTS_PROMPT,
  MODEL_FLASH,
  MODEL_EMBEDDING,
};
