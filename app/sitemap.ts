import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeImageUrl } from "@/lib/image-url";

/**
 * sitemap.ts — App Router convention for /sitemap.xml.
 *
 * Strategy:
 *  - Static pages (home, category indexes, leaderboard, support).
 *  - All published items, read in 1,000-row pages (PostgREST's per-request
 *    cap — a single select silently stopped at 1,000 of ~1,900). Each
 *    entry carries its main image for Google Images. Split into a
 *    sitemap index once the catalogue passes ~40K (Google caps 50K/file).
 *
 * Excluded: profile / auth / settings / onboarding / admin / preview /
 *  api — all in robots.ts disallow.
 */

// Rebuilt hourly — otherwise it is frozen at build time and new items
// only appear after the next deploy.
export const revalidate = 3600;

const PAGE = 1000;
const MAX_ITEMS = 40000;

/** Largest stored main-image width, else the share image, else the cover.
 *  Absolute URL (sitemap images can't be relative). */
function sitemapImage(images: unknown, coverUrl: string | null): string | null {
  const url = pickImage(images, coverUrl);
  if (!url) return null;
  return url.startsWith("/") ? `${SITE_URL}${url}` : url;
}

function pickImage(images: unknown, coverUrl: string | null): string | null {
  const obj = images && typeof images === "object" && !Array.isArray(images) ? (images as Record<string, any>) : null;
  const widths = obj?.main?.widths;
  if (widths && typeof widths === "object") {
    const best = Object.keys(widths).map(Number).filter(Number.isFinite).sort((a, b) => b - a)[0];
    if (best && typeof widths[best] === "string") return safeImageUrl(widths[best]);
  }
  if (typeof obj?.og === "string") return safeImageUrl(obj.og);
  return safeImageUrl(coverUrl);
}

const VALID_CATEGORIES = ["movies", "series", "books", "food", "bars", "hotels", "theater", "events", "recipes"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = SITE_URL;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,            lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${siteUrl}/leaderboard`, lastModified: now, changeFrequency: "daily",   priority: 0.5 },
    { url: `${siteUrl}/support`,     lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/help`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`,       lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${siteUrl}/privacy`,     lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
    ...VALID_CATEGORIES.map((c) => ({
      url:             `${siteUrl}/${c}`,
      lastModified:    now,
      changeFrequency: "daily" as const,
      priority:        0.8,
    })),
  ];

  const itemEntries: MetadataRoute.Sitemap = [];
  try {
    const sb = createAdminClient();
    for (let from = 0; from < MAX_ITEMS; from += PAGE) {
      const { data, error } = await (sb.from("items") as any)
        .select("slug, modified_at, cover_url, images")
        .eq("is_published", true)
        .order("modified_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ slug: string; modified_at: string | null; cover_url: string | null; images: unknown }>;
      for (const r of rows) {
        if (typeof r.slug !== "string" || !r.slug.includes("/")) continue;
        const image = sitemapImage(r.images, r.cover_url);
        itemEntries.push({
          url:             `${siteUrl}/${r.slug}`,
          lastModified:    r.modified_at ? new Date(r.modified_at) : now,
          changeFrequency: "weekly" as const,
          priority:        0.6,
          ...(image ? { images: [image] } : {}),
        });
      }
      if (rows.length < PAGE) break;
    }

    const { data: cols } = await (sb.from("collections") as any)
      .select("alias")
      .eq("is_published", true)
      .limit(PAGE);
    for (const c of (cols ?? []) as Array<{ alias: string | null }>) {
      if (c.alias) itemEntries.push({ url: `${siteUrl}/collections/${c.alias}`, lastModified: now, changeFrequency: "weekly", priority: 0.5 });
    }
  } catch (err) {
    // Sitemap should never 500 — return what we have so Google still
    // discovers the static pages.
    console.error("[sitemap] item fetch failed", err);
  }

  return [...staticEntries, ...itemEntries];
}
