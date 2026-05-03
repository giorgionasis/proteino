/**
 * Cleans up rows created by scripts/migrate-mysql.ts so the migration can be
 * re-run from scratch.
 *
 * Targets only auth users tagged with user_metadata.source === "k2-migration".
 * Pre-existing dev accounts (e.g. yours) are untouched.
 *
 *   npx tsx scripts/clean-mysql-migration.ts                # dry-run preview
 *   npx tsx scripts/clean-mysql-migration.ts --confirm      # actually delete
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): void {
  const p = resolve(".env.local");
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
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

interface AuthUserRow {
  id: string;
  email: string | null;
  user_metadata?: { source?: string; k2_id?: number; display_name?: string };
}

async function main(): Promise<void> {
  loadEnvLocal();
  const confirm = process.argv.includes("--confirm");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log(`Mode: ${confirm ? "LIVE DELETE" : "DRY-RUN (preview only — pass --confirm to delete)"}\n`);

  // ── 1. Enumerate migration-tagged auth users ──
  console.log("▸ Listing auth users…");
  const targets: AuthUserRow[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = (await supabase.auth.admin.listUsers({ page, perPage: 200 })) as {
      data: { users: AuthUserRow[] };
      error: { message: string } | null;
    };
    if (result.error) { console.error(`  listUsers page ${page}:`, result.error.message); break; }
    const users = result.data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if (u.user_metadata?.source === "k2-migration") targets.push(u);
    }
    if (users.length < 200) break;
  }
  console.log(`  ${targets.length} migration-tagged auth users found.`);

  if (targets.length === 0) {
    console.log("\nNothing to delete — public.users and dependent tables left intact.");
    return;
  }

  // Show a sample of who we'd be deleting.
  console.log("\n  Sample (first 5):");
  for (const u of targets.slice(0, 5)) {
    console.log(`    ${u.id}  ${u.email}  k2_id=${u.user_metadata?.k2_id}`);
  }
  if (targets.length > 5) console.log(`    … and ${targets.length - 5} more`);

  // ── 1b. Enumerate migration-tagged items (filtered by metadata.legacy_k2_id) ──
  // Items are NOT FK'd to users, so a previous partial run leaves orphaned rows
  // here even after the user cleanup cascades through suggestions/ratings.
  console.log("\n▸ Counting migration-created items (metadata.legacy_k2_id IS NOT NULL)…");
  const { count: itemCount, error: itemCountErr } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .not("metadata->legacy_k2_id", "is", null);
  if (itemCountErr) console.error(`  ⚠ count failed: ${itemCountErr.message}`);
  else              console.log(`  ${itemCount ?? 0} migration-created items found.`);

  if (!confirm) {
    console.log("\nDry-run finished. Re-run with --confirm to perform the deletion.");
    return;
  }

  // ── 2a. Delete migration-created items (cascades to extension tables + suggestions + ratings) ──
  if ((itemCount ?? 0) > 0) {
    console.log("\n▸ Deleting migration-created items (cascades to item_*, suggestions, ratings, …)…");
    const { error: itemDelErr, count: itemDeleted } = await supabase
      .from("items")
      .delete({ count: "exact" })
      .not("metadata->legacy_k2_id", "is", null);
    if (itemDelErr) console.error(`  ✖ items delete: ${itemDelErr.message}`);
    else            console.log(`  ${itemDeleted ?? 0} items deleted.`);
  }

  // ── 2b. Delete public.users rows in bulk (cascades to remaining suggestions/comments/…) ──
  console.log("\n▸ Deleting public.users rows (cascades to suggestions, ratings, comments, …)…");
  const ids = targets.map((u) => u.id);
  const CHUNK = 200;
  let deletedPublic = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from("users")
      .delete({ count: "exact" })
      .in("id", slice);
    if (error) {
      console.error(`  ✖ public.users batch ${i}-${i + slice.length}: ${error.message}`);
    } else {
      deletedPublic += count ?? slice.length;
    }
  }
  console.log(`  ${deletedPublic} public.users rows deleted.`);

  // ── 3. Delete auth.users one at a time (no bulk endpoint) ──
  console.log(`\n▸ Deleting ${targets.length} auth users…`);
  let ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const u = targets[i];
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) {
      fail++;
      if (fail <= 10) console.error(`  ✖ ${u.email}: ${error.message}`);
    } else {
      ok++;
    }
    if ((i + 1) % 100 === 0) console.log(`  …${i + 1}/${targets.length}`);
  }
  console.log(`  ${ok} deleted, ${fail} failed.`);

  console.log("\nDone. You can now apply the GRANT + ALTER fixes and re-run the migration.");
}

main().catch((err) => { console.error(err); process.exit(1); });
