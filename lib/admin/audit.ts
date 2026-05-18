import { createClient } from "@/lib/supabase/server";

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
