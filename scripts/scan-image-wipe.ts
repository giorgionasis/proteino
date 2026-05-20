/**
 * Damage scan for the image-wipe bug (CLAUDE.md §46).
 *
 * Finds items whose `images` JSONB is missing pipeline-managed poster/
 * backdrop keys even though the pipeline-generated files still exist in
 * `media/items/<id>/`. That's the deterministic signature of a wipe:
 * something wrote {} (or a partial object) over a row that had previously
 * been pipeline-processed.
 *
 *   npx tsx scripts/scan-image-wipe.ts                  # report only
 *   npx tsx scripts/scan-image-wipe.ts --json out.json  # also write JSON
 *   npx tsx scripts/scan-image-wipe.ts --apply          # bulk-restore poster/backdrop/og
 *   npx tsx scripts/scan-image-wipe.ts --limit 10       # scan only first N candidates (testing)
 *
 * Restore is idempotent: a row whose `images.poster` (or `.backdrop`)
 * already references the same URLs is skipped. Gallery uploads under
 * `media/items-<category>/` are NOT auto-restored — those have no
 * deterministic id link and need per-item judgment (see the etouto
 * one-off in scripts/restore-etouto-images.ts).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
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

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const jsonIdx = process.argv.indexOf("--json");
const jsonOut = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;
const limitIdx = process.argv.indexOf("--limit");
const limit = limitIdx > -1 ? Number(process.argv[limitIdx + 1]) : null;

type Slot = "poster" | "backdrop";
type Variants = Partial<Record<"s" | "m" | "l" | "xl", string>>;

interface ItemRow {
  id: string;
  slug: string | null;
  category: string | null;
  title: string | null;
  images: unknown;
  cover_url: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  modified_at: string | null;
}

interface StorageState {
  poster: Variants;
  backdrop: Variants;
  posterOg: string | null;
  backdropOg: string | null;
}

interface Candidate {
  id: string;
  slug: string;
  category: string;
  title: string;
  storage: StorageState;
  currentImages: unknown;
  reason: string[];
}

function pub(path: string): string {
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return Boolean(x) && typeof x === "object" && !Array.isArray(x);
}

function hasPipelineSlot(images: unknown, slot: Slot): boolean {
  if (!isPlainObject(images)) return false;
  const v = images[slot];
  return isPlainObject(v) && Object.keys(v).length > 0;
}

function urlsEqualFor(images: unknown, slot: Slot, fresh: Variants): boolean {
  if (!isPlainObject(images)) return false;
  const cur = images[slot];
  if (!isPlainObject(cur)) return false;
  const keys = new Set([...Object.keys(cur), ...Object.keys(fresh)]) as Set<keyof Variants>;
  for (const k of keys) {
    if ((cur as Variants)[k] !== fresh[k]) return false;
  }
  return true;
}

async function listAllItems(): Promise<ItemRow[]> {
  const out: ItemRow[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("items")
      .select("id, slug, category, title, images, cover_url, poster_url, backdrop_url, modified_at")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`items SELECT failed: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as ItemRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

async function listItemDirs(): Promise<Set<string>> {
  // `media/items/` immediate children are folders named <itemId>.
  const out = new Set<string>();
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const { data, error } = await sb.storage.from("media").list("items", {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`storage list items/ failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) out.add(entry.name);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return out;
}

async function inspectItemFolder(itemId: string): Promise<StorageState> {
  const state: StorageState = { poster: {}, backdrop: {}, posterOg: null, backdropOg: null };
  const { data, error } = await sb.storage.from("media").list(`items/${itemId}`, { limit: 100 });
  if (error) {
    throw new Error(`list items/${itemId}/ failed: ${error.message}`);
  }
  for (const file of data ?? []) {
    const name = file.name;
    // poster-s.webp / backdrop-l.webp / poster-og.jpg / backdrop-og.jpg
    const match = name.match(/^(poster|backdrop)-(s|m|l|xl|og)\.(webp|jpg|jpeg)$/i);
    if (!match) continue;
    const slot = match[1].toLowerCase() as Slot;
    const variant = match[2].toLowerCase();
    const fullPath = `items/${itemId}/${name}`;
    if (variant === "og") {
      if (slot === "poster") state.posterOg = pub(fullPath);
      else state.backdropOg = pub(fullPath);
    } else {
      state[slot][variant as keyof Variants] = pub(fullPath);
    }
  }
  return state;
}

function diagnoseCandidate(row: ItemRow, st: StorageState): Candidate | null {
  const reasons: string[] = [];
  const posterPresent = Object.keys(st.poster).length > 0;
  const backdropPresent = Object.keys(st.backdrop).length > 0;
  if (!posterPresent && !backdropPresent) return null; // no pipeline state — skip

  if (posterPresent && !hasPipelineSlot(row.images, "poster")) {
    reasons.push(`poster wiped (storage has ${Object.keys(st.poster).sort().join("/")} variants)`);
  }
  if (backdropPresent && !hasPipelineSlot(row.images, "backdrop")) {
    reasons.push(`backdrop wiped (storage has ${Object.keys(st.backdrop).sort().join("/")} variants)`);
  }
  if (reasons.length === 0) return null;

  return {
    id: row.id,
    slug: row.slug ?? "(no slug)",
    category: row.category ?? "(no category)",
    title: row.title ?? "(no title)",
    storage: st,
    currentImages: row.images,
    reason: reasons,
  };
}

function buildRestoreImages(currentImages: unknown, st: StorageState): Record<string, unknown> {
  // Preserve gallery + any pipeline slot already present, fill in only
  // the slots that are missing from `currentImages` but present in
  // storage (idempotency).
  const base: Record<string, unknown> = isPlainObject(currentImages)
    ? { ...currentImages }
    : {};

  const wantPoster = Object.keys(st.poster).length > 0 && !hasPipelineSlot(currentImages, "poster");
  const wantBackdrop = Object.keys(st.backdrop).length > 0 && !hasPipelineSlot(currentImages, "backdrop");

  if (wantPoster) base.poster = st.poster;
  if (wantBackdrop) base.backdrop = st.backdrop;
  if (!base.og && (st.posterOg || st.backdropOg)) {
    base.og = st.posterOg ?? st.backdropOg;
  }
  return base;
}

async function applyRestore(row: ItemRow, restored: Record<string, unknown>): Promise<void> {
  const update: Record<string, unknown> = { images: restored };
  // Also rehydrate legacy columns if they're null but pipeline has the URL.
  if (!row.poster_url && isPlainObject(restored.poster)) {
    const p = restored.poster as Variants;
    update.poster_url = p.l ?? p.m ?? p.xl ?? p.s ?? null;
  }
  if (!row.backdrop_url && isPlainObject(restored.backdrop)) {
    const b = restored.backdrop as Variants;
    update.backdrop_url = b.l ?? b.m ?? b.xl ?? b.s ?? null;
  }
  const { error } = await (sb.from("items") as any).update(update).eq("id", row.id);
  if (error) throw new Error(`update ${row.id} failed: ${error.message}`);
}

async function main() {
  const t0 = Date.now();
  console.log("Loading items + storage index…");
  const [items, dirs] = await Promise.all([listAllItems(), listItemDirs()]);
  console.log(`  ${items.length} items, ${dirs.size} folders under media/items/`);

  // Pre-filter: only items whose folder exists in storage AND whose
  // `images` shape is missing poster OR backdrop. Saves storage listing
  // calls for the 75%+ of rows that are clean.
  const worthDeepCheck = items.filter((it) => {
    if (!dirs.has(it.id)) return false;
    const missingPoster = !hasPipelineSlot(it.images, "poster");
    const missingBackdrop = !hasPipelineSlot(it.images, "backdrop");
    return missingPoster || missingBackdrop;
  });
  console.log(`  ${worthDeepCheck.length} candidates to deep-check (have storage folder but missing pipeline keys)`);

  const scope = limit ? worthDeepCheck.slice(0, limit) : worthDeepCheck;
  if (limit) console.log(`  (--limit ${limit} → scanning first ${scope.length})`);

  const candidates: Candidate[] = [];
  let scanned = 0;
  for (const row of scope) {
    scanned++;
    if (scanned % 25 === 0) {
      process.stdout.write(`\r  scanning ${scanned}/${scope.length}…`);
    }
    try {
      const st = await inspectItemFolder(row.id);
      const diag = diagnoseCandidate(row, st);
      if (diag) candidates.push(diag);
    } catch (err) {
      console.warn(`\n  ! list items/${row.id}/ failed: ${(err as Error).message}`);
    }
  }
  process.stdout.write(`\r  scanned ${scanned}/${scope.length}.       \n`);

  console.log(`\n=== Summary ===`);
  console.log(`Total items:               ${items.length}`);
  console.log(`Items with storage folder: ${dirs.size}`);
  console.log(`Deep-checked:              ${scope.length}`);
  console.log(`Wiped candidates:          ${candidates.length}`);

  if (candidates.length === 0) {
    console.log(`\nNo affected rows. Scan finished in ${Math.round((Date.now() - t0) / 100) / 10}s.`);
    return;
  }

  const byCategory = new Map<string, number>();
  for (const c of candidates) {
    byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);
  }
  console.log(`\nBy category:`);
  for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(12)} ${n}`);
  }

  console.log(`\nFirst 20 affected rows:`);
  for (const c of candidates.slice(0, 20)) {
    console.log(`  [${c.category}] ${c.slug}  —  ${c.reason.join("; ")}`);
  }
  if (candidates.length > 20) console.log(`  …and ${candidates.length - 20} more`);

  if (jsonOut) {
    writeFileSync(
      jsonOut,
      JSON.stringify(
        candidates.map((c) => ({
          id: c.id,
          slug: c.slug,
          category: c.category,
          title: c.title,
          reason: c.reason,
          restoreToImages: buildRestoreImages(c.currentImages, c.storage),
        })),
        null,
        2,
      ),
      "utf8",
    );
    console.log(`\nWrote ${candidates.length} entries to ${jsonOut}`);
  }

  if (!apply) {
    console.log(`\n(dry-run) Pass --apply to write the restore for all ${candidates.length} rows.`);
    console.log(`Scan finished in ${Math.round((Date.now() - t0) / 100) / 10}s.`);
    return;
  }

  console.log(`\nApplying restore to ${candidates.length} rows…`);
  let ok = 0;
  let fail = 0;
  for (const c of candidates) {
    // Build restore using the actual row we have on hand. Refetch the
    // images blob immediately before write to guard against concurrent
    // edits during the scan window.
    const { data: fresh, error } = await sb
      .from("items")
      .select("id, slug, images, poster_url, backdrop_url")
      .eq("id", c.id)
      .single();
    if (error || !fresh) {
      fail++;
      console.warn(`  ! refetch ${c.id} failed: ${error?.message ?? "no row"}`);
      continue;
    }
    const restored = buildRestoreImages((fresh as ItemRow).images, c.storage);
    // Idempotency: if both slots match already, skip.
    const posterSame = urlsEqualFor(fresh.images, "poster", c.storage.poster);
    const backdropSame = urlsEqualFor(fresh.images, "backdrop", c.storage.backdrop);
    const needPoster = Object.keys(c.storage.poster).length > 0 && !posterSame;
    const needBackdrop = Object.keys(c.storage.backdrop).length > 0 && !backdropSame;
    if (!needPoster && !needBackdrop) {
      continue;
    }
    try {
      await applyRestore(fresh as ItemRow, restored);
      ok++;
      if (ok <= 5 || ok % 25 === 0) {
        console.log(`  ✓ restored ${c.slug}`);
      }
    } catch (err) {
      fail++;
      console.warn(`  ! ${c.slug}: ${(err as Error).message}`);
    }
  }
  console.log(`\nRestore done: ${ok} succeeded, ${fail} failed. (${Math.round((Date.now() - t0) / 100) / 10}s total)`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
