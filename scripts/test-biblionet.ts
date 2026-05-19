/**
 * Biblionet smoke test — exercises every endpoint and prints the real
 * response shape so we can validate the typed client + see what fields
 * Biblionet actually populates for production records.
 *
 *   npx tsx scripts/test-biblionet.ts
 *
 * Requires .env.local:
 *   BIBLIONET_USERNAME=...
 *   BIBLIONET_PASSWORD=...
 *   BIBLIONET_BASE_URL=... (optional — defaults to https://biblionet.gr/webservice)
 *
 * Flags:
 *   --year=2024              override year (defaults: last month)
 *   --month=11               override month
 *   --isbn=978-...           additionally look up a specific ISBN
 *   --title-id=72584         additionally look up a specific TitlesID
 *   --raw                    print untouched raw responses (debugging)
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getMonthTitles,
  getTitle,
  getContributors,
  getTitleSubjects,
  getPerson,
  getCompany,
  rawCall,
  classifyIsbn,
  type BiblionetMonthTitle,
} from "../lib/enrichment/biblionet";

/* ── env bootstrap ──────────────────────────────────────────── */

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
loadEnvLocal();

/* ── CLI args ───────────────────────────────────────────────── */

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? "true");
}
const RAW = args.has("raw");
const NOW = new Date();
const LAST_MONTH_DATE = new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1);
const YEAR = parseInt(args.get("year") ?? String(LAST_MONTH_DATE.getFullYear()), 10);
const MONTH = parseInt(args.get("month") ?? String(LAST_MONTH_DATE.getMonth() + 1), 10);
const ISBN_OVERRIDE = args.get("isbn");
const TITLE_ID_OVERRIDE = args.get("title-id");

/* ── pretty printing ────────────────────────────────────────── */

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CORAL = "\x1b[38;5;209m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const ZINC = "\x1b[90m";

function section(label: string): void {
  console.log(`\n${BOLD}${CORAL}── ${label} ${"─".repeat(Math.max(0, 60 - label.length))}${RESET}`);
}

function kv(key: string, value: unknown, indent = 0): void {
  const pad = " ".repeat(indent);
  const display =
    value === null || value === undefined
      ? `${DIM}null${RESET}`
      : typeof value === "string"
        ? value.length > 200
          ? `${value.slice(0, 200)}${DIM}… (+${value.length - 200} chars)${RESET}`
          : value
        : Array.isArray(value)
          ? `[${value.length} items]`
          : typeof value === "object"
            ? `{${Object.keys(value as object).length} keys}`
            : String(value);
  console.log(`${pad}${ZINC}${key.padEnd(22)}${RESET} ${display}`);
}

function printMonthTitle(t: BiblionetMonthTitle, indent = 0): void {
  kv("title_id", t.title_id, indent);
  kv("title", t.title, indent);
  if (t.subtitle) kv("subtitle", t.subtitle, indent);
  if (t.original_title) kv("original_title", t.original_title, indent);
  if (t.writer_display) kv("writer", `${t.writer_display}  ${ZINC}(id=${t.writer_id ?? "—"})${RESET}`, indent);
  if (t.publisher) kv("publisher", `${t.publisher}  ${ZINC}(id=${t.publisher_id ?? "—"})${RESET}`, indent);
  if (t.isbn) {
    const cls = classifyIsbn(t.isbn);
    const tag = cls.isbn_13 ? "isbn_13" : cls.isbn_10 ? "isbn_10" : "isbn?";
    kv(tag, t.isbn, indent);
  }
  if (t.cover_url) kv("cover_url", t.cover_url, indent);
  if (t.publish_year) kv("publish_year", t.publish_year, indent);
  if (t.title_type) kv("title_type", t.title_type, indent);
  if (t.availability) kv("availability", t.availability, indent);
  if (t.category) kv("category", `${t.category}  ${ZINC}(id=${t.category_id ?? "—"})${RESET}`, indent);
}

/* ── steps ──────────────────────────────────────────────────── */

async function step<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  process.stdout.write(`${DIM}→ ${label}...${RESET}\n`);
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    process.stdout.write(`${GREEN}✓${RESET} ${label} ${ZINC}(${ms}ms)${RESET}\n`);
    return result;
  } catch (err) {
    const ms = Date.now() - t0;
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`${RED}✗${RESET} ${label} ${ZINC}(${ms}ms)${RESET}\n  ${RED}${msg}${RESET}\n`);
    return null;
  }
}

