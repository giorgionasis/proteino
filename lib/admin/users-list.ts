import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRow } from "@/components/admin/UsersTable";

/**
 * Server-side query behind /admin/users (first paint) and
 * GET /api/admin/users (search / sort / pagination). Reads private
 * columns (email, admin_warnings, last_login_at) — call only with the
 * service-role client, after requireAdmin(). Migration 047 revoked
 * these columns from the browser roles.
 */

export const USERS_PAGE_SIZE = 10;

export const USER_SORT_OPTIONS = [
  { label: "Recent Registered", column: "created_at",       ascending: false },
  { label: "Old Registered",    column: "created_at",       ascending: true  },
  { label: "Most Suggestions",  column: "suggestion_count", ascending: false },
  { label: "Recent Login",      column: "last_login_at",    ascending: false },
] as const;

export async function fetchAdminUsers(
  sb: SupabaseClient,
  { search = "", sortIdx = 0, page = 1 }: { search?: string; sortIdx?: number; page?: number },
): Promise<{ rows: UserRow[]; total: number; error: string | null }> {
  const sort = USER_SORT_OPTIONS[sortIdx] ?? USER_SORT_OPTIONS[0];

  let query = sb
    .from("users")
    .select(
      "id, handle, display_name, email, avatar_url, level, suggestion_count, rating_count, last_login_at, created_at, is_verified, admin_warnings",
      { count: "exact" },
    );

  // Strip PostgREST filter syntax so the term can't break out of `.or()`.
  const term = search.replace(/[,()*\\]/g, " ").trim();
  if (term) {
    query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%,handle.ilike.%${term}%`);
  }

  const from = (Math.max(1, page) - 1) * USERS_PAGE_SIZE;
  const { data, count, error } = await query
    .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
    .range(from, from + USERS_PAGE_SIZE - 1);

  if (error) return { rows: [], total: 0, error: error.message };

  const rows: UserRow[] = ((data ?? []) as any[]).map((u) => ({
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

  return { rows, total: count ?? 0, error: null };
}
