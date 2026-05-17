/**
 * Admin layout preview — category page.
 *
 * Renders the same CategoryPageShell as the public /[category] route
 * but with three differences:
 *
 *   1. Audience can be OVERRIDDEN via `?audience=guest|registered|all`
 *      so the admin can preview what each viewer type sees without
 *      logging out.
 *   2. force-dynamic — no ISR, so admin edits land instantly.
 *   3. Lightweight item fetch (no extension tables, no top users, no
 *      tonightAirings, no awards taxonomy) since the preview's only
 *      job is to show the LAYOUT order, not pixel-perfect item data.
 *
 * Lives at /preview/category/[slug] OUTSIDE app/(main)/ so it doesn't
 * inherit the global header / bottom nav / FAB chrome — the admin
 * iframes it inside the phone-bezel preview pane.
 */

import { notFound } from "next/navigation";
import { CATEGORIES } from "@/constants/categories";
import { CategoryPageShell } from "@/components/category/CategoryPageShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePageLayout } from "@/lib/layout/resolver";
import { safeImageUrl } from "@/lib/image-url";
import { CATEGORY_FILTERS } from "@/constants/filters";
import type { CategorySlug } from "@/types";
import type { CategoryItem } from "@/components/category/CategoryCard";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ audience?: string; _?: string }>;
}

export default async function PreviewCategoryPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const cat = CATEGORIES.find((c) => c.slug === params.slug);
  if (!cat) notFound();

  const category = cat.slug as CategorySlug;
  const rawAudience = searchParams.audience;
  const viewerAudience: "registered" | "guest" | null =
    rawAudience === "guest" ? "guest" :
    rawAudience === "registered" ? "registered" :
    rawAudience === "all" ? null :
    "guest"; // default to guest view if param missing

  const sb = createAdminClient();

  // Lightweight item fetch — just enough fields for the shell to render
  // the list + static carousels. Skips extension tables.
  const { data: rawItems } = (await (sb.from("items") as any)
    .select("id, title, slug, cover_url, avg_rating, rating_count, metadata")
    .eq("category", category)
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(30)) as { data: any[] | null };

  const items: CategoryItem[] = (rawItems ?? []).map((r: any) => {
    const tags: string[] = r.metadata?.tags ?? [];
    return {
      id: r.id,
      slug: stripSlugPrefix(r.slug),
      title: r.title,
      subcategory: tags[0] ?? "",
      avg_rating: r.avg_rating ?? 0,
      rating_count: r.rating_count ?? 0,
      cover_url: safeImageUrl(r.cover_url),
      suggestedBy: { names: [], extra: 0 },
      tags,
      suggester: null,
    };
  });

  const layoutSections = await resolvePageLayout(sb, {
    context: "category",
    category,
    viewerAudience,
  });

  return (
    <CategoryPageShell
      category={category}
      items={items}
      totalCount={items.length}
      topUser={null}
      contributors={[]}
      filterData={{ tabs: [], options: {} }}
      filterConfig={CATEGORY_FILTERS[category]}
      regionTree={[]}
      regionChildToParent={{}}
      regionDescendants={{}}
      awardsGroups={undefined}
      tonightAirings={[]}
      layoutSections={layoutSections}
    />
  );
}

function stripSlugPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}
