import { UsersTable, type UserRow } from "@/components/admin/UsersTable";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function UsersPage() {
  const sb = createAdminClient();

  // Mirror the default-scope client query: sort=Recent Registered,
  // page=1, no search. The table's skip-flag keeps the seeded result
  // on first mount; sort / search / pagination changes refetch
  // normally through the existing useEffect path.
  const { data, count } = await sb
    .from("users")
    .select(
      "id, handle, display_name, email, avatar_url, level, suggestion_count, rating_count, last_login_at, created_at, is_verified, admin_warnings",
      { count: "exact" }
    )
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(0, PAGE_SIZE - 1);

  const initialRows: UserRow[] = ((data ?? []) as any[]).map((u) => ({
    id: u.id,
    handle: u.handle,
    name: u.display_name,
    email: u.email,
    avatarUrl: u.avatar_url,
    level: u.level,
    suggestions: u.suggestion_count,
    ratingCount: u.rating_count,
    lastLogin: u.last_login_at,
    registered: u.created_at,
    isVerified: u.is_verified,
    warnings: Array.isArray(u.admin_warnings) ? u.admin_warnings : [],
  }));

  return <UsersTable initialRows={initialRows} initialTotal={count ?? 0} />;
}
