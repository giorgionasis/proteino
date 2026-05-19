/**
 * Biblionet web service client — the Greek institutional book catalog.
 *
 * Docs (gated): https://biblionet.gr/webservice/
 *
 * Auth: every request posts `username` + `password` in the JSON body.
 * Configure via env:
 *
 *   BIBLIONET_USERNAME=...
 *   BIBLIONET_PASSWORD=...
 *   BIBLIONET_BASE_URL=... (optional — defaults to the "new" endpoint)
 *
 * Response quirks the client smooths over:
 *   • every endpoint returns `[ [ {...}, {...} ] ]` (array-in-array),
 *     including `get_title` — the docs claim it returns a single object,
 *     but real responses are always wrapped
 *   • errors land as `{ error: { error: "..." } }`
 *   • empty strings everywhere → normalised to null
 *   • image paths are relative to `https://biblionet.gr` → absolutised
 *   • the `ISBN` field doesn't distinguish 10 vs 13 → detected by length
 *   • `get_month_titles` returns the FULL detail payload (Summary, PageNo,
 *     Price, Series, etc.) — not just summary fields. One bulk page-call
 *     gets 50 books with complete metadata.
 *   • contributor `PresentOrder` is currently always "1" — the array
 *     index is the real display order (mapper exposes it as `order`)
 *   • contributor names sometimes contain double spaces — normalised
 *
 * Biblionet has NO text-search endpoint — only by numeric id, ISBN, or
 * month/year + lastupdate firehose. The submission flow that fuzzy-matches
 * titles needs a local catalog mirror (initial bulk via getMonthTitles +
 * daily delta via getTitle with lastupdate). See feedback_books_data_source.md.
 */

const NEW_BASE = "https://biblionet.gr/webservice";
const LEGACY_BASE = "https://biblionet.gr/wp-json/biblionetwebservice";
const COVER_HOST = "https://biblionet.gr";
const DEFAULT_TIMEOUT_MS = 6_000;

function getBaseUrl(): string {
  return process.env.BIBLIONET_BASE_URL?.trim() || NEW_BASE;
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.BIBLIONET_USERNAME?.trim();
  const password = process.env.BIBLIONET_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error(
      "Biblionet credentials missing — set BIBLIONET_USERNAME and BIBLIONET_PASSWORD in env",
    );
  }
  return { username, password };
}

/* ── HTTP layer ────────────────────────────────────────────── */

type BiblionetErrorBody = { error?: { error?: string } | string };