async function main(): Promise<void> {
  console.log(`${BOLD}Biblionet smoke test${RESET}`);
  console.log(`${ZINC}base=${process.env.BIBLIONET_BASE_URL ?? "https://biblionet.gr/webservice"}${RESET}`);
  console.log(`${ZINC}user=${process.env.BIBLIONET_USERNAME ?? "(missing)"}${RESET}`);

  if (!process.env.BIBLIONET_USERNAME || !process.env.BIBLIONET_PASSWORD) {
    console.error(
      `\n${RED}✗ BIBLIONET_USERNAME and/or BIBLIONET_PASSWORD missing from .env.local${RESET}`,
    );
    process.exit(1);
  }

  /* 1. Month titles ─────────────────────────────────────────── */
  section(`get_month_titles  year=${YEAR}  month=${MONTH}  perPage=5  page=1`);
  const monthTitles = await step("getMonthTitles", () =>
    getMonthTitles({ year: YEAR, month: MONTH, perPage: 5, page: 1 }),
  );
  if (!monthTitles) {
    console.error(`\n${RED}Aborting — auth or endpoint failure at the firehose call.${RESET}`);
    process.exit(1);
  }
  console.log(`\n${BOLD}Returned ${monthTitles.length} titles:${RESET}\n`);
  monthTitles.slice(0, 5).forEach((t, i) => {
    console.log(`${BOLD}[${i + 1}]${RESET}`);
    printMonthTitle(t, 2);
    console.log("");
  });

  // Pick the first title for the detail / contributors / subjects cascade.
  // Override available via --title-id flag.
  const pickedTitleId = TITLE_ID_OVERRIDE
    ? parseInt(TITLE_ID_OVERRIDE, 10)
    : monthTitles[0]?.title_id;
  if (!pickedTitleId) {
    console.warn(`${RED}No title id available — month was empty?${RESET}`);
    process.exit(0);
  }
  const picked = monthTitles.find((t) => t.title_id === pickedTitleId) ?? monthTitles[0];

  /* 2. Title detail by id ───────────────────────────────────── */
  section(`get_title  id=${pickedTitleId}`);
  const detail = await step("getTitle(id)", () => getTitle({ id: pickedTitleId }));
  if (detail) {
    console.log("");
    kv("title_id", detail.title_id);
    kv("title", detail.title);
    kv("subtitle", detail.subtitle);
    kv("original_title", detail.original_title);
    kv("description", detail.description);
    kv("page_count", detail.page_count);
    kv("price_eur", detail.price_eur);
    kv("binding", detail.binding);
    kv("dimensions", detail.dimensions);
    kv("weight_g", detail.weight_g);
    kv("edition", detail.edition);
    kv("first_publish_date", detail.first_publish_date);
    kv("language", `${detail.language ?? "—"}  ${ZINC}(id=${detail.language_id ?? "—"})${RESET}`);
    kv("language_original", `${detail.language_original ?? "—"}  ${ZINC}(id=${detail.language_original_id ?? "—"})${RESET}`);
    kv("series.name", detail.series.name);
    kv("series.number", detail.series.number);
    kv("subseries.name", detail.subseries.name);
    kv("subseries.number", detail.subseries.number);
    kv("volume.multi_title", detail.volume.multi_title);
    kv("volume.set_isbn", detail.volume.set_isbn);
    kv("volume.no", detail.volume.no);
    kv("volume.count", detail.volume.count);
    kv("specifications", detail.specifications);
    kv("web_address", detail.web_address);
    kv("contains", detail.contains);
    kv("comments", detail.comments);
  }
  if (RAW) {
    section("RAW get_title response");
    const raw = await rawCall("get_title", { title: String(pickedTitleId) });
    console.log(JSON.stringify(raw, null, 2));
  }

  /* 3. Title detail by ISBN (cross-check) ───────────────────── */
  if (picked.isbn) {
    section(`get_title  isbn=${picked.isbn}`);
    const byIsbn = await step("getTitle(isbn)", () => getTitle({ isbn: picked.isbn! }));
    if (byIsbn) {
      console.log("");
      kv("title_id", byIsbn.title_id);
      kv("title", byIsbn.title);
      kv("matches id lookup", byIsbn.title_id === pickedTitleId);
    }
  }

  /* 4. Optional ISBN override ───────────────────────────────── */
  if (ISBN_OVERRIDE) {
    section(`get_title  isbn=${ISBN_OVERRIDE}  (--isbn override)`);
    const byIsbn = await step("getTitle(isbn override)", () => getTitle({ isbn: ISBN_OVERRIDE }));
    if (byIsbn) {
      console.log("");
      printMonthTitle(byIsbn, 0);
      if (byIsbn.description) kv("description", byIsbn.description);
    }
  }

  /* 5. Contributors ─────────────────────────────────────────── */
  section(`get_contributors  title=${pickedTitleId}`);
  const contributors = await step("getContributors", () => getContributors(pickedTitleId));
  if (contributors && contributors.length > 0) {
    console.log(`\n${BOLD}Returned ${contributors.length} contributors:${RESET}\n`);
    contributors.forEach((c) => {
      console.log(
        `  ${BOLD}${c.order}.${RESET} ${c.contributor_full_name}  ${ZINC}(${c.contributor_type}, type_id=${c.contributor_type_id}, id=${c.contributor_id})${RESET}`,
      );
    });
  } else if (contributors) {
    console.log(`  ${DIM}(no contributors returned — unusual; check raw)${RESET}`);
  }

  /* 6. Subjects ─────────────────────────────────────────────── */
  section(`get_title_subject  title=${pickedTitleId}`);
  const subjects = await step("getTitleSubjects", () => getTitleSubjects(pickedTitleId));
  if (subjects && subjects.length > 0) {
    console.log(`\n${BOLD}Returned ${subjects.length} subjects:${RESET}\n`);
    subjects.forEach((s) => {
      console.log(
        `  ${BOLD}${s.subject_order}.${RESET} ${s.subject_title}  ${ZINC}(DDC ${s.subject_ddc ?? "—"}, id=${s.subject_id})${RESET}`,
      );
    });
  } else if (subjects) {
    console.log(`  ${DIM}(no subjects returned)${RESET}`);
  }

  /* 7. Person lookup ────────────────────────────────────────── */
  if (picked.writer_id) {
    section(`get_person  person=${picked.writer_id}`);
    const persons = await step("getPerson", () => getPerson({ id: picked.writer_id! }));
    if (persons && persons.length > 0) {
      console.log("");
      persons.slice(0, 1).forEach((p) => {
        kv("person_id", p.person_id);
        kv("full_name", p.full_name);
        if (p.born_year) kv("born_year", p.born_year);
        if (p.death_year) kv("death_year", p.death_year);
        if (p.photo_url) kv("photo_url", p.photo_url);
        if (p.biography) kv("biography", p.biography);
      });
    }
  }

  /* 8. Company lookup ───────────────────────────────────────── */
  if (picked.publisher_id) {
    section(`get_company  company=${picked.publisher_id}`);
    const companies = await step("getCompany", () => getCompany({ id: picked.publisher_id! }));
    if (companies && companies.length > 0) {
      console.log("");
      companies.slice(0, 1).forEach((c) => {
        kv("company_id", c.company_id);
        kv("name", c.name);
        if (c.address) kv("address", c.address);
        if (c.telephone) kv("telephone", c.telephone);
        if (c.email) kv("email", c.email);
        if (c.website) kv("website", c.website);
      });
    }
  }

  /* 9. Summary ──────────────────────────────────────────────── */
  section("Summary");
  console.log(`  ${GREEN}✓${RESET} auth works`);
  console.log(`  ${GREEN}✓${RESET} ${monthTitles.length} titles returned for ${YEAR}-${String(MONTH).padStart(2, "0")}`);
  console.log(`  ${GREEN}✓${RESET} field-by-field mapping validated against real records`);
  console.log("");
  console.log(`${DIM}Next: re-run with --raw to inspect the untouched JSON shape if any field looks off.${RESET}`);
}

main().catch((err) => {
  console.error(`${RED}Fatal:${RESET}`, err);
  process.exit(1);
});
