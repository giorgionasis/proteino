import { createClient } from "@/lib/supabase/server";

/** Lightweight shape of an admin user as needed by the audit footer. */
export interface AdminUserStub {
  id:           string;
  handle:       string | null;
  display_name: string | null;
}

/** Map keyed by user id → minimal display info. Used by `<RowAuditFooter>`. */
export type AdminUserMap = Record<string, AdminUserStub>;

/**
 * Resolves the auth user id of the admin currently calling an admin
 * route. Returns null if there is no session — the caller should
 * decide whether to bail or just skip the stamp.
 */
export async function getAdminAuditUserId(): Promise<string | null> {
  try {
    const sb = await createClient();
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the audit stamps to merge into an UPDATE patch. Both fields
 * are added together so a partial schema (only modified_at, missing
 * modified_by — won't happen, but) doesn't end up half-stamped.
 *
 * Call sites should pass this through `withAuditStamps(patch, userId)`
 * and use `executeWithAuditFallback` to handle environments where the
 * migration 040 columns aren't applied yet.
 */
export function withAuditStamps<T extends Record<string, unknown>>(
  patch: T,
  userId: string | null,
): T & { modified_by: string | null; modified_at: string } {
  return {
    ...patch,
    modified_by: userId,
    modified_at: new Date().toISOString(),
  };
}

/**
 * Run a Supabase update, retry once without audit stamps if Postgres
 * complains about the column not existing (42703). Lets the same code
 * work in environments where migration 040 hasn't been applied yet.
 *
 *   const result = await executeWithAuditFallback(
 *     (stamped) => sb.from("moments").update(stamped).eq("id", id).select("*").single(),
 *     patch, userId,
 *   );
 */
export async function executeWithAuditFallback<T>(
  runner: (stamped: Record<string, unknown>) => Promise<{ data: T | null; error: { code?: string; message: string } | null }>,
  basePatch: Record<string, unknown>,
  userId: string | null,
): Promise<{ data: T | null; error: { code?: string; message: string } | null }> {
  const stamped = withAuditStamps(basePatch, userId);
  const first = await runner(stamped);
  if (first.error && first.error.code === "42703") {
    return runner(basePatch);
  }
  return first;
}

/**
 * Resolve the `modified_by` ids on a list of rows into an
 * `AdminUserMap`. Use this from server components feeding the manager
 * UIs so they can pass a static map down rather than each row firing
 * its own lookup. Safe to call with rows that don't have stamps yet —
 * returns an empty map.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveAdminUserMap<T extends { modified_by?: string | null }>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  rows: T[],
): Promise<AdminUserMap> {
  const ids = Array.from(
    new Set(rows.map((r) => r.modified_by).filter((v): v is string => !!v)),
  );
  if (ids.length === 0) return {};
  const { data } = await sb
    .from("users")
    .select("id, handle, display_name")
    .in("id", ids);
  const map: AdminUserMap = {};
  for (const u of (data ?? []) as AdminUserStub[]) {
    map[u.id] = u;
  }
  return map;
}

/**
 * Batch variant — stamps every row in the array, retries the whole
 * insert without stamps if Postgres complains about a missing column.
 */
export async function executeManyWithAuditFallback<T>(
  runner: (stamped: Record<string, unknown>[]) => Promise<{ data: T | null; error: { code?: string; message: string } | null }>,
  baseRows: Record<string, unknown>[],
  userId: string | null,
): Promise<{ data: T | null; error: { code?: string; message: string } | null }> {
  const stamped = baseRows.map((row) => withAuditStamps(row, userId));
  const first = await runner(stamped);
  if (first.error && first.error.code === "42703") {
    return runner(baseRows);
  }
  return first;
}
