/**
 * Fix 3 data quality issues in already-populated extension tables:
 *
 * 1. FOOD: cuisine/type stored as K2 option IDs ("12", "3") → resolve to names
 * 2. RECIPES: difficulty stored as option ID, prep/cook time as option IDs → resolve
 * 3. THEATER: address contains category type ("κωμωδία") instead of real address
 *
 *   npx tsx scripts/fix-extension-tables.ts --dry-run    — show what would change
 *   npx tsx scripts/fix-extension-tables.ts              — apply fixes
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ─────────────────────────── ENV ─────────────────────────── */

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

/* ─────────────── K2 OPTION LOOKUPS (from MySQL dump) ─────────────── */

// Field 75: food type (select)
const FOOD_TYPE: Record<string, string> = {
  "2": "all day cafe restaurant",
  "3": "all day bar restaurant",
  "4": "beer restaurant",
  "5": "bistrot",
  "6": "fast food",
  "7": "fish restaurant",
  "8": "grill",
  "9": "music restaurant",
  "10": "piano restaurant",
  "11": "pub",
  "12": "street food",
  "13": "sushi bar",
  "14": "trattoria",
  "15": "wine bar restaurant",
  "16": "εθνικ",
  "17": "εστιατόριο",
  "18": "ζωντανή μουσική",
  "19": "κουτούκι",
  "20": "μαγειρείο",
  "21": "μεζεδοπωλείο",
  "22": "πιτσαρία",
  "23": "ρακάδικο",
  "24": "ταβέρνα",
  "25": "τσιπουράδικο",
  "26": "ψαροταβέρνα",
  "27": "ουζερί",
  "28": "παραδοσιακό καφενείο",
  "29": "εστιατόριο παντοπωλείο",
};

// Field 76: food cuisine (select)
const FOOD_CUISINE: Record<string, string> = {
  "2": "american style - burgers",
  "3": "vegan",
  "4": "ασιατική - πολυνησιακή",
  "5": "αφγανική",
  "6": "αφρικανική",
  "7": "βραζιλιάνικη",
  "8": "γαλλική",
  "9": "γερμανική - αυστριακή",
  "10": "διεθνής",
  "11": "ελληνική",
  "12": "ελληνική - δημιουργική",
  "13": "ιαπωνική",
  "14": "ινδική",
  "15": "ισπανική",
  "16": "ιταλική",
  "17": "κινέζικη",
  "18": "κρητική",
  "19": "κυπριακή",
  "20": "λιβανέζικη - συριακή",
  "21": "μεξικάνικη",
  "22": "μεσογειακή",
  "23": "μικρασιατική",
  "24": "μοριακή",
  "25": "οργανική",
  "26": "περσική",
  "27": "πολίτικη",
  "28": "ρωσική - ουκρανική",
  "29": "ταϊλανδέζικη",
  "30": "τούρκικη",
  "31": "τσέχικη - σλοβάκικη",
  "32": "χορτοφαγική",
};

// Field 137: recipe difficulty (select)
const RECIPE_DIFFICULTY: Record<string, string> = {
  "2": "πολύ εύκολη",
  "3": "εύκολη",
  "4": "μέτρια",
  "5": "δύσκολη",
  "6": "πολύ δύσκολη",
};

// Field 134: recipe prep time (select) — option ID → minute range string
const RECIPE_PREP_TIME: Record<string, string> = {
  "2": "0-5",
  "3": "5-10",
  "4": "10-15",
  "5": "15-20",
  "6": "20-25",
  "7": "25-30",
  "8": "30-35",
  "9": "35-40",
  "10": "40-45",
  "11": "45-60",
  "12": "60-120",
  "13": "120-180",
  "14": "180-240",
  "15": "240-300",
  "16": "300-360",
};

// Field 135: recipe cook time (select) — option ID → minute range string
const RECIPE_COOK_TIME: Record<string, string> = {
  "2": "1-10",
  "3": "10-20",
  "4": "20-30",
  "5": "30-40",
  "6": "40-50",
  "7": "50-60",
  "8": "60-70",
  "9": "70-80",
  "10": "80-90",
};

// Midpoint of a time range for the numeric duration column
function rangeMidpoint(range: string): number {
  const [lo, hi] = range.split("-").map(Number);
  return Math.round((lo + hi) / 2);
}

