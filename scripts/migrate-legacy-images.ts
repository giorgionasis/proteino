/**
 * One-shot: copy K2 item images off the old Joomla server into Supabase
 * Storage through the "store whole, crop on display" pipeline
 * (lib/item-image-upload.ts → storeMainImage).
 *
 *   npx tsx scripts/migrate-legacy-images.ts --dry-run
 *   npx tsx scripts/migrate-legacy-images.ts --limit 20
 *   npx tsx scripts/migrate-legacy-images.ts --report /tmp/report.json
 *
 * Resumable: only items whose poster_url/backdrop_url still point at a
 * `k2-legacy/…` placeholder are picked up. Must run BEFORE the old server
 * (www.proteino.gr) is switched off — it is the only copy of these files.
 *
 * Source: K2 keeps the original upload at
 *   /media/k2/items/src/md5("Image" + k2_id).jpg
 * with the XL cache as fallback. Items with no source anywhere get their
 * dead k2-legacy columns nulled so surfaces render a clean placeholder.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { storeMainImage } from "../lib/item-image-upload";

config({ path: ".env.local" });

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };

const DRY = flag("dry-run");
const LIMIT = Number(opt("limit") ?? Infinity);
const CONCURRENCY = Number(opt("concurrency") ?? 3);
const ONLY = opt("only"); // single item slug (reprocessed even if already migrated)
const REPORT = opt("report");

const OLD_ORIGIN = "https://www.proteino.gr";
const PORTRAIT = new Set(["movies", "series", "books"]);

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface Row {
  id: string; slug: string; category: string;
  poster_url: string | null; backdrop_url: string | null; k2: string | null;
}

const isLegacy = (u: string | null) => !!u && u.startsWith("k2-legacy/");

async function fetchSource(k2: string): Promise<Buffer | null> {
  const hash = createHash("md5").update(`Image${k2}`).digest("hex");
  for (const path of [`/media/k2/items/src/${hash}.jpg`, `/media/k2/items/cache/${hash}_XL.jpg`]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(OLD_ORIGIN + path, { signal: AbortSignal.timeout(20_000) });
        if (res.status === 404) break;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get("content-type") ?? "";
        if (!type.startsWith("image/")) break;
        return Buffer.from(await res.arrayBuffer());
      } catch {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  return null;
}

async function main() {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let q = sb
      .from("items")
      .select("id, slug, category, poster_url, backdrop_url, k2:metadata->>legacy_k2_id")
      .order("id")
      .range(from, from + 999);
    // --only reprocesses one item even if it was already migrated.
    q = ONLY ? q.eq("slug", ONLY) : q.or("poster_url.like.k2-legacy/%,backdrop_url.like.k2-legacy/%");
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...(data as Row[]));
    if (data.length < 1000) break;
  }
  const todo = rows.slice(0, LIMIT);
  console.log(`${rows.length} items still on k2-legacy paths; processing ${todo.length}${DRY ? " (dry run)" : ""}`);

  const report = { done: [] as string[], missing: [] as string[], failed: [] as { slug: string; error: string }[] };
  let next = 0;
  let bytesIn = 0;

  async function worker() {
    while (next < todo.length) {
      const it = todo[next++];
      try {
        const src = it.k2 ? await fetchSource(it.k2) : null;
        if (!src) {
          report.missing.push(it.slug);
          if (!DRY) {
            await (sb.from("items") as any).update({
              poster_url: isLegacy(it.poster_url) ? null : it.poster_url,
              backdrop_url: isLegacy(it.backdrop_url) ? null : it.backdrop_url,
            }).eq("id", it.id);
          }
          continue;
        }
        bytesIn += src.length;
        if (!DRY) {
          const portrait = PORTRAIT.has(it.category);
          await storeMainImage(sb, it.id, src, { portrait });
          // storeMainImage set the category's column; clear the other one
          // if it is still a dead k2-legacy placeholder.
          const other = portrait ? "backdrop_url" : "poster_url";
          if (isLegacy(it[other])) await (sb.from("items") as any).update({ [other]: null }).eq("id", it.id);
        }
        report.done.push(it.slug);
      } catch (e) {
        report.failed.push({ slug: it.slug, error: (e as Error).message });
        if (report.failed.length <= 5) console.error(`  ✖ ${it.slug}: ${(e as Error).message}`);
      }
      const n = report.done.length + report.missing.length + report.failed.length;
      if (n % 25 === 0 || n === todo.length) {
        console.log(`  ${n}/${todo.length}  ok=${report.done.length} missing=${report.missing.length} failed=${report.failed.length}  in=${(bytesIn / 1e6).toFixed(0)}MB`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nok=${report.done.length} missing=${report.missing.length} failed=${report.failed.length}`);
  if (report.failed.length) console.log("failed:", report.failed.slice(0, 10));
  if (REPORT) fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
