/**
 * One-off recovery: rebuild items.images for bars/etouto-ath1 from
 * the files that are still in Supabase Storage.
 *
 *   npx tsx scripts/restore-etouto-images.ts          # dry-run (default)
 *   npx tsx scripts/restore-etouto-images.ts --apply  # actually write
 *
 * Idempotent: if `images` already has poster + gallery keys we exit
 * without touching the row.
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
const sb = createClient(url, key, { auth: { persistSession: false } });

const apply = process.argv.includes("--apply");
const SLUG = "bars/etouto-ath1";

// Filenames known to belong to this item (admin uploaded between 10:34
// and 10:35 on 2026-05-17 — confirmed from storage listing).
const GALLERY_FILES = [
  { name: "5149613a-d8cb-4f56-88b9-a1ab2df33ef3-etouto-outside1.png", tab: "Εξωτερικά", alt: "Etouto — εξωτερικός χώρος 1" },
  { name: "b01fe570-9c9b-4b03-97b2-9f45f07449da-etouto-outside2.jpg", tab: "Εξωτερικά", alt: "Etouto — εξωτερικός χώρος 2" },
  { name: "e53c4d68-da8c-4e83-adc1-5bbcc00f2efd-etouto-inside1.png",  tab: "Εσωτερικά", alt: "Etouto — εσωτερικός χώρος 1" },
  { name: "6abe28db-b5ec-4315-9648-46374cb4c005-etouto-inside2.jpg",  tab: "Εσωτερικά", alt: "Etouto — εσωτερικός χώρος 2" },
];

async function main() {
  const { data: items, error: itemErr } = await sb
    .from("items")
    .select("id, slug, images")
    .eq("slug", SLUG);
  if (itemErr) throw itemErr;
  const row = items?.[0];
  if (!row) {
    console.error(`No item found for slug "${SLUG}"`);
    process.exit(2);
  }

  const itemId = row.id as string;

  // Idempotency guard — if poster + gallery already populated, exit.
  const existing = (row as any).images;
  const hasPoster = existing && typeof existing === "object" && existing.poster && typeof existing.poster === "object";
  const hasGallery = existing && Array.isArray(existing.gallery) && existing.gallery.length > 0;
  if (hasPoster && hasGallery) {
    console.log("✓ images already reconstructed (poster + gallery both present). Exiting.");
    return;
  }

  // Build URLs.
  const galleryEntries = GALLERY_FILES.map((f) => {
    const { data: pub } = sb.storage.from("media").getPublicUrl(`items-bars/${f.name}`);
    return {
      url: pub.publicUrl,
      tab: f.tab,
      alt: f.alt,
    };
  });

  const posterBase = `items/${itemId}`;
  const pub = (path: string) => sb.storage.from("media").getPublicUrl(path).data.publicUrl;
  const newImages = {
    poster: {
      s:  pub(`${posterBase}/poster-s.webp`),
      m:  pub(`${posterBase}/poster-m.webp`),
      l:  pub(`${posterBase}/poster-l.webp`),
      xl: pub(`${posterBase}/poster-xl.webp`),
    },
    og: pub(`${posterBase}/poster-og.jpg`),
    gallery: galleryEntries,
  };

  console.log("Reconstructed images JSONB:");
  console.log(JSON.stringify(newImages, null, 2));

  if (!apply) {
    console.log("\n(dry-run) Pass --apply to write to the row.");
    return;
  }

  const { error: updErr } = await (sb.from("items") as any)
    .update({ images: newImages })
    .eq("id", itemId);
  if (updErr) {
    console.error("UPDATE failed:", updErr.message);
    process.exit(3);
  }
  console.log("\n✓ items.images written successfully. The detail page + admin gallery should now show the 4 photos.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
