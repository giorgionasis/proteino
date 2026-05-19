/**
 * Diagnostic for the missing-images report on bars/etouto-ath1.
 *
 *   npx tsx scripts/check-etouto.ts
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const SLUG = "etouto-ath1"; // bars

async function main() {
  const { data: items, error: itemErr } = await sb
    .from("items")
    .select("*")
    .eq("slug", `bars/${SLUG}`);
  if (itemErr) throw itemErr;

  let row: any = items?.[0];
  if (!row) {
    // Some import flows store slug without category prefix
    const { data: alt } = await sb
      .from("items")
      .select("*")
      .ilike("slug", `%${SLUG}%`);
    row = alt?.[0];
  }
  if (!row) {
    console.error(`No item found for slug containing "${SLUG}"`);
    process.exit(2);
  }

  console.log("=== items row ===");
  console.log({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    is_published: row.is_published,
    cover_url: row.cover_url,
    poster_url: row.poster_url,
    backdrop_url: row.backdrop_url,
    created_at: row.created_at,
    modified_at: row.modified_at,
    modified_by: row.modified_by ?? "(no column or null)",
    images_type: typeof row.images,
    images_truncated: JSON.stringify(row.images).slice(0, 400) + (JSON.stringify(row.images).length > 400 ? "…" : ""),
  });

  console.log("\n=== item_bars row ===");
  const { data: bars, error: barsErr } = await sb
    .from("item_bars")
    .select("*")
    .eq("item_id", row.id)
    .maybeSingle();
  if (barsErr) console.error("item_bars error:", barsErr.message);
  console.log(bars ?? "(no row)");

  console.log("\n=== Supabase Storage: media/items/<id>/ ===");
  const { data: files, error: stErr } = await sb.storage
    .from("media")
    .list(`items/${row.id}`, { limit: 100 });
  if (stErr) {
    console.error("storage list error:", stErr.message);
  } else {
    console.log(`${files?.length ?? 0} file(s) in media/items/${row.id}/`);
    for (const f of files ?? []) {
      console.log(`  ${f.name}   ${f.metadata?.size ?? "?"}b   (created ${f.created_at})`);
    }
  }

  console.log("\n=== Storage: media/items-bars/ (admin gallery uploads) ===");
  // Gallery uploads go to media/items-<category>/<uuid>-<name>.ext with
  // no item-id grouping. We can't filter by item, but we can scan recents.
  const { data: galleryFiles } = await sb.storage
    .from("media")
    .list("items-bars", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
  console.log(`${galleryFiles?.length ?? 0} file(s) in media/items-bars/ (full bucket)`);
  // Filter to files created near this item's lifetime
  const created = new Date(row.created_at).getTime();
  const modified = new Date(row.modified_at).getTime();
  for (const f of galleryFiles ?? []) {
    const t = f.created_at ? new Date(f.created_at).getTime() : 0;
    // Show files created in the ±48h window around item create/modify
    if (Math.abs(t - created) < 48 * 3600 * 1000 || Math.abs(t - modified) < 48 * 3600 * 1000) {
      console.log(`  ${f.name}  (created ${f.created_at})`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
