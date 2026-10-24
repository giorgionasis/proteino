/**
 * Backfill item embeddings with Google gemini-embedding-001 (direct API,
 * free tier: 1,000 requests/day, 100 texts per request → ~20 requests
 * for the whole catalogue). 768 dims, unit length.
 *
 * Usage:
 *   npx tsx scripts/embed-items.ts              # embed items missing embeddings
 *   npx tsx scripts/embed-items.ts --force      # re-embed ALL items
 *   npx tsx scripts/embed-items.ts --dry-run    # counts + sample composed texts
 *   npx tsx scripts/embed-items.ts --limit 20   # only the first N items
 *
 * Re-runnable: without --force it only picks up items still missing an
 * embedding, so an interrupted run just continues.
 *
 * Env: GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "../lib/embeddings/google-direct";
import { composeEmbeddingText } from "../lib/embeddings/compose";

const BATCH_SIZE = 100; // = one batchEmbedContents request
const PAGE = 1000;   // PostgREST max rows per request
const IN_CHUNK = 150; // ids per .in() filter — keeps the URL short

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

  // Fetch items (paged — a single select stops at 1,000 rows)
  type Item = { id: string; title: string; original_title: string | null; description_seo: string | null; category: string; metadata: any };
  const items: Item[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = sb
      .from("items")
      .select("id, title, original_title, description_seo, category, metadata")
      .eq("is_published", true)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (!force) query = query.is("embedding", null);
    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch items:", error.message);
      process.exit(1);
    }
    items.push(...((data ?? []) as Item[]));
    if (!data || data.length < PAGE) break;
  }
  const limitArg = process.argv.indexOf("--limit");
  if (limitArg > -1) items.splice(Number(process.argv[limitArg + 1]) || items.length);

  console.log(`Found ${items.length} items to embed${force ? " (force mode)" : ""}`);
  if (items.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  // Group by category to batch extension-table lookups
  const byCategory: Record<string, Item[]> = {};
  for (const item of items) {
    (byCategory[item.category] ??= []).push(item);
  }

  let totalEmbedded = 0;
  let totalFailed = 0;
  let totalTokensEstimate = 0;

  for (const [category, catItems] of Object.entries(byCategory)) {
    const extTable = EXT_TABLES[category];
    const extCols = EXT_COLUMNS[category];

    // Extension rows + first published reflection, in short id chunks
    const extMap = new Map<string, Record<string, unknown>>();
    const reflectionMap = new Map<string, string>();
    const ids = catItems.map((i) => i.id);
    for (let c = 0; c < ids.length; c += IN_CHUNK) {
      const chunk = ids.slice(c, c + IN_CHUNK);
      if (extTable && extCols) {
        const { data: extRows, error: extErr } = await sb
          .from(extTable)
          .select(`item_id, ${extCols}`)
          .in("item_id", chunk) as { data: Array<Record<string, any>> | null; error: any };
        if (extErr) console.error(`    ${extTable} lookup failed: ${extErr.message}`);
        for (const row of extRows ?? []) extMap.set(row.item_id as string, row);
      }
      const { data: refl } = await sb
        .from("suggestions")
        .select("item_id, reflection, created_at")
        .in("item_id", chunk)
        .eq("is_published", true)
        .is("hidden_at", null)
        .order("created_at", { ascending: true }) as { data: Array<{ item_id: string; reflection: string | null }> | null };
      for (const r of refl ?? []) {
        if (r.reflection && !reflectionMap.has(r.item_id)) reflectionMap.set(r.item_id, r.reflection);
      }
    }

    // Compose texts
    const texts: string[] = [];
    for (const item of catItems) {
      const ext = extMap.get(item.id) ?? null;
      const tags = Array.isArray(item.metadata?.tags) ? item.metadata.tags : null;
      texts.push(composeEmbeddingText(item, ext, { tags, reflection: reflectionMap.get(item.id) }));
    }

    if (dryRun) {
      const avg = Math.round(texts.reduce((n, t) => n + t.length, 0) / Math.max(texts.length, 1));
      console.log(`  [${category}] ${catItems.length} items · avg ${avg} chars`);
      console.log(`    e.g. ${texts[0]?.slice(0, 220)}…`);
      continue;
    }

    // Embed in batches
    for (let i = 0; i < catItems.length; i += BATCH_SIZE) {
      const batchItems = catItems.slice(i, i + BATCH_SIZE);
      const batchTexts = texts.slice(i, i + BATCH_SIZE);

      console.log(
        `  [${category}] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(catItems.length / BATCH_SIZE)} (${batchItems.length} items)...`
      );

      const embeddings = await embedBatch(batchTexts, batchItems.map((it) => it.title));

      // Write embeddings back
      for (let j = 0; j < batchItems.length; j++) {
        const { error: updateError } = await sb
          .from("items")
          .update({ embedding: JSON.stringify(embeddings[j]) } as any)
          .eq("id", batchItems[j].id);

        if (updateError) {
          console.error(`    FAILED: ${batchItems[j].title} — ${updateError.message}`);
          totalFailed++;
        } else {
          totalEmbedded++;
        }
      }

      totalTokensEstimate += batchTexts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);
    }

    console.log(`  [${category}] Done — ${catItems.length} items`);
  }

  if (dryRun) {
    console.log(`\nDry run — nothing written. ~${Math.ceil(items.length / 100)} API requests (free tier: 1,000/day).`);
    return;
  }

  console.log(`\nSummary:`);
  console.log(`  Embedded: ${totalEmbedded} items${totalFailed ? ` · ${totalFailed} failed (re-run to retry)` : ""}`);
  console.log(`  Est. tokens: ~${totalTokensEstimate.toLocaleString()}`);
  console.log(`  Cost: free (gemini-embedding-001, direct API)`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
