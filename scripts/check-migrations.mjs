// One-shot probe — verifies which of migrations 019-025 are applied in the
// live Supabase. Run with:
//
//   node --env-file=.env.local scripts/check-migrations.mjs
//
// Uses the service role key (server-only) so RLS doesn't mask the answer.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supa = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
const pass = (n, label, detail = "") => results.push({ n, status: "✅", label, detail });
const fail = (n, label, detail = "") => results.push({ n, status: "❌", label, detail });
const warn = (n, label, detail = "") => results.push({ n, status: "⚠️ ", label, detail });

// 019 — ai_query_cache + ai_usage_log tables
{
  const a = await supa.from("ai_query_cache").select("id", { count: "exact", head: true });
  const b = await supa.from("ai_usage_log").select("id", { count: "exact", head: true });
  if (!a.error && !b.error) {
    pass("019", "ai_query_cache + ai_usage_log tables", `cache rows: ${a.count ?? 0}, usage rows: ${b.count ?? 0}`);
  } else {
    fail("019", "ai_query_cache / ai_usage_log", a.error?.message || b.error?.message);
  }
}

// 020 — items.original_title column
{
  const { error } = await supa.from("items").select("original_title").limit(1);
  if (!error) pass("020", "items.original_title column");
  else fail("020", "items.original_title", error.message);
}

// 021 — category_filters food.type/cuisine flip
{
  const { data, error } = await supa
    .from("category_filters")
    .select("filter_id, is_published")
    .eq("category", "food")
    .in("filter_id", ["type", "cuisine"]);
  if (error) {
    fail("021", "category_filters food.type/cuisine flip", error.message);
  } else {
    const t = data.find((r) => r.filter_id === "type");
    const c = data.find((r) => r.filter_id === "cuisine");
    const ok = t?.is_published === false && c?.is_published === true;
    const detail = `type.is_published=${t?.is_published}, cuisine.is_published=${c?.is_published}`;
    if (ok) pass("021", "food.type=hidden, food.cuisine=visible", detail);
    else fail("021", "food filters flip not applied", detail);
  }
}

// 022 — users.preferences jsonb column
{
  const { error } = await supa.from("users").select("preferences").limit(1);
  if (!error) pass("022", "users.preferences jsonb column");
  else fail("022", "users.preferences", error.message);
}

// 023 — bookmarks.status column
{
  const { error } = await supa.from("bookmarks").select("status").limit(1);
  if (!error) pass("023", "bookmarks.status column");
  else fail("023", "bookmarks.status", error.message);
}

// 024 — get_leaderboard RPC
{
  const { error } = await supa.rpc("get_leaderboard", {
    p_period: "all",
    p_category: "all",
    p_viewer: null,
  });
  if (!error) pass("024", "get_leaderboard RPC");
  else fail("024", "get_leaderboard", error.message);
}

// 025 — bookmarks UPDATE RLS policy
// Service role bypasses RLS so we can't directly probe the policy with a write
// without polluting data. Instead: if migration 023 applied AND a recent
// PATCH /api/bookmarks request would have succeeded in production, 025 is also
// applied. We surface this as a soft check — confirm in dashboard if unsure.
{
  // Sanity test: query pg_policies via PostgREST is not exposed by default.
  // Mark as inferred — user can confirm via Supabase SQL editor:
  //   SELECT policyname FROM pg_policies WHERE tablename='bookmarks';
  warn(
    "025",
    "bookmarks GRANT + UPDATE policy (cannot probe via REST)",
    "Verify in Supabase SQL editor: SELECT policyname FROM pg_policies WHERE tablename='bookmarks';"
  );
}

console.log("\n=== Migration status ===\n");
for (const r of results) {
  console.log(`${r.status}  ${r.n}  ${r.label}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log("");

// 026 — moments + moment_events tables
{
  const m = await supa.from("moments").select("id", { count: "exact", head: true });
  const e = await supa.from("moment_events").select("id", { count: "exact", head: true });
  if (!m.error && !e.error) {
    console.log(`✅  026  moments + moment_events tables`);
    console.log(`        moments rows: ${m.count ?? 0}, moment_events rows: ${e.count ?? 0}`);
  } else {
    console.log(`❌  026  ${m.error?.message || e.error?.message}`);
  }
}

// 027 — seeded rows
{
  const { data, error } = await supa
    .from("moments")
    .select("key, surface, trigger_event")
    .order("key");
  if (error) {
    console.log(`❌  027  seed query failed: ${error.message}`);
  } else {
    console.log(`✅  027  seed rows present: ${data.length}`);
    for (const r of data) console.log(`        ${r.key} (${r.surface}/${r.trigger_event})`);
  }
}
