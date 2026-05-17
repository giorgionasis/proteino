import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/constants/categories";
import { SuggestionsCategoryList } from "@/components/profile/suggestions/SuggestionsCategoryList";
import { safeImageUrl } from "@/lib/image-url";

interface Props { params: Promise<{ handle: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return { title: `Προτάσεις @${params.handle} — Proteino` };
}

export default async function SuggestionsPage(props: Props) {
  const params = await props.params;
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, handle")
    .eq("handle", params.handle)
    .maybeSingle();
  if (!user) notFound();

  const { data: sugs } = await supabase
    .from("suggestions")
    .select(`
      id, created_at,
      items!inner(category, cover_url, poster_url)
    `)
    .eq("user_id", (user as any).id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Aggregate by category — count + up to 3 most-recent covers per group
  const byCategory = new Map<string, { count: number; covers: string[] }>();
  for (const s of (sugs ?? []) as any[]) {
    const cat = s.items?.category as string;
    if (!cat) continue;
    if (!byCategory.has(cat)) byCategory.set(cat, { count: 0, covers: [] });
    const entry = byCategory.get(cat)!;
    entry.count++;
    if (entry.covers.length < 3) {
      const cover = safeImageUrl(s.items.poster_url) ?? safeImageUrl(s.items.cover_url);
      if (cover) entry.covers.push(cover);
    }
  }

  // Build display order using the canonical category list, dropping empty
  const groups = CATEGORIES
    .map((c) => {
      const entry = byCategory.get(c.slug);
      if (!entry || entry.count === 0) return null;
      return {
        slug: c.slug,
        label: c.labelEl,
        count: entry.count,
        covers: entry.covers,
        overflow: Math.max(0, entry.count - entry.covers.length),
      };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const total = (sugs ?? []).length;

  return (
    <SuggestionsCategoryList
      handle={params.handle}
      groups={groups}
      total={total}
    />
  );
}
