import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Auth gate for every `/api/admin/*` handler.
 *
 * The proxy deliberately skips `/api/` and only checks cookie presence, and
 * admin routes write with the service-role client (bypasses RLS) — so this
 * check is the ONLY thing standing between the public internet and admin
 * writes. Every exported handler under app/api/admin must call it first:
 *
 *   const gate = await requireAdmin();
 *   if (gate instanceof NextResponse) return gate;
 *
 * `scripts/check-admin-gates.mjs` fails if a handler is missing the call.
 *
 * Mirrors app/admin/layout.tsx: `ADMIN_DEV_BYPASS=1` is honoured only
 * outside production (userId is null in that case).
 */
export async function requireAdmin(): Promise<{ userId: string | null } | NextResponse> {
  if (process.env.ADMIN_DEV_BYPASS === "1" && process.env.NODE_ENV !== "production") {
    return { userId: null };
  }

  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { data: me } = await createAdminClient()
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if ((me as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return { userId: user.id };
  } catch (err) {
    console.error("[requireAdmin]", err);
    return NextResponse.json({ error: "Auth check failed" }, { status: 500 });
  }
}
