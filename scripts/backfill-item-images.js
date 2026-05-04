/**
 * Backfill items.images from cover_url.
 *
 * Every item with a non-empty cover_url and an empty images array gets
 *   images = [{ url: cover_url }]
 * so the frontend gallery has at least one photo to render. Skips items
 * that already have entries in images.
 *
 * Run: node scripts/backfill-item-images.js
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const PAGE_SIZE = 500;
  let from = 0;
  let totalScanned = 0;
  let totalUpdated = 0;

  while (true) {
    const { data, error } = await sb
      .from("items")
      .select("id, cover_url, images")
      .not("cover_url", "is", null)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error("Read failed:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    const updates = data
      .filter((it) => it.cover_url && (!Array.isArray(it.images) || it.images.length === 0))
      .map((it) => ({ id: it.id, images: [{ url: it.cover_url }] }));

    if (updates.length > 0) {
      // Bulk update via individual upserts (PostgREST has no array UPDATE WHERE)
      for (const u of updates) {
        const { error: uErr } = await sb.from("items").update({ images: u.images }).eq("id", u.id);
        if (uErr) {
          console.error(`Update ${u.id} failed:`, uErr.message);
        } else {
          totalUpdated++;
        }
      }
    }

    totalScanned += data.length;
    console.log(`Scanned ${totalScanned}, updated ${totalUpdated}`);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`\nDone. Total scanned: ${totalScanned}, updated: ${totalUpdated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
