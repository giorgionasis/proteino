/**
 * MySQL → Supabase migration script for the legacy K2 (Joomla) Proteino DB.
 *
 *   npx tsx scripts/migrate-mysql.ts                       — full migration
 *   npx tsx scripts/migrate-mysql.ts --dry-run             — parse, classify, never write
 *   npx tsx scripts/migrate-mysql.ts --limit-items 50      — cap for spot-checking
 *   npx tsx scripts/migrate-mysql.ts --dump path/to.sql    — override dump location
 *
 * Required env (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * PRE-FLIGHT (run once in Supabase SQL editor before the first non-dry run):
 *   alter table public.items add column if not exists metadata     jsonb default '{}'::jsonb;
 *   alter table public.items add column if not exists poster_url   text;
 *   alter table public.items add column if not exists backdrop_url text;
 *
 *   The schema in supabase/migrations/001_initial_schema.sql currently has only
 *   `cover_url`. This script writes images to `poster_url`/`backdrop_url` per
 *   CLAUDE.md §21, and tags/location to `metadata` per CLAUDE.md §17/§20.
 *
 * Mapping summary (full rules in CATEGORY_RULES below):
 *   K2 13 (βιβλίο)            → category 'books'
 *   K2 17 (κινηματογράφος)    → category 'movies'
 *   K2 18 (ταινία μικρού μήκους) → category 'movies'  (+ tag 'μικρού μήκους')
 *   K2 25 (τηλεόραση)         → category 'series'    (best-fit for tv content)
 *   K2 36 (διατροφή)          → category 'recipes'
 *   K2 53 (διαμονή)           → category 'hotels'
 *   K2 54 (φαγητό)            → category 'food'
 *   K2 55 (διασκέδαση)        → category 'bars'
 *   K2 663 (εκδηλώσεις)       → category 'events'
 *   K2 693 (θέατρο)           → category 'theater'
 *   K2 47, 677, 704, 741, 795, 815 + descendants → SKIP
 *
 *   The user spec uses singular slugs ('book', 'movie'); the schema's check
 *   constraint on items.category requires the plural form, so the script writes
 *   plural. Adjust here if the constraint changes.
 */

import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ─────────────────────────── 1. CONFIG / ENV ─────────────────────────── */

interface CliOptions {
  dryRun: boolean;
  dumpPath: string;
  batchSize: number;
  limitItems: number | null;
  logPath: string;
}

function parseArgs(argv: string[]): CliOptions {
  const get = (name: string) => {
    const idx = argv.indexOf(name);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    dryRun:     argv.includes("--dry-run"),
    dumpPath:   resolve(get("--dump") ?? "docs/giorgion856960_proteino_dataproteino.sql"),
    batchSize:  Number(get("--batch-size") ?? "100"),
    limitItems: get("--limit-items") ? Number(get("--limit-items")) : null,
    logPath:    resolve(get("--log") ?? "scripts/migration-log.json"),
  };
}

function loadEnvLocal(): void {
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

/* ─────────────────────────── 2. LOGGER ─────────────────────────── */

interface MigrationStats {
  users:       { migrated: number; skipped: number; errors: number };
  items:       { migrated: number; skipped: number; errors: number };
  suggestions: { migrated: number; skipped: number; errors: number };
  comments:    { migrated: number; skipped: number; errors: number };
  ratings:     { migrated: number; skipped: number; errors: number };
}

interface MigrationLog {
  startedAt:      string;
  finishedAt:     string;
  dryRun:         boolean;
  stats:          MigrationStats;
  skippedByCategory: Record<string, number>;
  errors:         { entity: string; k2_id: number | string; reason: string }[];
}

const STATS: MigrationStats = {
  users:       { migrated: 0, skipped: 0, errors: 0 },
  items:       { migrated: 0, skipped: 0, errors: 0 },
  suggestions: { migrated: 0, skipped: 0, errors: 0 },
  comments:    { migrated: 0, skipped: 0, errors: 0 },
  ratings:     { migrated: 0, skipped: 0, errors: 0 },
};
const SKIPPED_BY_CATEGORY: Record<string, number> = {};
const ERRORS: MigrationLog["errors"] = [];

function logError(entity: string, k2_id: number | string, reason: string): void {
  ERRORS.push({ entity, k2_id, reason });
  if (ERRORS.length <= 50) console.error(`  ✖ ${entity} ${k2_id}: ${reason}`);
}

function logInfo(msg: string): void { console.log(msg); }
function logStep(msg: string): void { console.log(`\n▸ ${msg}`); }

/* ─────────────────────────── 3. MYSQL DUMP PARSER ─────────────────────────── */
/*
 * We don't need a full SQL parser — only the ability to enumerate INSERT rows
 * for known tables. The state machine handles MySQL's standard escapes inside
 * single-quoted strings: \\, \', \n, \r, \t, \0, \" — that's all phpmyadmin
 * emits. NULL is recognized as a literal; everything else outside quotes is
 * read as a numeric or bareword token.
 */

type SqlValue = string | number | null;

function findStatementEnd(sql: string, from: number): number {
  let i = from, inStr = false;
  while (i < sql.length) {
    const c = sql[i];
    if (inStr) {
      if (c === "\\") { i += 2; continue; }
      if (c === "'")   inStr = false;
      i++;
      continue;
    }
    if (c === "'") { inStr = true; i++; continue; }
    if (c === ";")  return i + 1;
    i++;
  }
  return sql.length;
}

function parseString(sql: string, from: number): { value: string; next: number } {
  let i = from + 1; // skip opening quote
  let out = "";
  while (i < sql.length) {
    const c = sql[i];
    if (c === "\\") {
      const n = sql[i + 1];
      switch (n) {
        case "n":  out += "\n"; break;
        case "r":  out += "\r"; break;
        case "t":  out += "\t"; break;
        case "0":  out += "\0"; break;
        case "\\": out += "\\"; break;
        case "'":  out += "'";  break;
        case '"':  out += '"';  break;
        default:   out += n;    break;
      }
      i += 2;
      continue;
    }
    if (c === "'") return { value: out, next: i + 1 };
    out += c;
    i++;
  }
  throw new Error(`Unterminated string at position ${from}`);
}

function parseBareword(sql: string, from: number): { value: SqlValue; next: number } {
  let i = from;
  while (i < sql.length && !/[,)\s]/.test(sql[i])) i++;
  const tok = sql.slice(from, i).trim();
  if (tok === "NULL" || tok === "null") return { value: null, next: i };
  if (/^-?\d+(\.\d+)?$/.test(tok))      return { value: Number(tok), next: i };
  return { value: tok, next: i };
}

function parseValuesRows(sql: string, from: number, to: number): SqlValue[][] {
  const rows: SqlValue[][] = [];
  let i = from;
  while (i < to) {
    while (i < to && /[\s,;]/.test(sql[i])) i++;
    if (i >= to || sql[i] !== "(") break;
    i++; // skip (
    const row: SqlValue[] = [];
    while (i < to) {
      while (i < to && /\s/.test(sql[i])) i++;
      if (sql[i] === ")") { i++; break; }
      if (sql[i] === "'") {
        const { value, next } = parseString(sql, i);
        row.push(value); i = next;
      } else {
        const { value, next } = parseBareword(sql, i);
        row.push(value); i = next;
      }
      while (i < to && /\s/.test(sql[i])) i++;
      if (sql[i] === ",") { i++; continue; }
      if (sql[i] === ")") { i++; break; }
    }
    rows.push(row);
  }
  return rows;
}

