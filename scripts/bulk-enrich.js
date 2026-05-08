/**
 * Bulk-enrich items missing covers — pipeline mode.
 *
 * For each item without a poster/backdrop:
 *   1. Call /api/admin/enrich to get candidates from TMDB / Books / Places
 *   2. For each available URL on the top candidate (poster + backdrop):
 *      POST /api/admin/upload-item-image with { sourceUrl } so the server
 *      fetches it, runs the Sharp pipeline (4 WebP variants + OG JPEG),
 *      uploads to Supabase Storage, and updates items.images +
 *      poster_url/backdrop_url columns to point at the optimized URLs.
 *
 * Idempotent — items already populated are skipped on next run.
 *
 *   node scripts/bulk-enrich.js [--category=movies] [--limit=50] [--dry-run]
 *
 * Run from the same machine as the dev/prod server, or change ENRICH_BASE.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENRICH_BASE = process.env.ENRICH_BASE_URL || "http://localhost:3000";
const ADMIN_BYPASS = process.env.ADMIN_DEV_BYPASS_HEADER || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const args = process.argv.slice(2);
const categoryArg = args.find((a) => a.startsWith("--category="))?.split("=")[1];
const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);
const dryRun = args.includes("--dry-run");

const PORTRAIT_CATEGORIES = new Set(["movies", "series", "books"]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchEnrichmentCandidate(item) {
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

async function processSlotFromUrl(itemId, slot, sourceUrl) {
  const res = await fetch(`${ENRICH_BASE}/api/admin/upload-item-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(ADMIN_BYPASS ? { "x-admin-bypass": ADMIN_BYPASS } : {}),
    },
    body: JSON.stringify({ itemId, slot, sourceUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.images;
}

async function main() {
  // Look for items lacking either the legacy column OR the structured
  // images.poster/backdrop. The latter is the modern indicator that the
  // pipeline has run; legacy column being null means TMDB never set it.
  let q = sb
    .from("items")
    .select(
      "id, title, slug, category, cover_url, poster_url, backdrop_url, images, " +
      "item_movies(release_date), item_series(release_date), item_books(publication_year), " +
      "item_food(address), item_bars(address), item_hotels(address)"
    )
    .or("cover_url.is.null,poster_url.is.null")
    .eq("is_published", true)
    .limit(limitArg);

  if (categoryArg) q = q.eq("category", categoryArg);

  const { data, error } = await q;
  if (error) { console.error(error.message); process.exit(1); }

  console.log(`Found ${data.length} items needing covers${dryRun ? " (dry-run)" : ""}`);

  let ok = 0, fail = 0, skip = 0;

  for (const item of data) {
    const cand = await fetchEnrichmentCandidate(item).catch((e) => {
      console.error(`  ${item.title}: enrich failed — ${e.message}`);
      return null;
    });
    if (!cand) { skip++; continue; }

    const isPortrait = PORTRAIT_CATEGORIES.has(item.category);
    const slotPlan = [];
    if (cand.poster_url) slotPlan.push({ slot: "poster", url: cand.poster_url });
    if (cand.backdrop_url) slotPlan.push({ slot: "backdrop", url: cand.backdrop_url });
    // For non-portrait categories with only a poster_url, we also use
    // it as the backdrop source (Google Books / Places sometimes).
    if (!isPortrait && !cand.backdrop_url && cand.poster_url) {
      slotPlan.push({ slot: "backdrop", url: cand.poster_url });
    }

    if (slotPlan.length === 0) { skip++; continue; }

    if (dryRun) {
      console.log(`  [DRY] ${item.title} → ${slotPlan.map((p) => `${p.slot}: ${p.url.slice(0, 80)}`).join(", ")}`);
      ok++;
      continue;
    }

    let itemFailed = false;
    for (const { slot, url } of slotPlan) {
      try {
        await processSlotFromUrl(item.id, slot, url);
      } catch (e) {
        console.error(`  ${item.title}.${slot}: ${e.message}`);
        itemFailed = true;
      }
    }
    if (itemFailed) fail++;
    else { console.log(`  ✓ ${item.title} (${slotPlan.map((p) => p.slot).join(" + ")})`); ok++; }

    // Throttle: pipeline + storage upload is slower than the old direct
    // save, so 100ms is enough breathing room for sequential calls.
    await sleep(100);
  }

  console.log(`\nDone. updated: ${ok}, skipped: ${skip}, failed: ${fail}`);
}

main();
