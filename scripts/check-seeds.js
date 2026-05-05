// Probe seed/backfill state. Reports counts so we know what (if anything) to run.

const fs = require("fs");
const path = require("path");
try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const { createClient } = require("@supabase/supabase-js");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

(async () => {
  const efo = await sb.from("extra_field_options").select("*", { count: "exact", head: true });
  console.log(`extra_field_options: ${efo.count ?? "?"} rows  (expected ~295)`);

  const reg = await sb.from("regions").select("*", { count: "exact", head: true });
  console.log(`regions: ${reg.count ?? "?"} rows  (expected 78)`);

  const itemsTotal = await sb.from("items").select("*", { count: "exact", head: true });
  const itemsWithCover = await sb
    .from("items")
    .select("*", { count: "exact", head: true })
    .not("cover_url", "is", null)
    .neq("cover_url", "");
  const itemsWithImages = await sb
    .from("items")
    .select("*", { count: "exact", head: true })
    .neq("images", "[]");
  const usersTotal = await sb.from("users").select("*", { count: "exact", head: true });
  const suggTotal = await sb.from("suggestions").select("*", { count: "exact", head: true });

  console.log(`items: total=${itemsTotal.count}, with cover_url=${itemsWithCover.count}, with images[]=${itemsWithImages.count}`);
  console.log(`users: ${usersTotal.count}  (expected 627 after MySQL migration)`);
  console.log(`suggestions: ${suggTotal.count}  (expected 1952 after MySQL migration)`);

  const needsBackfill = (itemsWithCover.count ?? 0) - (itemsWithImages.count ?? 0);
  console.log(
    needsBackfill > 0
      ? `  → ${needsBackfill} items need backfill-item-images.js`
      : `  → backfill not needed`
  );

  const { data: bucket } = await sb.storage.getBucket("media");
  console.log(bucket ? `storage.media bucket: present (public=${bucket.public})` : `storage.media bucket: MISSING`);
})();