function extractRows(dump: string, table: string): SqlValue[][] {
  const marker = `INSERT INTO \`${table}\``;
  const out: SqlValue[][] = [];
  let pos = 0;
  while (true) {
    const start = dump.indexOf(marker, pos);
    if (start < 0) return out;
    const vIdx = dump.indexOf("VALUES", start);
    if (vIdx < 0) return out;
    const end = findStatementEnd(dump, vIdx);
    const rows = parseValuesRows(dump, vIdx + "VALUES".length, end);
    for (const r of rows) out.push(r);
    pos = end;
  }
}

/* ─────────────────────────── 4. CATEGORY CLASSIFIER ─────────────────────────── */

type TargetSlug = "movies" | "series" | "books" | "food" | "recipes" | "bars" | "hotels" | "theater" | "events";

interface K2Category { id: number; name: string; alias: string; parent: number; }
interface CategoryMatch { slug: TargetSlug; tags: string[]; location: string | null; neighborhood: string | null; }

const SKIP_ROOTS = new Set<number>([
  // Original noise / non-content trees:
  47,   // όροι χρήσης
  677,  // statistics
  704,  // διαδίκτυο  — covers ιστότοπος (705), εφαρμογές (707), παιχνίδια (708), βίντεο (804) transitively
  741,  // dev
  795,  // about us
  815,  // διαγωνισμός

  // Retired content silos — superseded by the new schema's categories.
  // Items under these chains will be reported in skippedByCategory and dropped.
  18,   // ταινία μικρού μήκους (short films)  — covers ντοκιμαντέρ-115 transitively
  27,   // εκπομπές (TV shows under τηλεόραση/25)
  28,   // ντοκιμαντέρ /τηλεόραση/ branch
  422,  // ντοκιμαντέρ /τηλεόραση/τηλεοπτικές σειρές/ — needs explicit skip; not under 28
  38,   // οίνος (wine)  — sibling of recipes under διατροφή/36
  39,   // μπίρα (beer)  — sibling of recipes under διατροφή/36
]);

interface Rule {
  rootIds:    number[];                 // K2 root category ids
  slug:       TargetSlug;
  extraTag?:  string;                   // appended on top of the leaf-category name
  isLocationTree?: boolean;             // root → region → city; tags become location/neighborhood
}

const CATEGORY_RULES: Rule[] = [
  { rootIds: [13],  slug: "books"   },
  { rootIds: [17],  slug: "movies"  },
  // K2 18 (ταινία μικρού μήκους) was previously routed here with an extra tag.
  // It now lives in SKIP_ROOTS — short films are out-of-scope for the new schema.
  { rootIds: [25],  slug: "series"  },
  { rootIds: [36],  slug: "recipes" },
  { rootIds: [53],  slug: "hotels",  isLocationTree: true },
  { rootIds: [54],  slug: "food",    isLocationTree: true },
  { rootIds: [55],  slug: "bars",    isLocationTree: true },
  { rootIds: [663], slug: "events",  isLocationTree: true },
  { rootIds: [693], slug: "theater", isLocationTree: true },
];

class CategoryClassifier {
  private byId = new Map<number, K2Category>();
  private cache = new Map<number, CategoryMatch | "skip" | "unknown">();

  ingest(rows: SqlValue[][]): void {
    for (const r of rows) {
      const id = r[0] as number;
      const name = (r[1] as string) ?? "";
      const alias = (r[2] as string) ?? "";
      const parent = (r[4] as number) ?? 0;
      this.byId.set(id, { id, name, alias, parent });
    }
  }

  size(): number { return this.byId.size; }

  /** Walks parent pointers and returns the chain root → leaf (excluding 0). */
  private chain(id: number): K2Category[] {
    const out: K2Category[] = [];
    const seen = new Set<number>();
    let cur = this.byId.get(id);
    while (cur && !seen.has(cur.id)) {
      out.unshift(cur);
      seen.add(cur.id);
      if (cur.parent === 0) break;
      cur = this.byId.get(cur.parent);
    }
    return out;
  }

  classify(catId: number): CategoryMatch | "skip" | "unknown" {
    const cached = this.cache.get(catId);
    if (cached) return cached;

    const chain = this.chain(catId);
    if (chain.length === 0) {
      this.cache.set(catId, "unknown");
      return "unknown";
    }

    // Skip if any ancestor (including the leaf) is in the skip set.
    if (chain.some((c) => SKIP_ROOTS.has(c.id))) {
      this.cache.set(catId, "skip");
      return "skip";
    }

    // Walk from the leaf up — the FIRST ancestor that matches a rule wins.
    // Important: K2's hierarchy roots at "ψυχαγωγία" / "αναψυχή", but our rules
    // target intermediate nodes like 13 (βιβλίο) or 54 (φαγητό) inside those
    // wrappers. Anchoring on chain[0] would skip everything that lives under
    // those wrappers.
    let ruleIdx = -1;
    let rule: Rule | undefined;
    for (let i = chain.length - 1; i >= 0; i--) {
      const found = CATEGORY_RULES.find((r) => r.rootIds.includes(chain[i].id));
      if (found) { rule = found; ruleIdx = i; break; }
    }
    if (!rule || ruleIdx < 0) {
      this.cache.set(catId, "unknown");
      return "unknown";
    }

    const intermediate = chain.slice(ruleIdx + 1); // descendants of the matched node
    let tags: string[] = [];
    let location: string | null = null;
    let neighborhood: string | null = null;

    if (rule.isLocationTree) {
      // chain shape: root → region → (city) → (item-cat)?
      // The first tier under root is the region (e.g. αττική, κρήτη);
      // the second is a neighborhood/city (e.g. χαλάνδρι, ηράκλειο);
      // anything deeper becomes a tag.
      if (intermediate[0]) location = intermediate[0].name;
      if (intermediate[1]) neighborhood = intermediate[1].name;
      tags = intermediate.slice(2).map((c) => c.name);
    } else {
      tags = intermediate.map((c) => c.name);
    }

    if (rule.extraTag) tags.unshift(rule.extraTag);

    const dedup: string[] = [];
    const seen = new Set<string>();
    for (const t of tags.filter(Boolean)) {
      if (!seen.has(t)) { seen.add(t); dedup.push(t); }
    }
    const match: CategoryMatch = {
      slug: rule.slug,
      tags: dedup,
      location,
      neighborhood,
    };
    this.cache.set(catId, match);
    return match;
  }

  describeChain(catId: number): string {
    return this.chain(catId).map((c) => c.name).join(" › ") || `<unknown #${catId}>`;
  }
}

/* ─────────────────────────── 5. UTILITIES ─────────────────────────── */

const HTML_TAG_RE = /<[^>]+>/g;
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">",
  "&quot;": '"', "&#039;": "'", "&apos;": "'",
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  let out = html.replace(HTML_TAG_RE, " ");
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) {
    out = out.split(ent).join(ch);
  }
  out = out.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  return out.replace(/\s+/g, " ").trim();
}

