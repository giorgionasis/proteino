/**
 * One-shot: capitalise the all-lowercase text the K2 migration produced.
 *
 *   npx tsx scripts/fix-text-case.ts --dry-run          # print samples + counts
 *   npx tsx scripts/fix-text-case.ts --backup <file>    # apply; originals → JSON
 *
 * - items.title: first letter upper-cased when it starts lowercase
 *   ("η βασιλική" → "Η βασιλική", "fight club" → "Fight club"). The rest
 *   of the title is untouched.
 * - Person-name columns (writer / director): every word capitalised, but
 *   ONLY when the whole value is lowercase — "DiCaprio"-style names that
 *   already carry capitals are left alone. Particles stay lowercase
 *   (de, van, von, του…).
 *
 * Uses String#toUpperCase (not toLocaleUpperCase("el")): Greek locale
 * upper-casing drops the accent, which is right for ALL-CAPS but wrong
 * for a capitalised initial ("ά" must become "Ά").
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const backupIdx = args.indexOf("--backup");
const BACKUP = backupIdx >= 0 ? args[backupIdx + 1] : null;
if (!DRY && !BACKUP) {
  console.error("Refusing to write without --backup <file> (or use --dry-run).");
  process.exit(1);
}

const PARTICLES = new Set(["de", "da", "di", "del", "della", "der", "den", "van", "von", "du", "la", "le", "y", "e", "και", "του", "της", "των"]);

const capFirst = (s: string) => {
  const chars = [...s];
  const i = chars.findIndex((c) => /\p{L}/u.test(c));
  if (i < 0) return s;
  chars[i] = chars[i].toUpperCase();
  return chars.join("");
};

export function titleCase(title: string): string {
  const first = [...title.trim()].find((c) => /\p{L}/u.test(c));
  if (!first || first !== first.toLowerCase() || first === first.toUpperCase()) return title;
  return capFirst(title);
}

export function nameCase(name: string): string {
  if (name !== name.toLowerCase() || !/\p{L}/u.test(name)) return name;
  // Split keeping separators so commas / hyphens / dots survive.
  return name
    .split(/(\s+|-|,)/)
    .map((tok, i) => (/^\s+$|^-$|^,$/.test(tok) || (i > 0 && PARTICLES.has(tok)) ? tok : capFirst(tok)))
    .join("");
}

async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
    if (error) throw error;
    out.push(...(data as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

type Change = { table: string; key: string; id: string; column: string; before: string; after: string };

async function main() {
  const changes: Change[] = [];

  for (const it of await fetchAll<{ id: string; title: string }>("items", "id, title")) {
    const after = titleCase(it.title ?? "");
    if (after !== it.title) changes.push({ table: "items", key: "id", id: it.id, column: "title", before: it.title, after });
  }

  const NAME_COLUMNS: [string, string][] = [
    ["item_books", "writer"], ["item_movies", "director"], ["item_series", "director"],
    ["item_theater", "writer"], ["item_theater", "director"],
  ];
  for (const [table, column] of NAME_COLUMNS) {
    for (const row of await fetchAll<Record<string, string>>(table, `item_id, ${column}`)) {
      const v = row[column];
      if (typeof v !== "string" || !v.trim()) continue;
      const after = nameCase(v);
      if (after !== v) changes.push({ table, key: "item_id", id: row.item_id, column, before: v, after });
    }
  }

  const byCol = new Map<string, Change[]>();
  for (const c of changes) byCol.set(`${c.table}.${c.column}`, [...(byCol.get(`${c.table}.${c.column}`) ?? []), c]);
  for (const [col, list] of byCol) {
    console.log(`${col}: ${list.length} changes`);
    for (const c of list.slice(0, 5)) console.log(`   "${c.before}" → "${c.after}"`);
  }
  if (DRY) return;

  fs.writeFileSync(BACKUP!, JSON.stringify(changes, null, 1));
  console.log(`backup of ${changes.length} original values → ${BACKUP}`);

  let done = 0;
  for (const c of changes) {
    const { error } = await (sb.from(c.table) as any).update({ [c.column]: c.after }).eq(c.key, c.id);
    if (error) console.error(`  ✖ ${c.table}.${c.column} ${c.id}: ${error.message}`);
    else done++;
  }
  console.log(`applied ${done}/${changes.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
