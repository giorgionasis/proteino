import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollectionEditor, type CollectionFormData, type Placement } from "@/components/admin/CollectionEditor";

export const dynamic = "force-dynamic";

export default async function EditCollectionPage({ params }: { params: { id: string } }) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("collections")
    .select("*, page_sections(*)")
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  const row = data as any;
  const placements: Placement[] = (row.page_sections ?? []).map((p: any) => ({
    context: p.context,
    category: p.category,
  }));

  const initial: Partial<CollectionFormData> & { id: string } = {
    id: row.id,
    type: row.type,
    title: row.title ?? "",
    title_specific: row.title_specific ?? "",
    alias: row.alias ?? "",
    image_url: row.image_url ?? "",
    source_category: row.source_category ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    filters: Array.isArray(row.filters) ? row.filters : [],
    item_limit: row.item_limit ?? 20,
    is_published: row.is_published ?? true,
    target_audience: row.target_audience ?? "all",
    valid_from: row.valid_from ? row.valid_from.slice(0, 10) : "",
    valid_until: row.valid_until ? row.valid_until.slice(0, 10) : "",
    placements,
  };

  return <CollectionEditor initial={initial} />;
}