/* ─────────────────────────── STATS ─────────────────────────── */

interface FixStats {
  food_type: { resolved: number; already_text: number; unknown_id: number };
  food_cuisine: { resolved: number; already_text: number; unknown_id: number };
  recipe_level: { resolved: number; already_text: number; unknown_id: number };
  recipe_duration: { fixed: number; already_ok: number };
  theater_address: { fixed: number; already_ok: number };
}

const stats: FixStats = {
  food_type: { resolved: 0, already_text: 0, unknown_id: 0 },
  food_cuisine: { resolved: 0, already_text: 0, unknown_id: 0 },
  recipe_level: { resolved: 0, already_text: 0, unknown_id: 0 },
  recipe_duration: { fixed: 0, already_ok: 0 },
  theater_address: { fixed: 0, already_ok: 0 },
};

/* ─────────────────────────── FIX FUNCTIONS ─────────────────────────── */

function isNumericId(val: string | null): boolean {
  if (!val) return false;
  return /^\d+$/.test(val.trim());
}

async function fixFood(supabase: SupabaseClient, dryRun: boolean) {
  console.log("\n▸ Fixing item_food: type and cuisine numeric IDs → names");

  const { data: rows, error } = await supabase
    .from("item_food")
    .select("item_id, type, cuisine");
  if (error || !rows) {
    console.error("  Failed to read item_food:", error?.message);
    return;
  }

  const updates: { item_id: string; type?: string; cuisine?: string }[] = [];

  for (const row of rows) {
    const patch: Record<string, string> = {};

    // Fix type
    if (isNumericId(row.type)) {
      const resolved = FOOD_TYPE[row.type!.trim()];
      if (resolved) {
        patch.type = resolved;
        stats.food_type.resolved++;
      } else {
        stats.food_type.unknown_id++;
      }
    } else {
      stats.food_type.already_text++;
    }

    // Fix cuisine
    if (isNumericId(row.cuisine)) {
      const resolved = FOOD_CUISINE[row.cuisine!.trim()];
      if (resolved) {
        patch.cuisine = resolved;
        stats.food_cuisine.resolved++;
      } else {
        stats.food_cuisine.unknown_id++;
      }
    } else {
      stats.food_cuisine.already_text++;
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ item_id: row.item_id, ...patch });
    }
  }

  console.log(
    `  type:    ${stats.food_type.resolved} to resolve, ${stats.food_type.already_text} already text, ${stats.food_type.unknown_id} unknown`
  );
  console.log(
    `  cuisine: ${stats.food_cuisine.resolved} to resolve, ${stats.food_cuisine.already_text} already text, ${stats.food_cuisine.unknown_id} unknown`
  );

  if (!dryRun && updates.length > 0) {
    let ok = 0;
    let fail = 0;
    for (const u of updates) {
      const { item_id, ...patch } = u;
      const { error } = await supabase
        .from("item_food")
        .update(patch)
        .eq("item_id", item_id);
      if (error) {
        fail++;
        if (fail <= 3) console.error(`  ✖ ${item_id}: ${error.message}`);
      } else {
        ok++;
      }
    }
    console.log(`  Applied: ${ok} updated, ${fail} failed`);
  }
}

