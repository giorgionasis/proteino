import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * sitemap.ts — App Router convention for /sitemap.xml.
 *
 * Strategy:
 *  - Static pages (home, category indexes, leaderboard, support).
 *  - All published items (limited to 5000 — Google's per-sitemap cap is
 *    50K but we keep the response small; a sitemap index can be added
 *    later if the catalogue grows past 5K).
 *
 * Excluded: profile / auth / settings / onboarding / admin / preview /
 *  api — all in robots.ts disallow.
 */

const VALID_CATEGORIES = ["movies", "series", "books", "food", "bars", "hotels", "theater", "events", "recipes"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proteino.gr").replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,            lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${siteUrl}/leaderboard`, lastModified: now, changeFrequency: "daily",   priority: 0.5 },
    { url: `${siteUrl}/support`,     lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/help`,        lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...VALID_CATEGORIES.map((c) => ({
      url:             `${siteUrl}/${c}`,
      lastModified:    now,
      changeFrequency: "daily" as const,
      priority:        0.8,
    })),
  ];

  let itemEntries: MetadataRoute.Sitemap = [];
  try {
    const sb = createAdminClient();
    const { data } = await (sb.from("items") as any)
      .select("slug, modified_at")
      .eq("is_published", true)
      .order("modified_at", { ascending: false })
      .limit(5000);

    itemEntries = ((data ?? []) as Array<{ slug: string; modified_at: string | null }>)
      .filter((r) => typeof r.slug === "string" && r.slug.includes("/"))
      .map((r) => ({
        url:             `${siteUrl}/${r.slug}`,
        lastModified:    r.modified_at ? new Date(r.modified_at) : now,
        changeFrequency: "weekly" as const,
        priority:        0.6,
      }));
  } catch (err) {
    // Sitemap should never 500 — return what we have so Google still
    // discovers the static pages.
    console.error("[sitemap] item fetch failed", err);
  }

  return [...staticEntries, ...itemEntries];
}
