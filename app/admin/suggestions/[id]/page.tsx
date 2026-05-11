import { createAdminClient } from "@/lib/supabase/admin";
import { SuggestionEditor } from "@/components/admin/SuggestionEditor";
import { notFound } from "next/navigation";

export default async function SuggestionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  // Three-tier select to handle optional columns from later migrations:
  //   tier 1 — `images` (migration 009) + `original_title` (migration 020)
  //   tier 2 — drop original_title only
  //   tier 3 — drop both
  // If a tier fails with PG error 42703 (column doesn't exist), retry one
  // tier down so the editor still loads with whichever migrations are
  // actually applied.
  // FK disambiguator: suggestions has two FKs to users (user_id + hidden_by from
  // migration 015), so plain `users(...)` returns PGRST201 ambiguous-relationship.
  const tier1 = `
      id, rating, reflection, is_published, created_at, published_at,
      user_id,
      users!suggestions_user_id_fkey(id, display_name),
      items!inner(
        id, title, original_title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, images,
        avg_rating, rating_count, suggestion_count, description_seo, metadata
      )
    `;
  const tier2 = `
      id, rating, reflection, is_published, created_at, published_at,
      user_id,
      users!suggestions_user_id_fkey(id, display_name),
      items!inner(
        id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, images,
        avg_rating, rating_count, suggestion_count, description_seo, metadata
      )
    `;
  const tier3 = `
      id, rating, reflection, is_published, created_at, published_at,
      user_id,
      users!suggestions_user_id_fkey(id, display_name),
      items!inner(
        id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url,
        avg_rating, rating_count, suggestion_count, description_seo, metadata
      )
    `;

  let { data: rawSuggestion, error } = await supabase
    .from("suggestions")
    .select(tier1)
    .eq("id", params.id)
    .single();

  if (error && (error as any).code === "42703") {
    const retry2 = await supabase
      .from("suggestions")
      .select(tier2)
      .eq("id", params.id)
      .single();
    rawSuggestion = retry2.data;
    error = retry2.error;

    if (error && (error as any).code === "42703") {
      const retry3 = await supabase
        .from("suggestions")
        .select(tier3)
        .eq("id", params.id)
        .single();
      rawSuggestion = retry3.data;
      error = retry3.error;
    }
  }

  if (error || !rawSuggestion) notFound();

  const suggestion = rawSuggestion as any;
  const item = suggestion.items;
  const category = item.category as string;

  // Fetch extension table data
  const extTable = `item_${category}` as any;
  const { data: extData } = await supabase
    .from(extTable)
    .select("*")
    .eq("item_id", item.id)
    .single();

  // Fetch subcategories for the category
  const { data: subcategories } = await supabase
    .from("subcategories")
    .select("id, name")
    .eq("category", category)
    .order("display_order");

  // Fetch regions for location-based categories
  let regions: any[] = [];
  if (["food", "bars", "hotels", "theater", "events"].includes(category)) {
    const { data: regionsData } = await supabase
      .from("regions")
      .select("id, name, parent_id")
      .order("display_order");
    regions = regionsData ?? [];
  }

  // Fetch extra field options for this category, grouped by field_group
  const { data: extraOptionsRaw } = await supabase
    .from("extra_field_options")
    .select("field_group, value, label, display_order, is_published")
    .eq("category", category)
    .eq("is_published", true)
    .order("field_group")
    .order("display_order");

  const extraOptions: Record<string, { value: string; label: string }[]> = {};
  for (const o of (extraOptionsRaw ?? []) as any[]) {
    if (!extraOptions[o.field_group]) extraOptions[o.field_group] = [];
    extraOptions[o.field_group].push({ value: o.value, label: o.label });
  }

  return (
    <SuggestionEditor
      suggestion={{
        id: suggestion.id,
        rating: suggestion.rating,
        reflection: suggestion.reflection,
        isPublished: suggestion.is_published,
        createdAt: suggestion.created_at,
        publishedAt: suggestion.published_at,
        userId: suggestion.user_id,
        authorName: (suggestion as any).users.display_name,
      }}
      item={{
        id: item.id,
        title: item.title,
        originalTitle: item.original_title ?? null,
        slug: item.slug,
        category,
        subcategoryId: item.subcategory_id,
        coverUrl: item.cover_url,
        posterUrl: item.poster_url,
        backdropUrl: item.backdrop_url,
        images: Array.isArray(item.images) ? item.images : [],
        avgRating: item.avg_rating,
        ratingCount: item.rating_count,
        suggestionCount: item.suggestion_count,
        descriptionSeo: item.description_seo,
        metadata: item.metadata,
      }}
      extData={extData ?? {}}
      subcategories={subcategories ?? []}
      regions={regions}
      extraOptions={extraOptions}
    />
  );
}
