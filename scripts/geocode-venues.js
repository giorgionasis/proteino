/**
 * Bulk geocode venues missing lat/lng.
 *
 * Walks item_food / item_bars / item_hotels / item_theater / item_events with
 * non-null address but null lat/lng, hits Nominatim once per item (with 1.1s
 * delay per their usage policy: max 1 req/sec), and updates the row.
 *
 * Run: node scripts/geocode-venues.js [--table=item_food] [--limit=100]
 *
 * Idempotent — skips items that already have lat/lng.
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

const TABLES_WITH_ADDRESS = ["item_food", "item_bars", "item_hotels", "item_theater", "item_events"];

const args = process.argv.slice(2);
const tableArg = args.find((a) => a.startsWith("--table="))?.split("=")[1];
const limitArg = parseInt(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? "9999", 10);

const tables = tableArg ? [tableArg] : TABLES_WITH_ADDRESS;

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "gr");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "proteino-geocoder/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function processTable(table) {
  const { data, error } = await sb
    .from(table)
    .select("item_id, address, lat, lng")
    .not("address", "is", null)
    .is("lat", null)
    .limit(limitArg);

  if (error) { console.error(`${table}:`, error.message); return; }
  if (!data || data.length === 0) {
    console.log(`${table}: nothing to geocode`);
    return;
  }

  console.log(`\n${table}: ${data.length} rows to geocode`);

  let ok = 0;
  let fail = 0;

  for (const row of data) {
    if (!row.address?.trim()) continue;
    try {
      const result = await geocode(row.address);
      if (result) {
        const { error: uErr } = await sb
          .from(table)
          .update({ lat: result.lat, lng: result.lng })
          .eq("item_id", row.item_id);
        if (uErr) { console.error(`  ${row.item_id}: ${uErr.message}`); fail++; }
        else { ok++; }
      } else {
        fail++;
      }
    } catch (e) {
      console.error(`  ${row.item_id}: ${e.message}`);
      fail++;
    }
    // Nominatim policy: 1 req/sec
    await sleep(1100);
  }

  console.log(`${table}: ${ok} geocoded, ${fail} failed`);
}

(async () => {
  for (const t of tables) {
    await processTable(t);
  }
  console.log("\nDone.");
})();
