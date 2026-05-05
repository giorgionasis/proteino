#!/usr/bin/env node
// Probes Supabase to check which numbered SQL migrations have been applied.
// For each migration, queries a signature artifact (table or column it creates).
// "Applied" = the artifact exists. "Not applied" = it doesn't.

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

// Each probe: pick something that the migration uniquely creates.
// If the SELECT succeeds (even with zero rows), the artifact exists.
// If it returns Postgres error 42P01 (relation does not exist) or
// 42703 (column does not exist), the migration hasn't run.
const probes = [
  {
    id: "001",
    name: "create-subcategories-regions",
    probe: () => sb.from("subcategories").select("id").limit(1),
  },
  {
    id: "002",
    name: "create-extra-field-options",
    probe: () => sb.from("extra_field_options").select("id").limit(1),
  },
  {
    id: "003",
    name: "comments-votes-reports",
    probe: () => sb.from("comment_votes").select("user_id").limit(1),
  },
  {
    id: "004",
    name: "collections",
    probe: () => sb.from("collections").select("id").limit(1),
  },
  {
    id: "005",
    name: "activities",
    probe: () => sb.from("activities").select("id").limit(1),
  },
  {
    id: "006",
    name: "movies-tonight",
    probe: () => sb.from("movies_tonight").select("id").limit(1),
  },
  {
    id: "007",
    name: "storage-media-bucket",
    probe: async () => {
      const { data, error } = await sb.storage.getBucket("media");
      if (error && /not found/i.test(error.message)) {
        return { error: { code: "42P01", message: "bucket 'media' not found" } };
      }
      return { data, error };
    },
  },
  {
    id: "008",
    name: "category-filters",
    probe: () => sb.from("category_filters").select("id").limit(1),
  },
  {
    id: "009",
    name: "item-gallery",
    probe: () => sb.from("items").select("images").limit(1),
  },
  {
    id: "010",
    name: "app-settings",
    probe: () => sb.from("app_settings").select("key").limit(1),
  },
  {
    id: "011",
    name: "movies-tonight-reminders",
    // The trigger function is what this migration uniquely creates.
    // We can't introspect functions via supabase-js easily, so probe
    // pg_proc via RPC if available, else skip with note.
    probe: async () => {
      // No standard introspection RPC; we can't easily verify a trigger function
      // exists via supabase-js. Skip with a note — operator must check manually.
      return { skipped: true, reason: "trigger function — check Supabase SQL Editor: SELECT proname FROM pg_proc WHERE proname='notify_bookmarkers_of_airing'" };
    },
  },
  {
    id: "012",
    name: "bookmarks-unique",
    // Probes for the UNIQUE constraint by attempting a duplicate insert is invasive.
    // Instead, check that the bookmarks table exists and has the expected columns.
    probe: () => sb.from("bookmarks").select("user_id, item_id").limit(1),
  },
];

// Bonus probes for the schema drift flagged in ADMIN.md §15
const driftProbes = [
  {
    name: "items.poster_url column",
    probe: () => sb.from("items").select("poster_url").limit(1),
  },
  {
    name: "items.backdrop_url column",
    probe: () => sb.from("items").select("backdrop_url").limit(1),
  },
];

(async () => {
  console.log("Checking migrations against:", url);
  console.log("");

  let applied = 0,
    missing = 0,
    skipped = 0;

  for (const p of probes) {
    const result = await p.probe();
    if (result.skipped) {
      console.log(`  ⚠ ${p.id}-${p.name}  — could not verify (${result.reason})`);
      skipped++;
      continue;
    }
    const { error } = result;
    if (!error) {
      console.log(`  ✓ ${p.id}-${p.name}`);
      applied++;
    } else if (error.code === "42P01" || error.code === "42703" || error.code === "PGRST205") {
      console.log(`  ✗ ${p.id}-${p.name}  — NOT APPLIED (${error.message})`);
      missing++;
    } else {
      console.log(`  ? ${p.id}-${p.name}  — error: ${error.code} ${error.message}`);
      skipped++;
    }
  }

  console.log("");
  console.log("Schema-drift probes (ADMIN.md §15 #6):");
  for (const p of driftProbes) {
    const { error } = await p.probe();
    if (!error) console.log(`  ✓ ${p.name} exists`);
    else if (error.code === "42703" || error.code === "PGRST204")
      console.log(`  ✗ ${p.name} MISSING — code references it but no migration creates it`);
    else console.log(`  ? ${p.name} — ${error.code} ${error.message}`);
  }

  console.log("");
  console.log(
    `Result: ${applied} applied · ${missing} missing · ${skipped} unverified (out of ${probes.length})`
  );
})();
