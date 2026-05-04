import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollectionDetail, type CollectionDetailItem } from "@/components/collections/CollectionDetail";

interface Props {
  params: { alias: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("collections")
    .select("title, title_specific")
    .eq("alias", params.alias)
    .eq("is_published", true)
    .maybeSingle();
  const row = data as { title?: string; title_specific?: string | null } | null;
  if (!row?.title) return { title: "Συλλογή — Proteino" };
  const full = [row.title, row.title_specific].filter(Boolean).join(" ");
  return { title: `${full} — Proteino` };
}

function stripPrefix(slug: string): string {
  const i = slug.indexOf("/");
  return i >= 0 ? slug.slice(i + 1) : slug;
}

export default async function CollectionPage({ params }: Props) {
  const sb = createAdminClient();
  const now = new Date().toISOString();

  // Load the collection
  const { data: rawCollection } = await sb
    .from("collections")
    .select("*")
    .eq("alias", params.alias)
    .eq("is_published", true)
    .maybeSingle();

  const collection = rawCollection as any;
  if (!collection) notFound();

  // Lifecycle window
  if (collection.valid_from && collection.valid_from > now) notFound();
  if (collection.valid_until && collection.valid_until < now) notFound();

  // Fetch matching items
  let q: any = sb
    .from("items")
    .select("id, title, slug, cover_url, category, avg_rating, rating_count, metadata", { count: "exact" })
    .eq("is_published", true)
    .order("avg_rating", { ascending: false })
    .limit(Math.min(Math.max(collection.item_limit ?? 20, 1), 100));

  if (collection.source_category) q = q.eq("category", collection.source_category);

  const tags: string[] = Array.isArray(collection.tags)
    ? collection.tags.filter((t: any) => typeof t === "string" && t.trim())
    : [];
  if (tags.length > 0) q = q.contains("metadata->tags", tags);

  const { data: rawItems, count } = await q;

  const items: CollectionDetailItem[] = (rawItems ?? []).map((it: any) => {
    const itemTags: string[] = it.metadata?.tags ?? [];
    return {
      id: it.id,
      title: it.title,
      cover_url: it.cover_url,
      category: it.category,
      subtitle: itemTags[0] ?? it.category,
      avg_rating: it.avg_rating ?? 0,
      rating_count: it.rating_count ?? 0,
      href: `/${it.category}/${stripPrefix(it.slug)}`,
    };
  });

  return (
    <CollectionDetail
      title={collection.title}
      titleSpecific={collection.title_specific}
      imageUrl={collection.image_url}
      type={collection.type}
      sourceCategory={collection.source_category}
      tags={tags}
      total={count ?? items.length}
      items={items}
    />
  );
}
