import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/movies-tonight/items?q=text
// Autocomplete: searches movie items by title. Used by the admin's
// "+ New Movie" form to pick an existing item.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const search = (url.searchParams.get("q") ?? "").trim();

  const sb = createAdminClient();
  let q: any = sb
    .from("items")
    .select("id, title, slug, cover_url, item_movies(release_date)")
    .eq("category", "movies")
    .eq("is_published", true)
    .order("title")
    .limit(20);

  if (search) q = q.ilike("title", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((r: any) => {
    const ext = Array.isArray(r.item_movies) ? r.item_movies[0] : r.item_movies;
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      cover_url: r.cover_url,
      year: ext?.release_date ? new Date(ext.release_date).getFullYear() : null,
    };
  });
  return NextResponse.json(items);
}
