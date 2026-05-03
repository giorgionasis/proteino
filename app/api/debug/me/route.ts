import { NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = createClient();
  const { data: { session } } = await auth.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const u = session.user;
  const admin = createAdminClient();

  const { data: byId } = await (admin.from("users") as any)
    .select("id, handle, email, avatar_url, display_name")
    .eq("id", u.id)
    .maybeSingle();

  const { data: byEmail } = await (admin.from("users") as any)
    .select("id, handle, email, avatar_url, display_name")
    .eq("email", u.email)
    .maybeSingle();

  // Count suggestions for this user ID
  const { count: suggestionCount } = await (admin.from("suggestions") as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", u.id);

  // Lookup item with full slug (category/slug format)
  const { data: foundItem } = await (admin.from("items") as any)
    .select("id, title, slug")
    .eq("slug", "food/mpakalotaverna")
    .maybeSingle();

  let itemSuggestions: any[] = [];
  if (foundItem) {
    const { data: suggs } = await (admin.from("suggestions") as any)
      .select("id, user_id, rating, users(handle, email)")
      .eq("item_id", foundItem.id)
      .limit(10);
    itemSuggestions = suggs ?? [];
  }

  // Find orphaned user_ids — fetch ALL suggestions in pages of 1000
  const { data: userRows } = await (admin.from("users") as any).select("id").limit(2000);
  const knownIds = new Set((userRows ?? []).map((r: any) => r.id));

  const orphanCounts: Record<string, number> = {};
  let page = 0;
  while (true) {
    const { data: batch } = await (admin.from("suggestions") as any)
      .select("user_id")
      .range(page * 1000, page * 1000 + 999);
    if (!batch || batch.length === 0) break;
    for (const row of batch) {
      if (row.user_id && !knownIds.has(row.user_id)) {
        orphanCounts[row.user_id] = (orphanCounts[row.user_id] ?? 0) + 1;
      }
    }
    if (batch.length < 1000) break;
    page++;
  }

  return NextResponse.json({
    auth: {
      id:        u.id,
      email:     u.email,
      providers: u.app_metadata?.providers,
    },
    db_by_id:          byId,
    suggestions_mine:  suggestionCount,
    orphaned_ids:      orphanCounts,
    mpakalotaverna:    { item: foundItem, suggestions: itemSuggestions },
  });
}

// PATCH: fix email mismatch and upgrade avatar URL
export async function PATCH() {
  const auth = createClient();
  const { data: { session } } = await auth.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "not logged in" }, { status: 401 });
  }

  const u = session.user;
  const admin = createAdminClient();
  const googlePhoto = u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null;

  const updates: Record<string, string> = {};
  if (u.email) updates.email = u.email;
  if (googlePhoto) {
    // Store higher-res version
    updates.avatar_url = googlePhoto.replace(/=s\d+-c$/, "=s400-c");
  }

  const { data, error } = await (admin.from("users") as any)
    .update(updates)
    .eq("id", u.id)
    .select("id, handle, email, avatar_url")
    .single();

  return NextResponse.json({ updated: data, error });
}
