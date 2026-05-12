import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout-all
 *
 * Revokes ALL refresh tokens for the current user across every
 * device by signing out with global scope. The local session cookie
 * is also cleared. After this fires, every active session (this one
 * included) becomes invalid on next auth check.
 *
 * Use case: "Αποσύνδεση από όλες τις συσκευές" on the security page.
 */
export async function POST() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await sb.auth.signOut({ scope: "global" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
