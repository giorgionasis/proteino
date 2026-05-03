/**
 * Diagnostic: check which extension tables have data and sample extra_fields_raw.
 *
 *   npx tsx scripts/check-extension-tables.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Items per category
  const { data: allItems } = await supabase
    .from("items")
    .select("id, category")
    .limit(5000);
  const catCounts: Record<string, number> = {};
  for (const r of allItems ?? []) {
    catCounts[r.category] = (catCounts[r.category] ?? 0) + 1;
  }
  console.log("\n=== Items per category ===");
  for (const [cat, count] of Object.entries(catCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat.padEnd(12)} ${count}`);
  }
  console.log(`  ${"TOTAL".padEnd(12)} ${allItems?.length ?? 0}`);

  // 2. Extension table row counts
  const tables = [
    "item_movies",
    "item_series",
    "item_books",
    "item_food",
    "item_bars",
    "item_recipes",
    "item_hotels",
    "item_theater",
    "item_events",
  ];
  console.log("\n=== Extension table row counts ===");
  for (const t of tables) {
    const { count, error } = await supabase
      .from(t)
      .select("item_id", { count: "exact", head: true });
    console.log(
      `  ${t.padEnd(16)} ${error ? `ERROR: ${error.message}` : count}`
    );
  }

  // 3. Sample extra_fields_raw per category
  const sampleCats = [
    "books",
    "movies",
    "series",
    "food",
    "bars",
    "hotels",
    "theater",
    "events",
    "recipes",
  ];
  for (const cat of sampleCats) {
    const { data: samples } = await supabase
      .from("items")
      .select("id, title, metadata")
      .eq("category", cat)
      .limit(2);
    console.log(`\n=== Sample: ${cat} (${samples?.length ?? 0} shown) ===`);
    for (const s of samples ?? []) {
      const meta = s.metadata as Record<string, unknown> | null;
      const raw = meta?.extra_fields_raw as Record<string, string> | undefined;
      if (raw) {
        console.log(`  "${s.title}":`);
        for (const [k, v] of Object.entries(raw)) {
          const display =
            typeof v === "string" && v.length > 80 ? v.slice(0, 80) + "…" : v;
          console.log(`    [${k}] = ${display}`);
        }
      } else {
        console.log(`  "${s.title}": NO extra_fields_raw`);
      }
    }

    // Check if extension rows exist for those samples
    if (samples && samples.length > 0) {
      const extTable = `item_${cat}`;
      const ids = samples.map((s) => s.id);
      const { data: extRows, error } = await supabase
        .from(extTable)
        .select("*")
        .in("item_id", ids);
      if (error) {
        console.log(`  Extension (${extTable}): ERROR ${error.message}`);
      } else {
        console.log(
          `  Extension (${extTable}): ${extRows?.length ?? 0} rows found`
        );
        for (const er of extRows ?? []) {
          const { item_id, ...rest } = er;
          const nonNull = Object.entries(rest).filter(
            ([, v]) =>
              v !== null &&
              v !== "" &&
              JSON.stringify(v) !== "[]" &&
              JSON.stringify(v) !== "{}"
          );
          console.log(
            `    non-null fields: ${nonNull.map(([k, v]) => `${k}=${typeof v === "string" && v.length > 40 ? v.slice(0, 40) + "…" : JSON.stringify(v)}`).join(", ")}`
          );
        }
      }
    }
  }
}

main().catch(console.error);
