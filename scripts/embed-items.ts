/**
 * Backfill item embeddings using Google text-embedding-004 via AI Gateway.
 *
 * Usage:
 *   npx tsx scripts/embed-items.ts              # embed items missing embeddings
 *   npx tsx scripts/embed-items.ts --force       # re-embed ALL items
 *   npx tsx scripts/embed-items.ts --dry-run     # show what would be embedded
 *
 * Env: AI_GATEWAY_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "../lib/embeddings/google-direct";
import { composeEmbeddingText } from "../lib/embeddings/compose";

const BATCH_SIZE = 50;

const EXT_TABLES: Record<string, string> = {
  movies: "item_movies",
  series: "item_series",
  books: "item_books",
  food: "item_food",
  recipes: "item_recipes",
  bars: "item_bars",
  hotels: "item_hotels",
  theater: "item_theater",
  events: "item_events",
};

const EXT_COLUMNS: Record<string, string> = {
  movies: "plot, director, actors, country, language",
  series: "plot, director, actors, country, language, seasons",
  books: "writer, plot, language, publication",
  food: "cuisine, type, address, information",
  recipes: "ingredients, origin, level",
  bars: "type, address",
  hotels: "type, address, price_range, facilities",
  theater: "type, writer, director, actors, name_place",
  events: "event_type, performers, name_place",
};

async function main() {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch items
  let query = sb
    .from("items")
    .select("id, title, original_title, description_seo, category")
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (!force) {
    query = query.is("embedding", null);
  }

  const { data: items, error } = await query;
  if (error) {
    console.error("Failed to fetch items:", error.message);
    process.exit(1);
  }

  console.log(`Found ${items.length} items to embed${force ? " (force mode)" : ""}`);
  if (items.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (dryRun) {
    for (const item of items.slice(0, 10)) {
      console.log(`  [${item.category}] ${item.title} (${item.id})`);
    }
    if (items.length > 10) console.log(`  ... and ${items.length - 10} more`);
    return;
  }

  // Group by category to batch extension-table lookups
  const byCategory: Record<string, typeof items> = {};
  for (const item of items) {
    (byCategory[item.category] ??= []).push(item);
  }

  let totalEmbedded = 0;
  let totalTokensEstimate = 0;

  for (const [category, catItems] of Object.entries(byCategory)) {
    const extTable = EXT_TABLES[category];
    const extCols = EXT_COLUMNS[category];

    // Fetch extension rows for this category
    const extMap = new Map<string, Record<string, unknown>>();
    if (extTable && extCols) {
      const ids = catItems.map((i) => i.id);
      const { data: extRows } = await sb
        .from(extTable)
        .select(`item_id, ${extCols}`)
        .in("item_id", ids) as { data: Array<Record<string, any>> | null };
      if (extRows) {
        for (const row of extRows) {
          extMap.set(row.item_id as string, row);
        }
      }
    }

    // Compose texts
    const texts: string[] = [];
    for (const item of catItems) {
      const ext = extMap.get(item.id) ?? null;
      texts.push(composeEmbeddingText(item, ext));
    }

    // Embed in batches
    for (let i = 0; i < catItems.length; i += BATCH_SIZE) {
      const batchItems = catItems.slice(i, i + BATCH_SIZE);
      const batchTexts = texts.slice(i, i + BATCH_SIZE);

      console.log(
        `  [${category}] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(catItems.length / BATCH_SIZE)} (${batchItems.length} items)...`
      );

      const embeddings = await embedBatch(batchTexts);

      // Write embeddings back
      for (let j = 0; j < batchItems.length; j++) {
        const { error: updateError } = await sb
          .from("items")
          .update({ embedding: JSON.stringify(embeddings[j]) } as any)
          .eq("id", batchItems[j].id);

        if (updateError) {
          console.error(`    FAILED: ${batchItems[j].title} — ${updateError.message}`);
        }
      }

      totalEmbedded += batchItems.length;
      totalTokensEstimate += batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
    }

    console.log(`  [${category}] Done — ${catItems.length} items`);
  }

  console.log(`\nSummary:`);
  console.log(`  Embedded: ${totalEmbedded} items`);
  console.log(`  Est. tokens: ~${totalTokensEstimate.toLocaleString()}`);
  console.log(`  Cost: free (Google text-embedding-004 via AI Gateway)`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
