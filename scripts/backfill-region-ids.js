/**
 * Region backfill — matches venue addresses to regions table by name.
 *
 * For each venue (food/bars/hotels/theater/events) with region_id = null,
 * walk address fragments back-to-front, accent-fold both sides, and try to
 * match against:
 *   1. Sub-region names (more specific — e.g. "Γλυφάδα", "Σκύρος")
 *   2. Top-level region names (less specific — e.g. "Αττική", "Κρήτη")
 *
 * Updates region_id on first hit. Logs every match + every miss for review.
 *
 *   node scripts/backfill-region-ids.js [--table=item_food] [--dry-run]
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

// Args
const args = process.argv.slice(2).reduce((acc, a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  if (m) acc[m[1]] = m[2] ?? true;
  return acc;
}, {});
const ONE_TABLE = args.table || null;
const DRY_RUN = !!args["dry-run"];

// Greek-accent fold + lowercase. Matches the helper used in the search route.
function foldGreek(s) {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/ς/g, "σ") // final sigma → sigma so "σκύρος" === "σκυροσ" === "σκυρος"
    .trim();
}

async function main() {
  // 1. Load all regions, build lookup maps
  const { data: regions, error: rErr } = await sb
    .from("regions")
    .select("id, name, parent_id");
  if (rErr) {
    console.error("Failed to load regions:", rErr.message);
    process.exit(1);
  }
  console.log(`Loaded ${regions.length} regions (${regions.filter((r) => !r.parent_id).length} top-level + ${regions.filter((r) => r.parent_id).length} sub).`);

  // Sub-regions matched first (more specific). Within each tier, sort by
  // longest name first so "Νέα Ιωνία" wins over "Νέα" if the latter exists.
  const subRegions = regions
    .filter((r) => r.parent_id)
    .map((r) => ({ id: r.id, name: r.name, folded: foldGreek(r.name) }))
    .sort((a, b) => b.folded.length - a.folded.length);
  const topRegions = regions
    .filter((r) => !r.parent_id)
    .map((r) => ({ id: r.id, name: r.name, folded: foldGreek(r.name) }))
    .sort((a, b) => b.folded.length - a.folded.length);

  // 2. For each venue table, fetch null-region rows + match
  const tablesToProcess = ONE_TABLE ? [ONE_TABLE] : TABLES;
  let totalMatched = 0;
  let totalMissed = 0;

  for (const table of tablesToProcess) {
    console.log(`\n=== ${table} ===`);
    const { data: rows, error } = await sb
      .from(table)
      .select("item_id, address")
      .is("region_id", null);
    if (error) {
      console.error(`  Failed to load ${table}:`, error.message);
      continue;
    }
    console.log(`  ${rows.length} rows with region_id = null`);

    let matched = 0;
    let missed = 0;
    const missedExamples = [];

    for (const row of rows) {
      if (!row.address) {
        missed++;
        continue;
      }
      const folded = foldGreek(row.address);

      // Try sub-region match first — substring containment.
      let regionId = null;
      let matchedName = null;
      for (const sr of subRegions) {
        if (folded.includes(sr.folded)) {
          regionId = sr.id;
          matchedName = `${sr.name} (sub)`;
          break;
        }
      }
      if (!regionId) {
        for (const tr of topRegions) {
          if (folded.includes(tr.folded)) {
            regionId = tr.id;
            matchedName = `${tr.name} (top)`;
            break;
          }
        }
      }

      if (regionId) {
        matched++;
        if (!DRY_RUN) {
          const { error: uErr } = await sb
            .from(table)
            .update({ region_id: regionId })
            .eq("item_id", row.item_id);
          if (uErr) {
            console.warn(`    update failed for ${row.item_id}: ${uErr.message}`);
          }
        }
      } else {
        missed++;
        if (missedExamples.length < 8) missedExamples.push(row.address);
      }
    }

    console.log(`  → matched: ${matched}, missed: ${missed}`);
    if (missedExamples.length > 0) {
      console.log("  examples of missed addresses:");
      for (const a of missedExamples) console.log(`    - ${a}`);
    }
    totalMatched += matched;
    totalMissed += missed;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`matched: ${totalMatched}`);
  console.log(`missed:  ${totalMissed}`);
  if (DRY_RUN) console.log("(dry-run — no rows actually updated)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
