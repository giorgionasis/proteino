/**
 * Admin layout preview — home page.
 *
 * Mirrors /preview/category/[slug]: force-dynamic, audience-aware via
 * `?audience=guest|registered|all`, lightweight per-category fetches
 * (enough for the bridge to render but skipping the heavier work in
 * the live home page like region soft-sort, top users, AIChips count,
 * SuggestionFeed feed items, MoviesTonight airings).
 *
 * Renders via the shared renderHomeSection bridge in
 * lib/layout/home-bridge.tsx — same code path the live home uses, so
 * what the admin sees is byte-identical to what users will see.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePageLayout } from "@/lib/layout/resolver";
import { renderHomeSection } from "@/lib/layout/home-bridge";
import { safeImageUrl } from "@/lib/image-url";
import type { LandscapeItem } from "@/components/recommendation/CarouselLandscape";
import type { PortraitItem } from "@/components/recommendation/CarouselPortrait";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { audience?: string; _?: string };
}

export default async function PreviewHomePage({ searchParams }: Props) {
  const rawAudience = searchParams.audience;
  const viewerAudience: "registered" | "guest" | null =
    rawAudience === "guest" ? "guest" :
    rawAudience === "registered" ? "registered" :
    rawAudience === "all" ? null :
    "guest";
  const isRegistered = viewerAudience === "registered";

  const sb = createAdminClient();

  // Lightweight per-category fetches. The bridge slices these for
  // static_carousel rows. Limits chosen so any reasonable static_carousel
  // config (offset+limit) has items to render.
  const [movies, series, books, food, recipes, layoutSections] = await Promise.all([
    fetchLightweight(sb, "movies", "portrait", 15),
    fetchLightweight(sb, "series", "portrait", 15),
    fetchLightweight(sb, "books",  "portrait", 15),
    fetchLightweight(sb, "food",    "landscape", 15),
    fetchLightweight(sb, "recipes", "landscape", 15),
    resolvePageLayout(sb, {
      context: "home",
      category: null,
      viewerAudience,
    }),
  ]);

  return (
    <div className="space-y-10 bg-white">
      {layoutSections.length === 0 ? (
        <EmptyHomePreview audience={rawAudience ?? "guest"} />
      ) : (
        layoutSections.map((section) =>
          renderHomeSection(section, {
            isRegistered,
            displayName: isRegistered ? "Preview" : "",
            food: food as LandscapeItem[],
            movies: movies as PortraitItem[],
            series: series as PortraitItem[],
            books: books as PortraitItem[],
            recipes: recipes as LandscapeItem[],
            // The four context fields below are not critical for layout
            // preview — feedItems / topUsers / chips render mostly cosmetic
            // sub-sections; tonight is conditional. Stubs keep the bridge
            // happy without extra queries.
            topUsers: [],
            chips: [],
            feedItems: [],
            tonight: [],
            suggestionCount: 0,
          })
        )
      )}
    </div>
  );
}

/* ─── Lightweight per-category fetch ───────────────────────────────── */

async function fetchLightweight(
  sb: ReturnType<typeof createAdminClient>,
  category: "movies" | "series" | "books" | "food" | "recipes",
  shape: "portrait" | "landscape",
  limit: number,
): Promise<unknown[]> {
  const { data } = (await (sb.from("items") as any)
    .select("id, title, slug, cover_url, avg_rating, rating_count, metadata")
    .eq("category", category)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(limit)) as { data: any[] | null };

  return (data ?? []).map((r) => {
    const tags: string[] = r.metadata?.tags ?? [];
    const slug = stripSlugPrefix(r.slug);
    if (shape === "portrait") {
      return {
        id: r.id,
        title: r.title,
        cover_url: safeImageUrl(r.cover_url),
        genre: tags[0],
        avg_rating: r.avg_rating,
        href: `/${category}/${slug}`,
      } as PortraitItem;
    }
    return {
      id: r.id,
      title: r.title,
      cover_url: safeImageUrl(r.cover_url),
      subtitle: tags[0],
      avg_rating: r.avg_rating,
      rating_count: r.rating_count,
      is_top_rated: r.avg_rating >= 4.5 && r.rating_count >= 5,
      href: `/${category}/${slug}`,
      avatar_url: null,
      suggester: null,
    } as LandscapeItem;
  });
}

function stripSlugPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

/* ─── Empty state ──────────────────────────────────────────────────── */

function EmptyHomePreview({ audience }: { audience: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-8 text-center">
      <div className="max-w-sm">
        <div className="text-5xl mb-4" aria-hidden>🏠</div>
        <h1 className="text-lg font-bold text-zinc-900 mb-2">Καμία section</h1>
        <p className="text-sm text-zinc-600">
          Δεν υπάρχουν active sections για audience <span className="font-semibold">{audience}</span>.
          Πρόσθεσε ενότητες από το /admin/layout.
        </p>
      </div>
    </div>
  );
}
