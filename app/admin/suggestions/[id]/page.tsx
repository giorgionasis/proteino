import { createAdminClient } from "@/lib/supabase/admin";
import { SuggestionEditor } from "@/components/admin/SuggestionEditor";
import { notFound } from "next/navigation";

export default async function SuggestionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  // Try with the new `items.images` column first (post migration 009).
  // If the column doesn't exist yet (Postgres error 42703), retry without it
  // so the editor still loads — admin can run the migration when convenient.
  // FK disambiguator: suggestions has two FKs to users (user_id + hidden_by from
  // migration 015), so plain `users(...)` returns PGRST201 ambiguous-relationship.
  const fullSelect = `
      id, rating, reflection, is_published, created_at, published_at,
      user_id,
      users!suggestions_user_id_fkey(id, display_name),
      items!inner(
        id, title, slug, category, subcategory_id, cover_url, poster_url, backdrop_url, images,
        avg_rating, rating_count, suggestion_count, description_seo, metadata
      )
    `;
  const fallbackSelect = `
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
    .select(fullSelect)
    .eq("id", params.id)
    .single();

  if (error && (error as any).code === "42703") {
    const retry = await supabase
      .from("suggestions")
      .select(fallbackSelect)
      .eq("id", params.id)
      .single();
    rawSuggestion = retry.data;
    error = retry.error;
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
