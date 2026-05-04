/**
 * Bulk-enrich items missing covers.
 *
 * Walks `items` where cover_url is NULL (or backdrop/poster are missing for
 * portrait categories), calls the in-app /api/admin/enrich endpoint, picks
 * the first candidate, and updates the item.
 *
 * Run from the same machine as the dev/prod server (or change ENRICH_BASE).
 *   node scripts/bulk-enrich.js [--category=movies] [--limit=50] [--dry-run]
 *
 * Idempotent — items that get covers won't be re-processed on next run.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENRICH_BASE = process.env.ENRICH_BASE_URL || "http://localhost:3000";
const ADMIN_BYPASS = process.env.ADMIN_DEV_BYPASS_HEADER || ""; // optional, for local

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const args = process.argv.slice(2);
const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];
const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);
const dryRun = args.includes("--dry-run");

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function enrich(item) {
  const ext = item[`item_${item.category}`];
  const year = ext?.release_date ? new Date(ext.release_date).getFullYear() :
               ext?.publication_year ? ext.publication_year : undefined;
  const address = ext?.address;

  const res = await fetch(`${ENRICH_BASE}/api/admin/enrich`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_BYPASS ? { "x-admin-bypass": ADMIN_BYPASS } : {}),
    },
    body: JSON.stringify({ category: item.category, title: item.title, year, address }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.candidates?.[0] ?? null;
}

async function main() {
  let q = sb
    .from("items")
    .select("id, title, slug, category, cover_url, poster_url, backdrop_url, item_movies(release_date), item_series(release_date), item_books(publication_year), item_food(address), item_bars(address), item_hotels(address)")
    .or("cover_url.is.null,poster_url.is.null")
    .eq("is_published", true)
    .limit(limitArg);

  if (categoryArg) q = q.eq("category", categoryArg);

  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }

  console.log(`Found ${data.length} items needing covers${dryRun ? " (dry-run)" : ""}`);

  let ok = 0, fail = 0, skip = 0;

  for (const item of data) {
    const cand = await enrich(item).catch((e) => { console.error(`  ${item.title}: ${e.message}`); return null; });
    if (!cand) { skip++; continue; }

    const update = {};
    if (!item.poster_url && cand.poster_url) update.poster_url = cand.poster_url;
    if (!item.backdrop_url && cand.backdrop_url) update.backdrop_url = cand.backdrop_url;
    if (!item.cover_url) {
      update.cover_url = cand.poster_url ?? cand.backdrop_url ?? null;
    }

    if (Object.keys(update).length === 0) { skip++; continue; }

    if (dryRun) {
      console.log(`  [DRY] ${item.title} → ${JSON.stringify(update)}`);
      ok++;
    } else {
      const { error: uErr } = await sb.from("items").update(update).eq("id", item.id);
      if (uErr) { console.error(`  ${item.title}: ${uErr.message}`); fail++; }
      else { console.log(`  ✓ ${item.title}`); ok++; }
    }

    await sleep(250);   // be polite to external APIs
  }

  console.log(`\nDone. updated: ${ok}, skipped: ${skip}, failed: ${fail}`);
}

main();
