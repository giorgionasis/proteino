/**
 * Geocoder v2 — recovers addresses Nominatim returned 0 hits for in v1.
 *
 * Strategy (per row, in order — first hit wins):
 *   1. Original address as-is, biased to GR (same as v1).
 *   2. address + ", " + region.name + ", Greece"
 *   3. Last comma-separated fragment + region.name + ", Greece"
 *      (handles addresses written as "Bar Name, Street 5, Athens" — the
 *       last fragment is usually the most identifiable).
 *   4. region.name + ", Greece" — falls back to the region centroid so the
 *      pin lands somewhere meaningful instead of nowhere. Marked
 *      lat/lng + low-confidence so admin knows to refine.
 *
 * Skips rows that already have lat/lng (idempotent).
 *
 * Run:  node scripts/geocode-venues-v2.js [--table=item_food] [--limit=500]
 * Nominatim's free tier caps at 1 req/sec — each row may make up to 4 calls,
 * so total runtime can extend up to 4x the v1 floor.
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const TABLES = ["item_food", "item_bars", "item_hotels", "item_theater", "item_events"];

const args = process.argv.slice(2);
const tableArg = args.find((a) => a.startsWith("--table="))?.split("=")[1];
const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);

const tables = tableArg ? [tableArg] : TABLES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "gr");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "proteino-geocoder-v2/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

/** Try the address with progressively more context. Sleeps 1.1s per call. */
async function geocodeWithFallbacks(address, regionName) {
  const tries = [];

  // 1. As-is
  if (address) tries.push(address);

  // 2. address + region + Greece
  if (address && regionName) tries.push(`${address}, ${regionName}, Greece`);

  // 3. Last fragment + region + Greece (handles "Name, Street, City" format)
  if (address && regionName) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      tries.push(`${last}, ${regionName}, Greece`);
    }
  }

  // 4. Region centroid as last resort
  if (regionName) tries.push(`${regionName}, Greece`);

  for (const q of tries) {
    const result = await nominatim(q);
    await sleep(1100);
    if (result) {
      // Sanity-check coords are inside Greece's bounding box
      if (result.lat >= 34.5 && result.lat <= 41.8 && result.lng >= 19.0 && result.lng <= 28.5) {
        return { ...result, query: q, fallback: q !== address };
      }
    }
  }
  return null;
}

async function loadRegionsById() {
  const { data } = await sb.from("regions").select("id, name");
  const map = new Map();
  for (const r of data ?? []) map.set(r.id, r.name);
  return map;
}

async function processTable(table, regionsById) {
  const { data, error } = await sb
    .from(table)
    .select("item_id, address, region_id, lat, lng")
    .not("address", "is", null)
    .is("lat", null)
    .limit(limitArg);

  if (error) { console.error(`${table}:`, error.message); return; }
  if (!data || data.length === 0) {
    console.log(`${table}: nothing to recover`);
    return;
  }

  console.log(`\n${table}: ${data.length} rows to recover`);

  let exact = 0;
  let fallback = 0;
  let stillFailed = 0;

  for (const row of data) {
    const regionName = row.region_id ? regionsById.get(row.region_id) : null;
    if (!row.address?.trim()) { stillFailed++; continue; }

    try {
      const result = await geocodeWithFallbacks(row.address.trim(), regionName);
      if (result) {
        const { error: uErr } = await sb
          .from(table)
          .update({ lat: result.lat, lng: result.lng })
          .eq("item_id", row.item_id);
        if (uErr) {
          console.error(`  ${row.item_id}: ${uErr.message}`);
          stillFailed++;
        } else {
          if (result.fallback) fallback++;
          else exact++;
        }
      } else {
        stillFailed++;
      }
    } catch (e) {
      console.error(`  ${row.item_id}: ${e.message}`);
      stillFailed++;
    }
  }

  console.log(`${table}: ${exact} exact, ${fallback} via fallback, ${stillFailed} still failed`);
}

(async () => {
  const regionsById = await loadRegionsById();
  console.log(`Loaded ${regionsById.size} regions for fallback context`);
  for (const t of tables) {
    await processTable(t, regionsById);
  }
  console.log("\nDone.");
})();