function slugify(input: string, fallback: string): string {
  // Greek letters are 0x0370–0x03FF; Latin a-z 0-9 plus that range covers our data.
  // Anything else collapses to a dash. K2 already provides clean ASCII aliases
  // for most items, so this only matters for fallback titles.
  const base = (input || "").toLowerCase().trim()
    .replace(/[^a-z0-9Ͱ-Ͽ]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

function uniqueSlug(seen: Set<string>, base: string, k2Id: number): string {
  if (!seen.has(base)) { seen.add(base); return base; }
  const withId = `${base}-${k2Id}`;
  seen.add(withId);
  return withId;
}

const ZERO_DATE_RE = /^0000-00-00/;
function parseMysqlDate(input: SqlValue): string | null {
  if (typeof input !== "string" || !input || ZERO_DATE_RE.test(input)) return null;
  // MySQL "YYYY-MM-DD HH:MM:SS" — interpret as UTC for stability.
  const isoish = input.includes("T") ? input : input.replace(" ", "T") + "Z";
  const d = new Date(isoish);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function tryJsonParse(s: string | null | undefined): unknown {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

/* ─── K2 extra-fields decoder ────────────────────────────────────────────── */
/*
 * K2 stores per-item custom fields in items.extra_fields as a JSON array:
 *   [{id: "94", value: "23510 31895"},
 *    {id: "95", value: ["site", "http://...", "new"]}]
 *
 * Two value shapes:
 *   - string  → textfield / textarea / select option-id
 *   - array   → link [text, url, target]; we keep url
 *
 * Field IDs are stable across the dump and map to columns defined per group
 * in e4q1j_k2_extra_fields. The constants below capture the IDs that carry
 * load-bearing data (phone, address, website, director, …) for our nine
 * target categories. Select-option IDs (food type/cuisine, recipe difficulty)
 * are kept as raw numeric strings — resolving them needs the option lookup
 * table from e4q1j_k2_extra_fields.value, which is a follow-up.
 */
const K2F = {
  // βιβλίο / books — group 4
  BOOK_CATEGORY: 23, BOOK_WRITER: 24, BOOK_ORIGIN_TITLE: 25, BOOK_ENG_TITLE: 26,
  BOOK_LANGUAGE: 27, BOOK_YEAR: 28, BOOK_PUBLISHER: 29,

  // κινηματογράφος / movies — group 5
  MOVIE_CATEGORY: 31, MOVIE_ORIGIN_TITLE: 32, MOVIE_ENG_TITLE: 33,
  MOVIE_DIRECTOR: 34, MOVIE_STARS: 35, MOVIE_COUNTRY: 36, MOVIE_YEAR: 37,
  MOVIE_SITE: 38, MOVIE_IMDB: 39, MOVIE_TRAILER: 40, MOVIE_WATCH: 42,
  MOVIE_AWARDS: 43, MOVIE_SITE_ALT: 208, MOVIE_DURATION: 216,

  // διαμονή / hotels — group 9
  HOTEL_TYPE: 68, HOTEL_CATEGORY: 69, HOTEL_ADDRESS: 72, HOTEL_PHONE: 94,
  HOTEL_SITE: 95, HOTEL_BOOKING: 158, HOTEL_AIRBNB: 198,

  // φαγητό / food — group 10
  FOOD_TYPE: 75, FOOD_CUISINE: 76, FOOD_ADDRESS: 83, FOOD_PHONE: 85,
  FOOD_SITE: 86,

  // διασκέδαση / bars — group 11
  BAR_TYPE: 87, BAR_ADDRESS: 90, BAR_PHONE: 92, BAR_SITE: 93,

  // ξένες σειρές / series — group 12
  SERIES_CATEGORY: 107, SERIES_ORIGIN_TITLE: 108, SERIES_ENG_TITLE: 109,
  SERIES_CREATORS: 110, SERIES_STARS: 111, SERIES_CHANNEL: 112,
  SERIES_PRODUCTION: 113, SERIES_SEASONS: 114, SERIES_EPISODES: 115,
  SERIES_COUNTRY: 116, SERIES_SITE: 117, SERIES_TRAILER: 118,
  SERIES_IMDB: 119, SERIES_GREEK_TITLE: 212,

  // συνταγές / recipes — group 16
  RECIPE_PREP: 134, RECIPE_COOK: 135, RECIPE_YIELDS: 136, RECIPE_DIFFICULTY: 137,
  RECIPE_ORIGIN: 138, RECIPE_WATCH: 162, RECIPE_STEPS: 163, RECIPE_INGREDIENTS: 164,

  // εκδηλώσεις / events — group 19
  EVENT_TYPE: 166, EVENT_ARTIST: 167, EVENT_DATE: 168, EVENT_PRICE: 169,
  EVENT_TICKET: 170, EVENT_TRAILER: 178,

  // θέατρο / theater — group 20
  THEATER_TYPE: 171, THEATER_WRITER: 172, THEATER_DIRECTOR: 173,
  THEATER_ACTORS: 174, THEATER_DATES: 175, THEATER_VENUE: 176,
  THEATER_TRAILER: 177,
} as const;

type K2Fields = Map<number, string>;

function parseK2ExtraFields(jsonStr: string): K2Fields {
  const out: K2Fields = new Map();
  if (!jsonStr) return out;
  let parsed: unknown;
  try { parsed = JSON.parse(jsonStr); } catch { return out; }
  if (!Array.isArray(parsed)) return out;
  for (const entry of parsed as { id?: number | string; value?: unknown }[]) {
    const fid = Number(entry.id);
    if (!Number.isFinite(fid)) continue;
    const v = entry.value;
    if (v == null) continue;
    if (typeof v === "string") {
      const s = v.trim();
      if (s) out.set(fid, s);
    } else if (Array.isArray(v)) {
      // Link tuple: [text, url, target]. Keep the URL for usability;
      // attach the label in a sibling pseudo-id (negative — never collides)
      // so callers that want both can still get it.
      const url = typeof v[1] === "string" ? v[1].trim() : "";
      const label = typeof v[0] === "string" ? v[0].trim() : "";
      if (url) out.set(fid, url);
      if (label && !out.has(-fid)) out.set(-fid, label);
    }
  }
  return out;
}

function k2GetLinkLabel(fields: K2Fields, fieldId: number): string | null {
  return fields.get(-fieldId) ?? null;
}

function splitCsv(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean);
}

function parseIntOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/-?\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function yearToDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = s.match(/(19|20)\d{2}/);
  return m ? `${m[0]}-01-01` : null;
}

function contentHash(parts: (string | number | null | undefined)[]): string {
  return createHash("sha256").update(parts.map((p) => p ?? "").join("␟")).digest("hex");
}

async function chunked<T>(items: T[], size: number, fn: (batch: T[]) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

/* ─────────────────────────── 6. MIGRATORS ─────────────────────────── */

interface UserRow {
  k2_id:        number;
  email:        string;
  name:         string;
  username:     string;
  registerDate: string | null;
  lastvisit:    string | null;
  blocked:      boolean;
}

function projectUserRow(r: SqlValue[]): UserRow | null {
  const k2_id = r[0] as number;
  const name = (r[1] as string) || "";
  const username = (r[2] as string) || "";
  const email = (r[3] as string) || "";
  const block = (r[5] as number) ?? 0;
  if (!email || !email.includes("@")) return null;
  return {
    k2_id,
    email: email.toLowerCase(),
    name: name.trim() || username || email.split("@")[0],
    username: username.trim() || email.split("@")[0],
    registerDate: parseMysqlDate(r[7]),
    lastvisit:    parseMysqlDate(r[8]),
    blocked: block === 1,
  };
}

async function migrateUsers(
  rows: SqlValue[][],
  supabase: SupabaseClient,
  opts: CliOptions,
): Promise<Map<number, string>> {
  logStep(`Migrating users — ${rows.length} K2 rows`);
  const k2ToUuid = new Map<number, string>();
  const usedHandles = new Set<string>();

  // One-shot pre-load of existing auth users so the duplicate-email path is
  // O(1) instead of paginating listUsers per collision. Critical when re-running
  // the migration — without this, a 627-user re-run becomes thousands of API
  // calls.
  const existingByEmail = new Map<string, string>();
  if (!opts.dryRun) {
    logInfo("  pre-loading existing auth users for fast duplicate detection…");
    for (let page = 1; page <= 50; page++) {
      const r = (await supabase.auth.admin.listUsers({ page, perPage: 200 })) as {
        data: { users: { id: string; email: string | null }[] };
        error: { message: string } | null;
      };
      if (r.error) { logError("auth-preload", page, r.error.message); break; }
      const users = r.data?.users ?? [];
      if (users.length === 0) break;
      for (const u of users) if (u.email) existingByEmail.set(u.email.toLowerCase(), u.id);
      if (users.length < 200) break;
    }
    logInfo(`  ${existingByEmail.size} existing auth users loaded`);
  }

  for (const r of rows) {
    const u = projectUserRow(r);
    if (!u) { STATS.users.skipped++; continue; }
    if (u.blocked) { STATS.users.skipped++; continue; }

    let handle = slugify(u.username, `user-${u.k2_id}`);
    if (usedHandles.has(handle)) handle = `${handle}-${u.k2_id}`;
    usedHandles.add(handle);

    if (opts.dryRun) {
      k2ToUuid.set(u.k2_id, "00000000-0000-0000-0000-000000000000");
      STATS.users.migrated++;
      continue;
    }

    // Fast path: this email already has an auth user from a previous run.
    const existingUid = existingByEmail.get(u.email);
    if (existingUid) {
      k2ToUuid.set(u.k2_id, existingUid);
      const ok = await upsertPublicUser(supabase, existingUid, u, handle);
      if (ok) STATS.users.migrated++;
      else    STATS.users.errors++;
      continue;
    }

    // Slow path: create a new auth user.
    const { data, error: authErr } = await supabase.auth.admin.createUser({
      email: u.email,
      email_confirm: true,
      password: randomBytes(24).toString("base64url"),
      user_metadata: { display_name: u.name, source: "k2-migration", k2_id: u.k2_id },
    });
    if (authErr || !data.user) {
      // Race-condition safety: a user could have been created between preload
      // and now (parallel migration). Fall back to listUsers lookup.
      if (authErr && /already.*registered|duplicate/i.test(authErr.message)) {
        const found = await findAuthUserByEmail(supabase, u.email);
        if (found) {
          existingByEmail.set(u.email, found);
          k2ToUuid.set(u.k2_id, found);
          await upsertPublicUser(supabase, found, u, handle);
          STATS.users.migrated++;
          continue;
        }
      }
      logError("user", u.k2_id, authErr?.message ?? "auth admin createUser returned no user");
      STATS.users.errors++;
      continue;
    }

    const uid = data.user.id;
    existingByEmail.set(u.email, uid);
    k2ToUuid.set(u.k2_id, uid);
    const ok = await upsertPublicUser(supabase, uid, u, handle);
    if (ok) STATS.users.migrated++;
    else    STATS.users.errors++;
  }

  return k2ToUuid;
}

async function findAuthUserByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  // Paginate through auth users until we find a match. Supabase admin doesn't
  // expose a "get by email" endpoint as of v2.105.
  for (let page = 1; page <= 20; page++) {
    const result = (await supabase.auth.admin.listUsers({ page, perPage: 200 })) as {
      data: { users: { id: string; email: string | null }[] };
      error: { message: string } | null;
    };
    if (result.error) return null;
    const users = result.data?.users ?? [];
    if (users.length === 0) return null;
    const match = users.find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (users.length < 200) return null;
  }
  return null;
}

async function upsertPublicUser(
  supabase: SupabaseClient,
  id: string,
  u: UserRow,
  handle: string,
): Promise<boolean> {
  const { error } = await supabase.from("users").upsert({
    id,
    email: u.email,
    handle,
    display_name: u.name,
    role: "user",
    is_verified: false,
    created_at: u.registerDate ?? new Date().toISOString(),
    last_login_at: u.lastvisit,
  }, { onConflict: "id" });
  if (error) {
    logError("user", u.k2_id, `public.users upsert: ${error.message}`);
    return false;
  }
  return true;
}

interface ItemRow {
  k2_id:       number;
  title:       string;
  alias:       string;
  catid:       number;
  published:   boolean;
  introtext:   string;
  fulltext:    string;
  extraFields: string;
  created:     string | null;
  modified:    string | null;
  createdBy:   number;
  hits:        number;
  metadesc:    string;
}

function projectItemRow(r: SqlValue[]): ItemRow | null {
  const k2_id = r[0] as number;
  const title = (r[1] as string) || "";
  if (!title.trim()) return null;
  return {
    k2_id,
    title: title.trim(),
    alias: (r[2] as string) || "",
    catid: r[3] as number,
    published: (r[4] as number) === 1,
    introtext:   (r[5] as string) || "",
    fulltext:    (r[6] as string) || "",
    extraFields: (r[9] as string) || "",
    created:     parseMysqlDate(r[11]),
    createdBy:   r[12] as number,
    modified:    parseMysqlDate(r[16]),
    hits:        (r[29] as number) ?? 0,
    metadesc:    (r[31] as string) || "",
  };
}

interface ItemMigrationResult {
  itemIdMap: Map<number, string>;     // k2 item id → supabase uuid
  itemSlugs: Map<number, TargetSlug>; // k2 item id → category slug (for downstream)
}

async function migrateItems(
  rows: SqlValue[][],
  classifier: CategoryClassifier,
  userIdMap: Map<number, string>,
  supabase: SupabaseClient,
  opts: CliOptions,
): Promise<ItemMigrationResult> {
  logStep(`Migrating items — ${rows.length} K2 rows`);
  const itemIdMap = new Map<number, string>();
  const itemSlugs = new Map<number, TargetSlug>();
  const seenSlugs = new Set<string>();

  let processed = 0;
  const batch: { item: Record<string, unknown>; ext: { table: string; row: Record<string, unknown> } | null; k2: ItemRow }[] = [];

  for (const r of rows) {
    if (opts.limitItems !== null && processed >= opts.limitItems) break;
    const it = projectItemRow(r);
    if (!it) { STATS.items.skipped++; continue; }

    const cls = classifier.classify(it.catid);
    if (cls === "skip" || cls === "unknown") {
      STATS.items.skipped++;
      const key = classifier.describeChain(it.catid);
      SKIPPED_BY_CATEGORY[key] = (SKIPPED_BY_CATEGORY[key] ?? 0) + 1;
      continue;
    }

    const slugBase = slugify(it.alias || it.title, `item-${it.k2_id}`);
    const slug = uniqueSlug(seenSlugs, `${cls.slug}/${slugBase}`, it.k2_id);

    const description = stripHtml(it.metadesc) || stripHtml(it.introtext).slice(0, 480);
    const fields = parseK2ExtraFields(it.extraFields);

    const metadata: Record<string, unknown> = {
      tags: cls.tags,
      legacy_k2_id: it.k2_id,
      legacy_alias: it.alias,
      legacy_hits: it.hits,
    };
    if (cls.location)     metadata.location     = cls.location;
    if (cls.neighborhood) metadata.neighborhood = cls.neighborhood;

    enrichMetadataFromFields(metadata, cls.slug, fields);

    // Keep a raw view of fields we DIDN'T promote (select option ids, image
    // refs, etc.) so a follow-up pass can resolve them without re-parsing.
    const rawFields: Record<string, unknown> = {};
    fields.forEach((val, fid) => {
      if (fid < 0) return; // link labels live at -fid; skip
      rawFields[String(fid)] = val;
    });
    if (Object.keys(rawFields).length > 0) metadata.extra_fields_raw = rawFields;

    const itemRow: Record<string, unknown> = {
      id: undefined, // generated by Postgres
      category: cls.slug,
      title: it.title,
      slug,
      description_seo: description.slice(0, 1000) || null,
      cover_url: null,
      poster_url:   posterPathFor(cls.slug, it.k2_id),
      backdrop_url: backdropPathFor(cls.slug, it.k2_id),
      avg_rating: 0,
      rating_count: 0,
      suggestion_count: 0,
      is_published: it.published,
      created_at: it.created ?? new Date().toISOString(),
      modified_at: it.modified ?? it.created ?? new Date().toISOString(),
      metadata,
    };

    const ext = buildExtensionRow(cls.slug, it, metadata, fields);
    batch.push({ item: itemRow, ext, k2: it });
    processed++;
  }

  if (opts.dryRun) {
    for (const b of batch) {
      itemIdMap.set(b.k2.k2_id, "00000000-0000-0000-0000-000000000000");
      itemSlugs.set(b.k2.k2_id, b.item.category as TargetSlug);
      STATS.items.migrated++;
    }
    return { itemIdMap, itemSlugs };
  }

  await chunked(batch, opts.batchSize, async (chunk) => {
    const insertable = chunk.map((c) => {
      const { id: _ignored, ...rest } = c.item;
      void _ignored;
      return rest;
    });
    // Upsert by slug so the script can be re-run safely after a partial
    // success (e.g. when the comment-lookup chunk-size bug surfaced and we
    // need to re-execute just the comments path).
    const { data, error } = await supabase
      .from("items")
      .upsert(insertable, { onConflict: "slug" })
      .select("id, slug");
    if (error || !data) {
      for (const c of chunk) logError("item", c.k2.k2_id, error?.message ?? "no rows returned");
      STATS.items.errors += chunk.length;
      return;
    }
    // Match insertions back to the K2 ids by slug (1-to-1 by construction).
    const slugToId = new Map(data.map((d) => [d.slug as string, d.id as string]));
    const extPayloads: Record<string, Record<string, unknown>[]> = {};
    for (const c of chunk) {
      const id = slugToId.get(c.item.slug as string);
      if (!id) {
        logError("item", c.k2.k2_id, "could not resolve inserted id");
        STATS.items.errors++;
        continue;
      }
      itemIdMap.set(c.k2.k2_id, id);
      itemSlugs.set(c.k2.k2_id, c.item.category as TargetSlug);
      STATS.items.migrated++;
      if (c.ext) {
        const arr = extPayloads[c.ext.table] ?? (extPayloads[c.ext.table] = []);
        arr.push({ ...c.ext.row, item_id: id });
      }
    }
    for (const [table, rows] of Object.entries(extPayloads)) {
      // Upsert on item_id (the PK on every extension table). Lets the script
      // re-run after a partial success — older rows get refreshed with the
      // current decoder's output rather than blocking on a PK collision.
      const { error: extErr } = await supabase.from(table).upsert(rows, { onConflict: "item_id" });
      if (extErr) {
        // Extension-table failure is non-fatal: the base item is still useful.
        logError(table, "(batch)", extErr.message);
      }
    }
  });

  return { itemIdMap, itemSlugs };
}

function posterPathFor(slug: TargetSlug, k2Id: number): string | null {
  // Movies/Series/Books are portrait-natural per CLAUDE.md §21.
  if (slug === "movies" || slug === "series" || slug === "books") {
    return `k2-legacy/${slug}/${k2Id}/poster.jpg`;
  }
  return null;
}
function backdropPathFor(slug: TargetSlug, k2Id: number): string | null {
  if (slug === "food" || slug === "bars" || slug === "hotels" ||
      slug === "events" || slug === "theater" || slug === "recipes") {
    return `k2-legacy/${slug}/${k2Id}/backdrop.jpg`;
  }
  return null;
}

/**
 * Promotes K2 extra-fields into well-known metadata keys that the schema
 * doesn't have a column for (imdb url, original/english title, alt websites,
 * external ticketing labels, etc). Schema-backed columns are populated in
 * buildExtensionRow below — this function is for the rest.
 */
function enrichMetadataFromFields(
  metadata: Record<string, unknown>,
  slug: TargetSlug,
  f: K2Fields,
): void {
  switch (slug) {
    case "movies": {
      const orig = f.get(K2F.MOVIE_ORIGIN_TITLE); if (orig) metadata.original_title = orig;
      const eng  = f.get(K2F.MOVIE_ENG_TITLE);    if (eng)  metadata.english_title  = eng;
      const site = f.get(K2F.MOVIE_SITE);         if (site) metadata.website        = site;
      const alt  = f.get(K2F.MOVIE_SITE_ALT);     if (alt)  metadata.website_alt    = alt;
      const imdb = f.get(K2F.MOVIE_IMDB);         if (imdb) metadata.imdb_url       = imdb;
      const watch= f.get(K2F.MOVIE_WATCH);        if (watch) metadata.watch_url     = watch;
      break;
    }
    case "series": {
      const orig = f.get(K2F.SERIES_ORIGIN_TITLE); if (orig) metadata.original_title = orig;
      const eng  = f.get(K2F.SERIES_ENG_TITLE);    if (eng)  metadata.english_title  = eng;
      const greek= f.get(K2F.SERIES_GREEK_TITLE);  if (greek) metadata.greek_title   = greek;
      const site = f.get(K2F.SERIES_SITE);         if (site) metadata.website        = site;
      const imdb = f.get(K2F.SERIES_IMDB);         if (imdb) metadata.imdb_url       = imdb;
      const eps  = f.get(K2F.SERIES_EPISODES);     if (eps)  metadata.episodes       = eps;
      const prod = f.get(K2F.SERIES_PRODUCTION);   if (prod) metadata.production     = prod;
      break;
    }
    case "books": {
      const orig = f.get(K2F.BOOK_ORIGIN_TITLE); if (orig) metadata.original_title = orig;
      const eng  = f.get(K2F.BOOK_ENG_TITLE);    if (eng)  metadata.english_title  = eng;
      // Book "publisher" link: text becomes publication name (extension col),
      // url goes to metadata for click-through.
      const pubUrl = f.get(K2F.BOOK_PUBLISHER);  if (pubUrl) metadata.publisher_url = pubUrl;
      break;
    }
    case "hotels": {
      const site    = f.get(K2F.HOTEL_SITE);    if (site)    metadata.website     = site;
      const booking = f.get(K2F.HOTEL_BOOKING); if (booking) metadata.booking_url = booking;
      const airbnb  = f.get(K2F.HOTEL_AIRBNB);  if (airbnb)  metadata.airbnb_url  = airbnb;
      const cat     = f.get(K2F.HOTEL_CATEGORY);if (cat)     metadata.hotel_grade = cat;
      break;
    }
    case "food": {
      const site = f.get(K2F.FOOD_SITE); if (site) metadata.website = site;
      break;
    }
    case "bars": {
      const site = f.get(K2F.BAR_SITE); if (site) metadata.website = site;
      break;
    }
    case "theater": {
      const venueLabel = k2GetLinkLabel(f, K2F.THEATER_VENUE);
      const trailer    = f.get(K2F.THEATER_TRAILER);
      if (venueLabel) metadata.venue_label = venueLabel;
      if (trailer)    metadata.trailer_url = trailer;
      break;
    }
    case "events": {
      const trailer = f.get(K2F.EVENT_TRAILER);
      const ticketLabel = k2GetLinkLabel(f, K2F.EVENT_TICKET);
      if (trailer)     metadata.trailer_url = trailer;
      if (ticketLabel) metadata.ticket_label = ticketLabel;
      break;
    }
    case "recipes": {
      const watch = f.get(K2F.RECIPE_WATCH);
      const origin = f.get(K2F.RECIPE_ORIGIN);
      if (watch)  metadata.watch_url  = watch;
      if (origin) metadata.origin_url = origin;
      break;
    }
  }
}

function buildExtensionRow(
  slug: TargetSlug,
  it: ItemRow,
  metadata: Record<string, unknown>,
  f: K2Fields,
): { table: string; row: Record<string, unknown> } | null {
  const plot = stripHtml(it.fulltext) || stripHtml(it.introtext) || null;
  const loc  = (metadata.location as string | undefined) ?? null;
  const hood = (metadata.neighborhood as string | undefined) ?? null;
  // For venue categories, prefer the explicit address text from extra-fields
  // (street + neighborhood); fall back to the category-tree-derived "hood, region".
  const treeAddress = [hood, loc].filter(Boolean).join(", ") || null;

  switch (slug) {
    case "movies": {
      return {
        table: "item_movies",
        row: {
          plot,
          director:     f.get(K2F.MOVIE_DIRECTOR) ?? null,
          duration_min: parseIntOrNull(f.get(K2F.MOVIE_DURATION)),
          release_date: yearToDate(f.get(K2F.MOVIE_YEAR)),
          country:      f.get(K2F.MOVIE_COUNTRY) ?? null,
          trailer_url:  f.get(K2F.MOVIE_TRAILER) ?? null,
          actors:       splitCsv(f.get(K2F.MOVIE_STARS)),
          awards:       f.get(K2F.MOVIE_AWARDS) ? [f.get(K2F.MOVIE_AWARDS)] : [],
        },
      };
    }
    case "series": {
      return {
        table: "item_series",
        row: {
          plot,
          director:    f.get(K2F.SERIES_CREATORS) ?? null,
          seasons:     parseIntOrNull(f.get(K2F.SERIES_SEASONS)),
          country:     f.get(K2F.SERIES_COUNTRY) ?? null,
          channel:     f.get(K2F.SERIES_CHANNEL) ?? null,
          trailer_url: f.get(K2F.SERIES_TRAILER) ?? null,
          actors:      splitCsv(f.get(K2F.SERIES_STARS)),
        },
      };
    }
    case "books": {
      return {
        table: "item_books",
        row: {
          plot,
          writer:           f.get(K2F.BOOK_WRITER) ?? null,
          publication:      k2GetLinkLabel(f, K2F.BOOK_PUBLISHER),
          language:         f.get(K2F.BOOK_LANGUAGE) ?? null,
          publication_year: parseIntOrNull(f.get(K2F.BOOK_YEAR)),
        },
      };
    }
    case "recipes": {
      const ingredientsText = f.get(K2F.RECIPE_INGREDIENTS);
      const stepsText       = f.get(K2F.RECIPE_STEPS);
      // Both arrived as raw textareas — split on newlines so the array shape
      // matches the schema's intended structure.
      const ingredients = ingredientsText
        ? stripHtml(ingredientsText).split(/\n|·|•/).map((x) => x.trim()).filter(Boolean)
        : [];
      const steps = stepsText
        ? stripHtml(stepsText).split(/\n|\d+\.\s/).map((x) => x.trim()).filter(Boolean)
        : [];
      return {
        table: "item_recipes",
        row: {
          tips:        plot,
          yields:      parseIntOrNull(f.get(K2F.RECIPE_YIELDS)),
          level:       f.get(K2F.RECIPE_DIFFICULTY) ?? null,
          duration:    {
            prep_minutes: parseIntOrNull(f.get(K2F.RECIPE_PREP)),
            cook_minutes: parseIntOrNull(f.get(K2F.RECIPE_COOK)),
          },
          ingredients,
          steps,
        },
      };
    }
    case "food": {
      return {
        table: "item_food",
        row: {
          plot,
          type:      f.get(K2F.FOOD_TYPE) ?? null,
          cuisine:   f.get(K2F.FOOD_CUISINE) ?? null,
          address:   f.get(K2F.FOOD_ADDRESS) ?? treeAddress,
          telephone: f.get(K2F.FOOD_PHONE) ?? null,
          delivery_links:   {},
          external_ratings: {},
          information:      f.get(K2F.FOOD_SITE) ? { website: f.get(K2F.FOOD_SITE) } : {},
        },
      };
    }
    case "bars": {
      return {
        table: "item_bars",
        row: {
          plot,
          type:      f.get(K2F.BAR_TYPE) ?? null,
          address:   f.get(K2F.BAR_ADDRESS) ?? treeAddress,
          telephone: f.get(K2F.BAR_PHONE) ?? null,
          external_ratings: {},
          information:      f.get(K2F.BAR_SITE) ? { website: f.get(K2F.BAR_SITE) } : {},
        },
      };
    }
    case "hotels": {
      const info: Record<string, string> = {};
      const site    = f.get(K2F.HOTEL_SITE);    if (site)    info.website     = site;
      const booking = f.get(K2F.HOTEL_BOOKING); if (booking) info.booking_url = booking;
      const airbnb  = f.get(K2F.HOTEL_AIRBNB);  if (airbnb)  info.airbnb_url  = airbnb;
      const grade   = f.get(K2F.HOTEL_CATEGORY);if (grade)   info.grade       = grade;
      return {
        table: "item_hotels",
        row: {
          plot,
          type:      f.get(K2F.HOTEL_TYPE) ?? null,
          address:   f.get(K2F.HOTEL_ADDRESS) ?? treeAddress,
          telephone: f.get(K2F.HOTEL_PHONE) ?? null,
          facilities: [],
          information: info,
          external_ratings: {},
        },
      };
    }
    case "theater": {
      const datesText = f.get(K2F.THEATER_DATES);
      return {
        table: "item_theater",
        row: {
          plot,
          name_place:   k2GetLinkLabel(f, K2F.THEATER_VENUE),
          ticket_url:   f.get(K2F.THEATER_VENUE) ?? null,
          address:      treeAddress,
          type:         f.get(K2F.THEATER_TYPE) ?? null,
          writer:       f.get(K2F.THEATER_WRITER) ?? null,
          director:     f.get(K2F.THEATER_DIRECTOR) ?? null,
          actors:       splitCsv(f.get(K2F.THEATER_ACTORS)),
          availability: datesText ?? null,
          dates:        datesText ? [datesText] : [],
        },
      };
    }
    case "events": {
      const datesText = f.get(K2F.EVENT_DATE);
      const artist    = f.get(K2F.EVENT_ARTIST);
      return {
        table: "item_events",
        row: {
          description:  plot,
          name_place:   k2GetLinkLabel(f, K2F.EVENT_TICKET),
          ticket_url:   f.get(K2F.EVENT_TICKET) ?? null,
          address:      treeAddress,
          event_type:   f.get(K2F.EVENT_TYPE) ?? null,
          price:        f.get(K2F.EVENT_PRICE) ?? null,
          performers:   artist ? splitCsv(artist) : [],
          dates:        datesText ? [datesText] : [],
        },
      };
    }
  }
}

async function migrateSuggestions(
  itemRows: SqlValue[][],
  classifier: CategoryClassifier,
  userIdMap: Map<number, string>,
  itemIdMap: Map<number, string>,
  supabase: SupabaseClient,
  opts: CliOptions,
): Promise<void> {
  logStep("Migrating suggestions (one per legacy item, attributed to created_by)");
  const payload: Record<string, unknown>[] = [];

  for (const r of itemRows) {
    const it = projectItemRow(r);
    if (!it) continue;
    const itemId = itemIdMap.get(it.k2_id);
    if (!itemId) continue; // item was skipped or failed
    const userId = userIdMap.get(it.createdBy);
    if (!userId) {
      // Created_by points at a user we couldn't migrate (deleted, blocked, missing).
      // Skip — a suggestion without an author would violate FK + RLS expectations.
      STATS.suggestions.skipped++;
      continue;
    }

    const reflection = stripHtml(it.introtext) || stripHtml(it.fulltext) || null;

    payload.push({
      user_id: userId,
      item_id: itemId,
      reflection,
      rating: null,
      content_hash: contentHash([userId, itemId, reflection, it.created]),
      is_published: it.published,
      created_at:  it.created  ?? new Date().toISOString(),
      published_at: it.published ? it.created : null,
      modified_at: it.modified ?? it.created ?? new Date().toISOString(),
    });
  }

  if (opts.dryRun) {
    STATS.suggestions.migrated += payload.length;
    return;
  }

  await chunked(payload, opts.batchSize, async (chunk) => {
    // Unique (user_id, item_id) — onConflict ignore so re-runs are idempotent.
    const { error } = await supabase.from("suggestions").upsert(chunk, { onConflict: "user_id,item_id" });
    if (error) {
      logError("suggestions", "(batch)", error.message);
      STATS.suggestions.errors += chunk.length;
    } else {
      STATS.suggestions.migrated += chunk.length;
    }
  });
}

/**
 * Normalised shape used by migrateComments — populated from BOTH
 * e4q1j_k2_comments (K2 native, 3 rows of test data) and
 * e4q1j_jcomment (JComments plugin, 404 real user comments 2018–2023).
 *
 * The plural e4q1j_jcomments table is a redundant subset of e4q1j_jcomment
 * (verified by parser cross-check) — do NOT migrate it or you'll duplicate.
 */
interface CommentInput {
  k2_id:     number;
  itemID:    number;
  userID:    number;
  body:      string;
  date:      string | null;
  published: boolean;
  source:    "k2_comments" | "jcomment";
}

function projectK2Comment(r: SqlValue[]): CommentInput | null {
  // e4q1j_k2_comments columns: id, itemID, userID, userName, commentDate,
  // commentText, commentEmail, commentURL, published
  const body = stripHtml((r[5] as string) || "");
  if (!body) return null;
  return {
    k2_id:     r[0] as number,
    itemID:    r[1] as number,
    userID:    r[2] as number,
    body,
    date:      parseMysqlDate(r[4]),
    published: (r[8] as number) === 1,
    source:    "k2_comments",
  };
}

function projectJComment(r: SqlValue[]): CommentInput | null {
  // e4q1j_jcomment columns (32): id, parent, thread_id, path, level,
  // object_id, object_group, viewname, object_params, lang, userid, name,
  // username, email, homepage, title, comment, ip, date, isgood, ispoor,
  // published, deleted, ...
  if (r[6] !== "com_k2") return null;        // ignore non-K2 objects
  if ((r[22] as number) === 1) return null;  // deleted
  if ((r[10] as number) === 0) return null;  // guest comment — schema requires user_id NOT NULL
  const body = stripHtml((r[16] as string) || "");
  if (!body) return null;
  return {
    k2_id:     r[0] as number,
    itemID:    r[5] as number,
    userID:    r[10] as number,
    body,
    date:      parseMysqlDate(r[18]),
    published: (r[21] as number) === 1,
    source:    "jcomment",
  };
}

async function migrateComments(
  inputs: CommentInput[],
  userIdMap: Map<number, string>,
  itemIdMap: Map<number, string>,
  supabase: SupabaseClient,
  opts: CliOptions,
): Promise<void> {
  const fromK2 = inputs.filter((c) => c.source === "k2_comments").length;
  const fromJC = inputs.filter((c) => c.source === "jcomment").length;
  logStep(`Migrating comments — ${inputs.length} input rows (k2_comments=${fromK2}, jcomment=${fromJC})`);

  // Resolve item_id → suggestion_id once.
  // Chunk size kept small (100) because PostgREST GET URLs holding hundreds
  // of UUIDs in `?item_id=in.(…)` can exceed Supabase's URL-length cap and
  // come back as a silent error. Errors are now logged loudly so any future
  // regression doesn't masquerade as "no suggestions found".
  let itemToSuggestion: Map<string, string> | null = null;
  if (!opts.dryRun && itemIdMap.size > 0) {
    itemToSuggestion = new Map();
    const itemIds = Array.from(itemIdMap.values());
    await chunked(itemIds, 100, async (chunk) => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("id, item_id")
        .in("item_id", chunk);
      if (error) {
        logError("suggestion-lookup", "(batch)", error.message);
        return;
      }
      if (!data) return;
      // K2 has at most one suggestion per item (the creator's), so first match is fine.
      for (const s of data) {
        if (!itemToSuggestion!.has(s.item_id as string)) {
          itemToSuggestion!.set(s.item_id as string, s.id as string);
        }
      }
    });
    logInfo(`  suggestion lookup map built: ${itemToSuggestion.size} entries (from ${itemIds.length} migrated items)`);
  }

  const payload: Record<string, unknown>[] = [];
  for (const c of inputs) {
    if (!c.published) { STATS.comments.skipped++; continue; }

    const itemUuid = itemIdMap.get(c.itemID);
    if (!itemUuid) { STATS.comments.skipped++; continue; }
    const userUuid = userIdMap.get(c.userID);
    if (!userUuid) { STATS.comments.skipped++; continue; }

    const suggestionId = itemToSuggestion?.get(itemUuid);
    if (!opts.dryRun && !suggestionId) {
      logError(`comment(${c.source})`, c.k2_id, "no suggestion exists for legacy item — comment dropped");
      STATS.comments.errors++;
      continue;
    }

    payload.push({
      user_id:       userUuid,
      suggestion_id: suggestionId ?? "00000000-0000-0000-0000-000000000000",
      parent_id:     null,
      body:          c.body,
      created_at:    c.date ?? new Date().toISOString(),
    });
  }

  if (opts.dryRun) {
    STATS.comments.migrated += payload.length;
    return;
  }

  await chunked(payload, opts.batchSize, async (chunk) => {
    const { error } = await supabase.from("comments").insert(chunk);
    if (error) {
      logError("comments", "(batch)", error.message);
      STATS.comments.errors += chunk.length;
    } else {
      STATS.comments.migrated += chunk.length;
    }
  });
}

/**
 * K2 stores ratings as an aggregate (rating_sum, rating_count) per item — not
 * per-user. We can't reconstruct individual rating rows, so instead we update
 * items.avg_rating and items.rating_count directly so the UI shows the right
 * social proof on day one. Future ratings flow into public.ratings normally.
 */
async function migrateRatings(
  rows: SqlValue[][],
  itemIdMap: Map<number, string>,
  supabase: SupabaseClient,
  opts: CliOptions,
): Promise<void> {
  logStep(`Migrating rating aggregates — ${rows.length} K2 rows`);

  const updates: { id: string; avg_rating: number; rating_count: number }[] = [];
  for (const r of rows) {
    const itemID  = r[0] as number;
    const sum     = (r[1] as number) ?? 0;
    const count   = (r[2] as number) ?? 0;
    if (count === 0) { STATS.ratings.skipped++; continue; }
    const itemUuid = itemIdMap.get(itemID);
    if (!itemUuid) { STATS.ratings.skipped++; continue; }
    // K2 sums on a 0–5 scale where rating_sum is sum of (vote * count) — but
    // historically the front-end mapped each vote to 0–5 directly. avg = sum/count.
    const avg = Math.max(0, Math.min(5, sum / count));
    updates.push({ id: itemUuid, avg_rating: Number(avg.toFixed(2)), rating_count: count });
  }

  if (opts.dryRun) {
    STATS.ratings.migrated += updates.length;
    return;
  }

  // No bulk-update RPC, so we issue one UPDATE per item. Fast enough for ~10k rows.
  for (const u of updates) {
    const { error } = await supabase
      .from("items")
      .update({ avg_rating: u.avg_rating, rating_count: u.rating_count })
      .eq("id", u.id);
    if (error) {
      logError("rating", u.id, error.message);
      STATS.ratings.errors++;
    } else {
      STATS.ratings.migrated++;
    }
  }
}

/* ─────────────────────────── 7. MAIN ─────────────────────────── */

async function main(): Promise<void> {
  loadEnvLocal();
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.dryRun) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — aborting.");
      process.exit(1);
    }
  }

  if (!existsSync(opts.dumpPath)) {
    console.error(`Dump not found: ${opts.dumpPath}`);
    process.exit(1);
  }

  logInfo(`Mode:       ${opts.dryRun ? "DRY-RUN (no writes)" : "LIVE"}`);
  logInfo(`Dump:       ${opts.dumpPath}`);
  logInfo(`Batch size: ${opts.batchSize}${opts.limitItems ? `, limit-items=${opts.limitItems}` : ""}`);

  const supabase = opts.dryRun
    ? (null as unknown as SupabaseClient)
    : createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

  logStep(`Reading dump (${(readFileSync(opts.dumpPath).length / 1024 / 1024).toFixed(1)} MB)`);
  const dump = readFileSync(opts.dumpPath, "utf8");

  // ── Pass 1: build category classifier ──
  logStep("Building category classifier");
  const classifier = new CategoryClassifier();
  classifier.ingest(extractRows(dump, "e4q1j_k2_categories"));
  logInfo(`  ${classifier.size()} K2 categories indexed`);

  // ── Pass 2: users (in-memory only collected first; inserted in this step) ──
  const userRows = extractRows(dump, "e4q1j_users");
  const userIdMap = await migrateUsers(userRows, supabase, opts);

  // ── Pass 3: items + extension tables ──
  const itemRows = extractRows(dump, "e4q1j_k2_items");
  const { itemIdMap } = await migrateItems(itemRows, classifier, userIdMap, supabase, opts);

  // ── Pass 4: suggestions (one per item, by created_by) ──
  await migrateSuggestions(itemRows, classifier, userIdMap, itemIdMap, supabase, opts);

  // ── Pass 5: comments ──
  // Two source tables: K2 native (e4q1j_k2_comments, ~3 test rows) and the
  // JComments plugin (e4q1j_jcomment, ~404 real user comments 2018–2023).
  // We DO NOT read e4q1j_jcomments (plural) — verified to be a redundant
  // subset of the singular table.
  const commentInputs: CommentInput[] = [];
  for (const r of extractRows(dump, "e4q1j_k2_comments")) {
    const c = projectK2Comment(r);
    if (c) commentInputs.push(c);
  }
  for (const r of extractRows(dump, "e4q1j_jcomment")) {
    const c = projectJComment(r);
    if (c) commentInputs.push(c);
  }
  await migrateComments(commentInputs, userIdMap, itemIdMap, supabase, opts);

  // ── Pass 6: rating aggregates ──
  const ratingRows = extractRows(dump, "e4q1j_k2_rating");
  await migrateRatings(ratingRows, itemIdMap, supabase, opts);

  // ── Final report ──
  const log: MigrationLog = {
    startedAt:         new Date().toISOString(),
    finishedAt:        new Date().toISOString(),
    dryRun:            opts.dryRun,
    stats:             STATS,
    skippedByCategory: SKIPPED_BY_CATEGORY,
    errors:            ERRORS,
  };
  writeFileSync(opts.logPath, JSON.stringify(log, null, 2), "utf8");

  console.log("\n========== SUMMARY ==========");
  for (const [k, v] of Object.entries(STATS)) {
    console.log(`  ${k.padEnd(12)} migrated=${v.migrated}  skipped=${v.skipped}  errors=${v.errors}`);
  }
  const topSkips = Object.entries(SKIPPED_BY_CATEGORY).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (topSkips.length > 0) {
    console.log("\n  Top skipped category chains:");
    for (const [chain, n] of topSkips) console.log(`    ${n.toString().padStart(5)}  ${chain}`);
  }
  if (ERRORS.length > 0) console.log(`\n  ${ERRORS.length} error(s) — see ${opts.logPath} for details.`);
  console.log(`\nFull log: ${opts.logPath}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
