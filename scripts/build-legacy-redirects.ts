/**
 * Builds lib/redirects/legacy-map.json — the lookup table proxy.ts uses to
 * 301 old Joomla/K2 URLs (www.proteino.gr before the cutover) to the new
 * routes. Run after any bulk item/user change, then commit the JSON:
 *
 *   npx tsx scripts/build-legacy-redirects.ts
 *
 * Sources:
 *   items.metadata.legacy_alias / legacy_k2_id  → item paths
 *   auth user_metadata.k2_id + public.users.handle → profile handles
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { normalizeLegacyAlias } from "../lib/redirects/legacy";

config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const OUT = path.join(__dirname, "../lib/redirects/legacy-map.json");

async function main() {
  // ── Items ────────────────────────────────────────────────────────────
  const items: { slug: string; category: string; alias: string | null; k2: number | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("items")
      .select("slug, category, is_published, alias:metadata->>legacy_alias, k2:metadata->>legacy_k2_id")
      .not("metadata->legacy_k2_id", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data as any[]) {
      if (r.is_published === false || !r.slug?.includes("/")) continue;
      items.push({ slug: r.slug, category: r.category, alias: r.alias, k2: r.k2 ? Number(r.k2) : null });
    }
    if (data.length < 1000) break;
  }

  // alias → { category → path }. Same alias can exist in two categories
  // (a book and its film); proxy disambiguates with the old URL's section.
  const byAlias: Record<string, Record<string, string>> = {};
  const byK2Id: Record<string, string> = {};
  for (const it of items) {
    const newPath = `/${it.slug}`;
    if (it.k2) byK2Id[it.k2] = newPath;
    if (!it.alias) continue;
    const key = normalizeLegacyAlias(it.alias);
    (byAlias[key] ??= {})[it.category] = newPath;
  }

  // ── Users ────────────────────────────────────────────────────────────
  const k2ToAuthId = new Map<number, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      const k2 = Number(u.user_metadata?.k2_id);
      if (k2) k2ToAuthId.set(k2, u.id);
    }
    if (data.users.length < 1000) break;
  }
  const { data: users, error: uErr } = await sb.from("users").select("id, handle");
  if (uErr) throw uErr;
  const handleById = new Map((users ?? []).map((u: any) => [u.id, u.handle as string]));
  const usersByK2Id: Record<string, string> = {};
  for (const [k2, authId] of k2ToAuthId) {
    const handle = handleById.get(authId);
    if (handle) usersByK2Id[k2] = handle;
  }

  const map = { generatedAt: new Date().toISOString(), byAlias, byK2Id, usersByK2Id };
  fs.writeFileSync(OUT, JSON.stringify(map));
  console.log(
    `wrote ${path.relative(process.cwd(), OUT)}: ${Object.keys(byAlias).length} aliases, ` +
    `${Object.keys(byK2Id).length} k2 ids, ${Object.keys(usersByK2Id).length} users ` +
    `(${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`,
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
