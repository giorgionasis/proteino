import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/auth/password
 *   body: { currentPassword: string, newPassword: string }
 *
 * Two steps for safety:
 *   1. Re-authenticate with the current password via `signInWithPassword`.
 *      Supabase does NOT verify the current password during `updateUser`,
 *      so we verify it ourselves first. Prevents a stolen session cookie
 *      from changing the password.
 *   2. Call `updateUser({ password })` to apply the new one.
 *
 * Validation rules mirror the registration form (min 8 chars, at least
 * one uppercase, at least one digit) so password requirements stay
 * consistent across surfaces.
 */
export async function PATCH(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword     = typeof body.newPassword     === "string" ? body.newPassword     : "";

  if (!currentPassword) {
    return NextResponse.json({ error: "Δώσε τον τρέχοντα κωδικό" }, { status: 400 });
  }
  if (!validatePassword(newPassword)) {
    return NextResponse.json(
      { error: "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες, ένα κεφαλαίο και έναν αριθμό" },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "Ο νέος κωδικός είναι ίδιος με τον τρέχοντα" }, { status: 400 });
  }

  // 1. Verify current password by attempting a sign-in. The returned
  //    session is identical to the one already on the cookie, so this
  //    is a pure check.
  const verifyRes = await sb.auth.signInWithPassword({
    email:    user.email,
    password: currentPassword,
  });
  if (verifyRes.error) {
    return NextResponse.json({ error: "Λάθος τρέχων κωδικός" }, { status: 400 });
  }

  // 2. Update.
  const updateRes = await sb.auth.updateUser({ password: newPassword });
  if (updateRes.error) {
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function validatePassword(p: string): boolean {
  if (p.length < 8) return false;
  if (!/[A-Z]/.test(p)) return false;
  if (!/[0-9]/.test(p)) return false;
  return true;
}
