/**
 * Geocoder v3 — extracts city/region from the address text itself.
 *
 * v2 failed on rows where region_id was null (most legacy rows). The
 * addresses have the city embedded — e.g. "πλατεία ρ. μπρούκ, χώρα, σκύρος"
 * — so we walk comma-separated fragments back-to-front, treating each as
 * a potential city, and try Nominatim with "{fragment}, Greece".
 *
 * Skips rows that already have lat/lng. Run after v1 to recover misses.
 *
 *   node scripts/geocode-venues-v3.js [--table=item_food] [--limit=500]
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
  const res = await fetch(url, { headers: { "User-Agent": "proteino-geocoder-v3/1.0" } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  // Sanity: must be inside Greece's rough bounding box
  if (lat < 34.5 || lat > 41.8 || lng < 19.0 || lng > 28.5) return null;
  return { lat, lng };
}

/** Try "fragment, Greece" for each comma-separated fragment of the address,
 *  walking from end (most likely city) to start. Falls back to the full
 *  string + Greece. First hit wins. */
async function geocode(address) {
  const fragments = address.split(",").map((s) => s.trim()).filter((s) => s.length >= 2);
  // Try last fragment, then last 2, then last 3, plus the full address with ", Greece"
  const tries = [];
  for (let i = fragments.length - 1; i >= 0; i--) {
    tries.push(`${fragments[i]}, Greece`);
  }
  for (let i = fragments.length - 2; i >= 0; i--) {
    tries.push(`${fragments.slice(i).join(", ")}, Greece`);
  }
  if (!tries.includes(`${address}, Greece`)) tries.unshift(`${address}, Greece`);
  // Dedupe while preserving order
  const seen = new Set();
  const ordered = tries.filter((q) => (seen.has(q) ? false : (seen.add(q), true)));

  for (const q of ordered) {
    const r = await nominatim(q);
    await sleep(1100);
    if (r) return { ...r, query: q };
  }
  return null;
}

async function processTable(table) {
  const { data, error } = await sb
    .from(table)
    .select("item_id, address, lat")
    .not("address", "is", null)
    .is("lat", null)
    .limit(limitArg);
  if (error) { console.error(`${table}: ${error.message}`); return; }
  if (!data || data.length === 0) { console.log(`${table}: nothing to recover`); return; }
  console.log(`\n${table}: ${data.length} rows to recover`);

  let ok = 0;
  let fail = 0;
  for (const row of data) {
    const addr = row.address?.trim();
    if (!addr) { fail++; continue; }
    try {
      const result = await geocode(addr);
      if (result) {
        const { error: uErr } = await sb.from(table).update({ lat: result.lat, lng: result.lng }).eq("item_id", row.item_id);
        if (uErr) { console.error(`  ${row.item_id}: ${uErr.message}`); fail++; }
        else { ok++; }
      } else {
        fail++;
      }
    } catch (e) {
      console.error(`  ${row.item_id}: ${e.message}`);
      fail++;
    }
  }
  console.log(`${table}: ${ok} recovered, ${fail} still failed`);
}

(async () => {
  for (const t of tables) await processTable(t);
  console.log("\nDone.");
})();
