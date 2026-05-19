/**
 * Subject discovery — sample recent Biblionet books, aggregate subjects,
 * show distribution by DDC hundred so we can design a crosswalk to our
 * 11 subcategories.
 *
 *   npx tsx scripts/discover-biblionet-subjects.ts                 # default: last 3 months, 50 books/month
 *   npx tsx scripts/discover-biblionet-subjects.ts --months=6
 *   npx tsx scripts/discover-biblionet-subjects.ts --per-month=20  # faster, less coverage
 *   npx tsx scripts/discover-biblionet-subjects.ts --concurrency=8 # parallel get_title_subject calls
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getMonthTitles, getTitleSubjects, type BiblionetTitleSubject } from "../lib/enrichment/biblionet";

/* env */
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

/* args */
const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) args.set(m[1], m[2] ?? "true");
}
const MONTHS_BACK = parseInt(args.get("months") ?? "3", 10);
const PER_MONTH = Math.min(50, parseInt(args.get("per-month") ?? "50", 10));
const CONCURRENCY = Math.max(1, parseInt(args.get("concurrency") ?? "5", 10));

/* ── ANSI ──────────────────────────────────────────────────── */
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CORAL = "\x1b[38;5;209m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const ZINC = "\x1b[90m";

const DDC_LABELS: Record<string, string> = {
  "0": "General works / Computer science",
  "1": "Philosophy & psychology",
  "2": "Religion",
  "3": "Social sciences (incl. education, law)",
  "4": "Language",
  "5": "Science (math, biology, physics)",
  "6": "Technology (medicine, engineering, business)",
  "7": "Arts & recreation",
  "8": "Literature",
  "9": "History & geography",
};

function ddcHundred(ddc: string | null): string {
  if (!ddc) return "—";
  const first = ddc.trim().charAt(0);
  return /[0-9]/.test(first) ? first : "—";
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch (err) {
        out[idx] = err as R;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

/* ── main ──────────────────────────────────────────────────── */

interface SubjectStat {
  subject_id: number;
  subject_title: string;
  ddc: string | null;
  ddc_hundred: string;
  count: number;
  examples: string[];   // sample book titles
}

async function main(): Promise<void> {
  if (!process.env.BIBLIONET_USERNAME || !process.env.BIBLIONET_PASSWORD) {
    console.error(`${RED}✗ BIBLIONET_USERNAME/PASSWORD missing from .env.local${RESET}`);
    process.exit(1);
  }

  console.log(`${BOLD}Biblionet subject discovery${RESET}`);
  console.log(`${ZINC}scanning last ${MONTHS_BACK} months, ${PER_MONTH} books/month, concurrency=${CONCURRENCY}${RESET}\n`);

  // 1. Collect book ids from N most recent months
  const allBooks: { title_id: number; title: string }[] = [];
  const now = new Date();
  for (let m = 1; m <= MONTHS_BACK; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = d.getFullYear();
    const mo = d.getMonth() + 1;
    process.stdout.write(`${DIM}→ get_month_titles ${y}-${String(mo).padStart(2, "0")}...${RESET} `);
    try {
      const titles = await getMonthTitles({ year: y, month: mo, perPage: PER_MONTH, page: 1 });
      console.log(`${GREEN}${titles.length}${RESET}`);
      for (const t of titles) {
        if (t.title_id) allBooks.push({ title_id: t.title_id, title: t.title });
      }
    } catch (err) {
      console.log(`${RED}✗ ${(err as Error).message}${RESET}`);
    }
  }
  console.log(`\n${BOLD}Total books to probe: ${allBooks.length}${RESET}\n`);

  // 2. Fetch subjects per book (parallel with cap)
  console.log(`${DIM}Fetching get_title_subject per book...${RESET}`);
  const t0 = Date.now();
  let done = 0;
  const subjectsPerBook = await mapLimit(allBooks, CONCURRENCY, async (b) => {
    try {
      const subjects = await getTitleSubjects(b.title_id);
      done++;
      if (done % 10 === 0) process.stdout.write(`${ZINC}.${RESET}`);
      return { book: b, subjects };
    } catch {
      done++;
      return { book: b, subjects: [] as BiblionetTitleSubject[] };
    }
  });
  console.log(`\n${GREEN}✓${RESET} ${done} books probed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 3. Aggregate
  const stats = new Map<number, SubjectStat>();
  for (const { book, subjects } of subjectsPerBook) {
    for (const s of subjects) {
      let stat = stats.get(s.subject_id);
      if (!stat) {
        stat = {
          subject_id: s.subject_id,
          subject_title: s.subject_title,
          ddc: s.subject_ddc,
          ddc_hundred: ddcHundred(s.subject_ddc),
          count: 0,
          examples: [],
        };
        stats.set(s.subject_id, stat);
      }
      stat.count++;
      if (stat.examples.length < 3 && book.title) stat.examples.push(book.title);
    }
  }

  const allStats = [...stats.values()].sort((a, b) => b.count - a.count);
  console.log(
    `\n${BOLD}Distinct subjects:${RESET} ${allStats.length}  ` +
      `${ZINC}(across ${allBooks.length} books = ${(allStats.length / allBooks.length).toFixed(2)} unique subjects per book)${RESET}\n`,
  );

  // 4. Group by DDC hundred
  console.log(`${BOLD}${CORAL}═══ Subjects by DDC hundred ═══${RESET}\n`);
  const byHundred = new Map<string, SubjectStat[]>();
  for (const s of allStats) {
    const arr = byHundred.get(s.ddc_hundred) ?? [];
    arr.push(s);
    byHundred.set(s.ddc_hundred, arr);
  }
  const orderedHundreds = ["8", "9", "1", "6", "7", "3", "5", "2", "4", "0", "—"];
  for (const h of orderedHundreds) {
    const subs = byHundred.get(h);
    if (!subs || subs.length === 0) continue;
    const totalBooks = subs.reduce((acc, s) => acc + s.count, 0);
    const label = DDC_LABELS[h] ?? "Unknown / no DDC";
    console.log(`${BOLD}${CORAL}DDC ${h}xx — ${label}${RESET}  ${ZINC}(${subs.length} subjects, ${totalBooks} book-subject hits)${RESET}`);
    for (const s of subs.slice(0, 25)) {
      const ddc = s.ddc ?? "—";
      const ex = s.examples[0] ? `${ZINC}  ↳ ${s.examples[0]}${RESET}` : "";
      console.log(`  ${BOLD}${String(s.count).padStart(3)}×${RESET}  ${ZINC}DDC ${ddc.padEnd(8)}${RESET}  ${s.subject_title}${ex}`);
    }
    if (subs.length > 25) {
      console.log(`  ${ZINC}…(+${subs.length - 25} more)${RESET}`);
    }
    console.log("");
  }

  // 5. Save full dump to file for downstream use
  const outPath = resolve("scripts/biblionet-subjects-sample.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        scanned_at: new Date().toISOString(),
        months_back: MONTHS_BACK,
        per_month: PER_MONTH,
        books_probed: allBooks.length,
        distinct_subjects: allStats.length,
        subjects: allStats,
      },
      null,
      2,
    ),
  );
  console.log(`${GREEN}✓${RESET} Full data → ${outPath}`);
}

main().catch((err) => {
  console.error(`${RED}Fatal:${RESET}`, err);
  process.exit(1);
});