async function biblionetPost(
  method: string,
  params: Record<string, unknown>,
  opts?: { timeoutMs?: number },
): Promise<unknown> {
  const { username, password } = getCredentials();
  const url = `${getBaseUrl()}/${method}`;
  const body = JSON.stringify({ username, password, ...params });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Biblionet ${method} request failed: ${msg}`);
  }

  if (!res.ok) {
    throw new Error(`Biblionet ${method} HTTP ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  if (!text) throw new Error(`Biblionet ${method} returned empty body`);

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Biblionet ${method} returned non-JSON (first 200 chars): ${text.slice(0, 200)}`,
    );
  }

  // Error shape: { error: { error: "..." } } or { error: "..." }
  if (data && typeof data === "object" && "error" in data) {
    const errVal = (data as BiblionetErrorBody).error;
    const msg =
      typeof errVal === "string"
        ? errVal
        : (errVal && typeof errVal === "object" && "error" in errVal && errVal.error) || "unknown error";
    throw new Error(`Biblionet ${method} error: ${msg}`);
  }

  return data;
}

/** Unwrap the nested `[ [ {...} ] ]` shape used by every list endpoint. */
function unwrapList<T>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  const first = raw[0];
  return Array.isArray(first) ? (first as T[]) : (raw as T[]);
}

/* ── Normalisation helpers ─────────────────────────────────── */

function nullIfEmpty(v: unknown): string | null {
  return v == null || v === "" ? null : String(v).trim() || null;
}

function parseIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function absoluteImageUrl(path: unknown): string | null {
  const p = nullIfEmpty(path);
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  return `${COVER_HOST}${p.startsWith("/") ? p : `/${p}`}`;
}

/** Detect ISBN-13 (13 digits ignoring dashes) vs ISBN-10. */
export function classifyIsbn(raw: string | null): { isbn_13: string | null; isbn_10: string | null } {
  if (!raw) return { isbn_13: null, isbn_10: null };
  const digits = raw.replace(/[^0-9X]/gi, "");
  if (digits.length === 13) return { isbn_13: digits, isbn_10: null };
  if (digits.length === 10) return { isbn_13: null, isbn_10: digits };
  return { isbn_13: null, isbn_10: null };
}

/* ── Typed shapes ──────────────────────────────────────────── */

/**
 * Canonical book record — both `get_month_titles` and `get_title` return
 * this same shape. (The docs implied a "summary vs detail" split but real
 * responses don't have one.)
 */
export interface BiblionetTitle {
  title_id: number;
  cover_url: string | null;
  title: string;
  subtitle: string | null;
  parallel_title: string | null;
  alternative_title: string | null;
  original_title: string | null;
  isbn: string | null;
  isbn_alt: string[];
  ismn: string | null;

  publisher_id: number | null;
  publisher: string | null;

  writer_id: number | null;
  writer_sort: string | null;       // "Αβακιάν, Στέφανος"
  writer_display: string | null;    // "Στέφανος Αβακιάν"

  place_id: number | null;
  place: string | null;

  /** Publish year — derived from FirstPublishDate when available, falls back to PublishYear. */
  publish_year: number | null;
  publish_month: number | null;
  /** YYYY-MM-DD strings — preserved verbatim. */
  first_publish_date: string | null;
  current_publish_date: string | null;
  future_publish_date: string | null;

  title_type: string | null;        // "Βιβλίο" | "Περιοδικό" | ...
  availability: string | null;
  edition: string | null;           // "EditionNo" — "2η έκδοση" etc.

  // Physical bookbinding info — admin-side useful, not user-facing
  binding: string | null;           // "Μαλακό εξώφυλλο" / "Σκληρό εξώφυλλο"
  dimensions: string | null;        // "21Χ14"
  page_count: number | null;        // PageNo
  weight_g: number | null;          // grams
  age_from: number | null;          // target audience (kids' books)
  age_to: number | null;

  // Commercial
  price_eur: number | null;         // parsed from "13.25"
  vat: string | null;

  // Category (top-level "Γενικά βιβλία" bucket — NOT useful for our
  // subcategory mapping; use get_title_subject for granular taxonomy)
  category_id: number | null;
  category: string | null;

  // Description / content
  description: string | null;       // ← from `Summary` field
  contains: string | null;
  specifications: string | null;
  web_address: string | null;
  comments: string | null;

  // Language (with paired IDs for get_language cross-lookup)
  language_id: number | null;
  language: string | null;
  language_original_id: number | null;
  language_original: string | null;
  language_translated_from_id: number | null;
  language_translated_from: string | null;

  // Series / multi-volume
  series: { name: string | null; number: string | null };
  subseries: { name: string | null; number: string | null };
  volume: {
    multi_title: string | null;
    set_isbn: string | null;
    no: string | null;
    count: string | null;
  };

  last_update: string | null;
}

/** Legacy alias — both endpoints return the same shape. */
export type BiblionetMonthTitle = BiblionetTitle;
export type BiblionetTitleDetail = BiblionetTitle;

export interface BiblionetContributor {
  title_id: number;
  title: string;
  contributor_id: number;
  contributor_full_name: string;    // whitespace normalised
  contributor_type_id: number;      // 1=Συγγραφέας, 2=Μετάφραση, 4=Εικονογράφηση, 6=Επιμέλεια, 14=Ευθύνη Σειράς
  contributor_type: string;
  /** Display order — derived from array position (1-based). The raw
   *  PresentOrder field is currently always "1" and isn't reliable. */
  order: number;
  /** Raw PresentOrder field for transparency. */
  present_order_raw: number;
}

export interface BiblionetTitleSubject {
  title_id: number;
  title: string;
  subject_id: number;
  subject_title: string;
  subject_ddc: string | null;
  subject_order: number;
}

export interface BiblionetPerson {
  person_id: number;
  photo_url: string | null;
  name: string | null;
  middle_name: string | null;
  surname: string | null;
  full_name: string;
  born_year: number | null;
  death_year: number | null;
  biography: string | null;
  last_update: string | null;
}

export interface BiblionetCompany {
  company_id: number;
  name: string;
  alternative_name: string | null;
  address: string | null;
  telephone: string | null;
  email: string | null;
  website: string | null;
  last_update: string | null;
}

export interface BiblionetSubject {
  subject_id: number;
  subject_title: string;
  subject_ddc: string | null;
  subject_parent_id: number | null;
}

export interface BiblionetLanguage {
  language_id: number;
  language: string;
}

/* ── Mappers (raw → typed) ─────────────────────────────────── */

function parseFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function normalizeWhitespace(v: unknown): string | null {
  const s = nullIfEmpty(v);
  return s ? s.replace(/\s+/g, " ").trim() : null;
}

/** Extract year from a YYYY-MM-DD string. */
function yearFromDate(v: unknown): number | null {
  const s = nullIfEmpty(v);
  if (!s) return null;
  const m = s.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

function mapTitle(raw: Record<string, unknown>): BiblionetTitle {
  const isbnAlt = [nullIfEmpty(raw.ISBN_2), nullIfEmpty(raw.ISBN_3)].filter(
    (v): v is string => v !== null,
  );
  const firstPublish = nullIfEmpty(raw.FirstPublishDate);
  const publishYear =
    parseIntOrNull(raw.PublishYear) ??
    yearFromDate(firstPublish) ??
    yearFromDate(raw.CurrentPublishDate);
  return {
    title_id: parseIntOrNull(raw.TitlesID) ?? 0,
    cover_url: absoluteImageUrl(raw.CoverImage),
    title: nullIfEmpty(raw.Title) ?? "",
    subtitle: nullIfEmpty(raw.Subtitle),
    parallel_title: nullIfEmpty(raw.ParallelTitle),
    alternative_title: nullIfEmpty(raw.AlternativeTitle),
    original_title: nullIfEmpty(raw.OriginalTitle),
    isbn: nullIfEmpty(raw.ISBN),
    isbn_alt: isbnAlt,
    ismn: nullIfEmpty(raw.ISMN),

    publisher_id: parseIntOrNull(raw.PublisherID),
    publisher: nullIfEmpty(raw.Publisher),

    writer_id: parseIntOrNull(raw.WriterID),
    writer_sort: nullIfEmpty(raw.Writer),
    writer_display: nullIfEmpty(raw.WriterName),

    place_id: parseIntOrNull(raw.PlaceID),
    place: nullIfEmpty(raw.Place),

    publish_year: publishYear,
    publish_month: parseIntOrNull(raw.PublishMonth),
    first_publish_date: firstPublish,
    current_publish_date: nullIfEmpty(raw.CurrentPublishDate),
    future_publish_date: nullIfEmpty(raw.FuturePublishDate),

    title_type: nullIfEmpty(raw.TitleType),
    availability: nullIfEmpty(raw.Availability),
    edition: nullIfEmpty(raw.EditionNo),

    binding: nullIfEmpty(raw.Cover),
    dimensions: nullIfEmpty(raw.Dimensions),
    page_count: parseIntOrNull(raw.PageNo),
    weight_g: parseIntOrNull(raw.Weight),
    age_from: parseIntOrNull(raw.AgeFrom),
    age_to: parseIntOrNull(raw.AgeTo),

    price_eur: parseFloatOrNull(raw.Price),
    vat: nullIfEmpty(raw.VAT),

    category_id: parseIntOrNull(raw.CategoryID),
    category: nullIfEmpty(raw.Category),

    description: nullIfEmpty(raw.Summary),
    contains: nullIfEmpty(raw.Contains),
    specifications: nullIfEmpty(raw.Specifications),
    web_address: nullIfEmpty(raw.WebAddress),
    comments: nullIfEmpty(raw.Comments),

    language_id: parseIntOrNull(raw.LanguageID),
    language: nullIfEmpty(raw.Language),
    language_original_id: parseIntOrNull(raw.LanguageOriginalID),
    language_original: nullIfEmpty(raw.LanguageOriginal),
    language_translated_from_id: parseIntOrNull(raw.LanguageTranslatedFromID),
    language_translated_from: nullIfEmpty(raw.LanguageTranslatedFrom),

    series: {
      name: nullIfEmpty(raw.Series),
      number: nullIfEmpty(raw.SeriesNo),
    },
    subseries: {
      name: nullIfEmpty(raw.SubSeries),
      number: nullIfEmpty(raw.SubSeriesNo),
    },
    volume: {
      multi_title: nullIfEmpty(raw.MultiVolumeTitle),
      set_isbn: nullIfEmpty(raw.SetISBN),
      no: nullIfEmpty(raw.VolumeNo),
      count: nullIfEmpty(raw.VolumeCount),
    },

    last_update: nullIfEmpty(raw.LastUpdate),
  };
}

// Backwards-compat aliases for any older call sites.
const mapMonthTitle = mapTitle;
const mapTitleDetail = mapTitle;

function mapContributor(raw: Record<string, unknown>, index: number): BiblionetContributor {
  return {
    title_id: parseIntOrNull(raw.TitlesID) ?? 0,
    title: nullIfEmpty(raw.Title) ?? "",
    contributor_id: parseIntOrNull(raw.ContributorID) ?? 0,
    contributor_full_name: normalizeWhitespace(raw.ContributorFullName) ?? "",
    contributor_type_id: parseIntOrNull(raw.ContributorTypeID) ?? 0,
    contributor_type: nullIfEmpty(raw.ContributorType) ?? "",
    order: index + 1,
    present_order_raw: parseIntOrNull(raw.PresentOrder) ?? 0,
  };
}

function mapTitleSubject(raw: Record<string, unknown>): BiblionetTitleSubject {
  return {
    title_id: parseIntOrNull(raw.TitlesID) ?? 0,
    title: nullIfEmpty(raw.Titles) ?? nullIfEmpty(raw.Title) ?? "",
    subject_id: parseIntOrNull(raw.SubjectsID) ?? 0,
    subject_title: nullIfEmpty(raw.SubjectTitle) ?? "",
    subject_ddc: nullIfEmpty(raw.SubjectDDC),
    subject_order: parseIntOrNull(raw.SubjectOrder) ?? 0,
  };
}

function mapPerson(raw: Record<string, unknown>): BiblionetPerson {
  const name = nullIfEmpty(raw.Name);
  const middle = nullIfEmpty(raw.MiddleName);
  const surname = nullIfEmpty(raw.Surname);
  const fullName = [name, middle, surname].filter(Boolean).join(" ").trim();
  return {
    person_id: parseIntOrNull(raw.PersonsID) ?? 0,
    photo_url: absoluteImageUrl(raw.Photo),
    name,
    middle_name: middle,
    surname,
    full_name: fullName,
    born_year: parseIntOrNull(raw.BornYear),
    death_year: parseIntOrNull(raw.DeathYear),
    biography: nullIfEmpty(raw.Biography),
    last_update: nullIfEmpty(raw.LastUpdate),
  };
}

function mapCompany(raw: Record<string, unknown>): BiblionetCompany {
  return {
    company_id: parseIntOrNull(raw.ComID) ?? 0,
    name: nullIfEmpty(raw.Title) ?? "",
    alternative_name: nullIfEmpty(raw.AlternativeTitle),
    address: nullIfEmpty(raw.Address),
    telephone: nullIfEmpty(raw.TelephoneNumner) ?? nullIfEmpty(raw.TelephoneNumber),
    email: nullIfEmpty(raw.Email),
    website: nullIfEmpty(raw.Website),
    last_update: nullIfEmpty(raw.LastUpdate),
  };
}

function mapSubject(raw: Record<string, unknown>): BiblionetSubject {
  return {
    subject_id: parseIntOrNull(raw.SubjectsID) ?? 0,
    subject_title: nullIfEmpty(raw.SubjectTitle) ?? "",
    subject_ddc: nullIfEmpty(raw.SubjectDDC),
    subject_parent_id: parseIntOrNull(raw.SubjectParent),
  };
}

function mapLanguage(raw: Record<string, unknown>): BiblionetLanguage {
  return {
    language_id: parseIntOrNull(raw.LangsID) ?? 0,
    language: nullIfEmpty(raw.Language) ?? "",
  };
}

/* ── Public methods ────────────────────────────────────────── */

/**
 * Month firehose — paginated list of titles published/updated in a given
 * year + month. Records appear in reverse chronological order.
 *
 * `perPage` is capped at 50 server-side; we clamp to be safe.
 */
export async function getMonthTitles(opts: {
  year: number;
  month: number;
  page?: number;
  perPage?: number;
}): Promise<BiblionetMonthTitle[]> {
  const perPage = Math.min(50, Math.max(1, opts.perPage ?? 20));
  const page = Math.max(1, opts.page ?? 1);
  const raw = await biblionetPost("get_month_titles", {
    year: String(opts.year),
    month: String(opts.month),
    page: String(page),
    titles_per_page: String(perPage),
  });
  return unwrapList<Record<string, unknown>>(raw).map(mapMonthTitle);
}

/**
 * Title detail — exactly one of `id` / `isbn` / `lastupdate` should be set.
 *
 * Returns the FIRST record from the nested-array response. For lastupdate
 * (which can return multiple records as a delta), use `getTitlesByLastUpdate`.
 *
 * The response is always wrapped in the nested `[[{...}]]` shape, contrary
 * to what the docs claim. Field shape is identical to getMonthTitles rows.
 */
export async function getTitle(opts: {
  id?: number;
  isbn?: string;
  lastupdate?: string;   // 'YYYY-MM-DD'
}): Promise<BiblionetTitle | null> {
  const params: Record<string, unknown> = {};
  if (opts.id != null) params.title = String(opts.id);
  if (opts.isbn) params.isbn = opts.isbn.replace(/-/g, "");
  if (opts.lastupdate) params.lastupdate = opts.lastupdate;

  const raw = await biblionetPost("get_title", params);
  const list = unwrapList<Record<string, unknown>>(raw);
  return list[0] ? mapTitle(list[0]) : null;
}

/** Multi-record version for the lastupdate delta firehose. */
export async function getTitlesByLastUpdate(date: string): Promise<BiblionetTitle[]> {
  const raw = await biblionetPost("get_title", { lastupdate: date });
  return unwrapList<Record<string, unknown>>(raw).map(mapTitle);
}

export async function getContributors(titleId: number): Promise<BiblionetContributor[]> {
  const raw = await biblionetPost("get_contributors", { title: String(titleId) });
  return unwrapList<Record<string, unknown>>(raw).map((r, i) => mapContributor(r, i));
}

export async function getTitleSubjects(titleId: number): Promise<BiblionetTitleSubject[]> {
  const raw = await biblionetPost("get_title_subject", { title: String(titleId) });
  return unwrapList<Record<string, unknown>>(raw).map(mapTitleSubject);
}

export async function getPerson(opts: {
  id?: number;
  lastupdate?: string;
}): Promise<BiblionetPerson[]> {
  const params: Record<string, unknown> = {};
  if (opts.id != null) params.person = String(opts.id);
  if (opts.lastupdate) params.lastupdate = opts.lastupdate;
  const raw = await biblionetPost("get_person", params);
  return unwrapList<Record<string, unknown>>(raw).map(mapPerson);
}

export async function getCompany(opts: {
  id?: number;
  lastupdate?: string;
}): Promise<BiblionetCompany[]> {
  const params: Record<string, unknown> = {};
  if (opts.id != null) params.company = String(opts.id);
  if (opts.lastupdate) params.lastupdate = opts.lastupdate;
  const raw = await biblionetPost("get_company", params);
  return unwrapList<Record<string, unknown>>(raw).map(mapCompany);
}

export async function getSubject(subjectId: number): Promise<BiblionetSubject | null> {
  const raw = await biblionetPost("get_subject", { subject: String(subjectId) });
  const list = unwrapList<Record<string, unknown>>(raw);
  return list[0] ? mapSubject(list[0]) : null;
}

export async function getLanguage(languageId: number): Promise<BiblionetLanguage | null> {
  const raw = await biblionetPost("get_language", { language: String(languageId) });
  const list = unwrapList<Record<string, unknown>>(raw);
  return list[0] ? mapLanguage(list[0]) : null;
}

/* ── Raw passthroughs (smoke-test friendly) ────────────────── */

/** Returns the API response untouched — for inspecting unexpected shapes. */
export async function rawCall(method: string, params: Record<string, unknown>): Promise<unknown> {
  return biblionetPost(method, params);
}