async function fixRecipes(supabase: SupabaseClient, dryRun: boolean) {
  console.log(
    "\n▸ Fixing item_recipes: difficulty and duration numeric IDs → names/minutes"
  );

  const { data: rows, error } = await supabase
    .from("item_recipes")
    .select("item_id, level, duration");
  if (error || !rows) {
    console.error("  Failed to read item_recipes:", error?.message);
    return;
  }

  const updates: {
    item_id: string;
    level?: string;
    duration?: Record<string, unknown>;
  }[] = [];

  for (const row of rows) {
    const patch: Record<string, unknown> = {};

    // Fix difficulty level
    if (isNumericId(row.level)) {
      const resolved = RECIPE_DIFFICULTY[row.level!.trim()];
      if (resolved) {
        patch.level = resolved;
        stats.recipe_level.resolved++;
      } else {
        stats.recipe_level.unknown_id++;
      }
    } else {
      stats.recipe_level.already_text++;
    }

    // Fix duration — currently { prep_minutes: <optionId>, cook_minutes: <optionId> }
    const dur = row.duration as {
      prep_minutes?: number | null;
      cook_minutes?: number | null;
    } | null;
    if (dur) {
      const prepId = String(dur.prep_minutes ?? "");
      const cookId = String(dur.cook_minutes ?? "");
      const prepRange = RECIPE_PREP_TIME[prepId];
      const cookRange = RECIPE_COOK_TIME[cookId];

      if (prepRange || cookRange) {
        const newDur: Record<string, unknown> = { ...dur };
        if (prepRange) {
          newDur.prep_minutes = rangeMidpoint(prepRange);
          newDur.prep_range = prepRange;
        }
        if (cookRange) {
          newDur.cook_minutes = rangeMidpoint(cookRange);
          newDur.cook_range = cookRange;
        }
        patch.duration = newDur;
        stats.recipe_duration.fixed++;
      } else {
        stats.recipe_duration.already_ok++;
      }
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ item_id: row.item_id, ...patch } as {
        item_id: string;
        level?: string;
        duration?: Record<string, unknown>;
      });
    }
  }

  console.log(
    `  level:    ${stats.recipe_level.resolved} to resolve, ${stats.recipe_level.already_text} already text, ${stats.recipe_level.unknown_id} unknown`
  );
  console.log(
    `  duration: ${stats.recipe_duration.fixed} to fix, ${stats.recipe_duration.already_ok} already ok`
  );

  if (!dryRun && updates.length > 0) {
    let ok = 0;
    let fail = 0;
    for (const u of updates) {
      const { item_id, ...patch } = u;
      const { error } = await supabase
        .from("item_recipes")
        .update(patch)
        .eq("item_id", item_id);
      if (error) {
        fail++;
        if (fail <= 3) console.error(`  ✖ ${item_id}: ${error.message}`);
      } else {
        ok++;
      }
    }
    console.log(`  Applied: ${ok} updated, ${fail} failed`);
  }
}

async function fixTheater(supabase: SupabaseClient, dryRun: boolean) {
  console.log(
    "\n▸ Fixing item_theater: address contains type instead of real address"
  );

  // Theater address bug: the migration's tree-derived address used type (κωμωδία)
  // as the first tier instead of location. We need to get the real address from
  // items.metadata (location + neighborhood from the K2 category tree).
  const { data: rows, error } = await supabase
    .from("item_theater")
    .select("item_id, address, type");
  if (error || !rows) {
    console.error("  Failed to read item_theater:", error?.message);
    return;
  }

  // K2's theater tree is type-first (κωμωδία → ...), not location-first.
  // metadata.location also contains the type, so there's no real address
  // to recover. Set address to null where it equals the type.
  const updates: { item_id: string; address: string | null }[] = [];

  for (const row of rows) {
    const currentAddr = row.address?.trim() ?? "";

    if (currentAddr && currentAddr === row.type) {
      updates.push({ item_id: row.item_id, address: null });
      stats.theater_address.fixed++;
    } else {
      stats.theater_address.already_ok++;
    }
  }

  console.log(
    `  address: ${stats.theater_address.fixed} to fix, ${stats.theater_address.already_ok} already ok`
  );

  if (!dryRun && updates.length > 0) {
    let ok = 0;
    let fail = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from("item_theater")
        .update({ address: u.address })
        .eq("item_id", u.item_id);
      if (error) {
        fail++;
        if (fail <= 3) console.error(`  ✖ ${u.item_id}: ${error.message}`);
      } else {
        ok++;
      }
    }
    console.log(`  Applied: ${ok} updated, ${fail} failed`);
  }
}

/* ─────────────────────────── MAIN ─────────────────────────── */

async function main() {
  loadEnvLocal();
  const dryRun = process.argv.includes("--dry-run");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log(`Mode: ${dryRun ? "DRY-RUN (no writes)" : "LIVE"}`);

  await fixFood(supabase, dryRun);
  await fixRecipes(supabase, dryRun);
  await fixTheater(supabase, dryRun);

  console.log("\n========== SUMMARY ==========");
  console.log("  Food type:       ", JSON.stringify(stats.food_type));
  console.log("  Food cuisine:    ", JSON.stringify(stats.food_cuisine));
  console.log("  Recipe level:    ", JSON.stringify(stats.recipe_level));
  console.log("  Recipe duration: ", JSON.stringify(stats.recipe_duration));
  console.log("  Theater address: ", JSON.stringify(stats.theater_address));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
