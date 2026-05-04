import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/collections/tags?category=movies&q=mar
// Returns tag suggestions (with counts) from items.metadata.tags filtered
// by category and search text. Powers the admin's tag autocomplete.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const search = (url.searchParams.get("q") ?? "").toLowerCase().trim();

  const supabase = createAdminClient();
  let q: any = supabase
    .from("items")
    .select("metadata")
    .eq("is_published", true)
    .limit(2000);

  if (category) q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    const tags: string[] = row.metadata?.tags ?? [];
    for (const t of tags) {
      if (typeof t !== "string") continue;
      const trimmed = t.trim();
      if (!trimmed) continue;
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }

  const results = Array.from(counts.entries())
    .filter(([t]) => !search || t.toLowerCase().includes(search))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([tag, count]) => ({ tag, count }));

  return NextResponse.json(results);
}
