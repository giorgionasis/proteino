/**
 * Geocode theater venues (item_theater had 0/44 coordinates, so the
 * theater map was empty). Looks each venue up with Google Places Text
 * Search (Greece, Greek) using the full venue form from the title
 * ("… - θέατρο κρήτης") or "θέατρο <name_place>".
 *
 *   npx tsx scripts/geocode-theaters.ts --dry-run
 *   npx tsx scripts/geocode-theaters.ts            # writes lat/lng (+ address if empty)
 *
 * Only rows without coordinates are touched; results whose name shares
 * no word with the query are skipped (printed as "no confident match").
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
const DRY = process.argv.includes("--dry-run");
const KEY = process.env.GOOGLE_PLACES_API_KEY!;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !["θεατρο", "θεατρικη", "θεατρικος", "θεατρον", "theatre", "theater", "σκηνη", "studio"].includes(w));

async function search(q: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: q, languageCode: "el", regionCode: "GR", maxResultCount: 1 }),
  });
  if (!res.ok) throw new Error(`Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return j.places?.[0] as { displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number } } | undefined;
}

async function main() {
  const { data, error } = await sb
    .from("items")
    .select("id, title, item_theater!inner(item_id, name_place, address, lat, lng)")
    .eq("category", "theater");
  if (error) throw error;

  const cache = new Map<string, Awaited<ReturnType<typeof search>>>();
  let ok = 0, skipped = 0;
  for (const it of data as any[]) {
    const ext = Array.isArray(it.item_theater) ? it.item_theater[0] : it.item_theater;
    if (typeof ext.lat === "number") continue;
    const fromTitle = it.title.includes(" - ") ? it.title.split(" - ").pop() : null;
    const q = `${fromTitle ?? `θέατρο ${ext.name_place ?? ""}`}`.trim();
    if (!cache.has(q)) cache.set(q, await search(q));
    const p = cache.get(q);
    const confident = p?.location && p.displayName && words(q).some((w) => fold(p.displayName!.text).includes(w));
    if (!confident) {
      skipped++;
      console.log(`  ✖ ${q.padEnd(40)} no confident match${p?.displayName ? ` (got "${p.displayName.text}")` : ""}`);
      continue;
    }
    ok++;
    console.log(`  ✓ ${q.padEnd(40)} → ${p!.displayName!.text} · ${p!.formattedAddress}`);
    if (!DRY) {
      await sb.from("item_theater").update({
        lat: p!.location!.latitude,
        lng: p!.location!.longitude,
        ...(ext.address ? {} : { address: p!.formattedAddress ?? null }),
      }).eq("item_id", ext.item_id);
    }
  }
  console.log(`\n${DRY ? "dry run: " : ""}${ok} geocoded, ${skipped} skipped, ${cache.size} distinct venues`);
}

main().catch((e) => { console.error(e); process.exit(1); });
