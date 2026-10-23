/**
 * Title matching shared by /api/search (global title pass) and
 * /api/search/quick (instant, AI-free results while typing).
 *
 * Every meaningful query word must appear at the START of a word in the
 * folded title or original title — substring matching let "θεα" (θέα)
 * hit "θεατρο". Category triggers and short function words are ignored.
 */

export function foldGreek(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Words that name a category ("ταινία", "παράσταση") — folded. */
export const CATEGORY_TRIGGERS = new Set([
  "μπαρ", "καφε", "ταινια", "ταινιες", "σειρα", "σειρες", "βιβλιο", "βιβλια",
  "συνταγη", "συνταγες", "εστιατοριο", "εστιατορια", "φαγητο", "ταβερνα",
  "ξενοδοχειο", "διαμονη", "θεατρο", "παρασταση", "παραστασεις", "συναυλια", "φεστιβαλ",
  "movie", "movies", "film", "series", "book", "books", "cafe", "coffee",
  "cocktail", "wine", "hotel", "stay", "theater", "theatre", "event",
  "concert", "festival", "restaurant", "burger", "sushi", "pizza", "ramen",
  "brunch", "musical", "pub", "resort", "villa",
]);

const FUNCTION_WORDS = new Set([
  "για", "στο", "στη", "στις", "στους", "και", "αυτο", "αυτη", "αυτος",
  "αυτα", "αυτες", "αυτους", "ειναι", "εχει", "εχω",
  "σαν", "με", "την", "τον", "του", "της", "των", "τα", "το", "οι", "ενα",
  "μια", "απο", "που", "στην", "στον", "πιο", "the", "and",
]);

/** Category triggers + function words: never used as title tokens. */
export const TITLE_STOPWORDS = new Set([...CATEGORY_TRIGGERS, ...FUNCTION_WORDS]);

const splitFolded = (q: string) =>
  foldGreek(q).split(/[\s,.;:!?()/—–-]+/).map((t) => t.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);

/** True when the query names a category — title matches should then stay
 *  inside the detected category ("παράσταση για παιδιά" ≠ parenting books). */
export function hasCategoryTrigger(q: string): boolean {
  return splitFolded(q).some((t) => CATEGORY_TRIGGERS.has(t));
}

export function titleTokens(q: string): string[] {
  return splitFolded(q).filter((t) => t.length >= 3 && !TITLE_STOPWORDS.has(t));
}

/**
 * PostgREST `.or()` filter for one token on title / original title.
 * 4+ letters: word-start prefix (search runs while typing — "ανεμοδα").
 * 3 letters: whole word only — "θεα" (θέα) must not match "θεατρο".
 */
export function tokenOrFilter(t: string): string {
  const cols = ["title_normalized", "original_title_normalized"];
  const patterns = t.length >= 4
    ? [`${t}%`, `% ${t}%`]
    // (no "," variants: a comma would split the PostgREST or() filter)
    : [`${t}`, `${t} %`, `% ${t}`, `% ${t} %`];
  return cols.flatMap((c) => patterns.map((p) => `${c}.ilike.${p}`)).join(",");
}

/** Folded, accent-insensitive title score (used to rank quick results). */
export function quickTitleScore(query: string, title: string): number {
  const q = foldGreek(query).trim();
  const t = foldGreek(title).trim();
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  return 30;
}
