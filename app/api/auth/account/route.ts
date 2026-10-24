import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DELETE_CONFIRM_WORD as CONFIRM_WORD } from "@/lib/auth/account";

/**
 * DELETE /api/auth/account — self-service account deletion.
 *
 * Body: { confirm: "ΔΙΑΓΡΑΦΗ" } (typed by the user in the confirm modal).
 *
 * 1. anonymize_user() (migration 053) scrubs the public.users row and
 *    deletes personal-only rows. Suggestions + reviews stay, credited
 *    to "Πρώην μέλος", as /privacy promises.
 * 2. Uploaded avatar files are removed from storage.
 * 3. The auth.users row is deleted, so the email can register again
 *    as a brand-new account.
 *
 * Admin accounts are refused — demote first, so the last admin can't
 * lock everyone out by accident.
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (typeof body?.confirm !== "string" || normalizeConfirm(body.confirm) !== CONFIRM_WORD) {
    return NextResponse.json({ error: `Γράψε ${CONFIRM_WORD} για επιβεβαίωση.` }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Profile row: by auth id, then by email (OAuth can mint a new auth id
  // for an existing profile — same fallback as /you and the main layout).
  type Row = { id: string; role: string | null; deleted_at: string | null };
  let { data: profile } = (await (admin.from("users") as any)
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle()) as { data: Row | null };
  if (!profile && user.email) {
    ({ data: profile } = (await (admin.from("users") as any)
      .select("id, role, deleted_at")
      .eq("email", user.email)
      .maybeSingle()) as { data: Row | null });
  }

  if (profile?.role === "admin") {
    return NextResponse.json(
      { error: "Οι λογαριασμοί διαχειριστή δεν διαγράφονται από εδώ." },
      { status: 403 },
    );
  }

  if (profile && !profile.deleted_at) {
    const { error } = await (admin as any).rpc("anonymize_user", { p_user_id: profile.id });
    if (error) {
      console.error("[account delete] anonymize_user failed:", error.message);
      return NextResponse.json({ error: "Η διαγραφή απέτυχε. Δοκίμασε ξανά." }, { status: 500 });
    }

    // Best-effort: uploaded avatars live under media/avatars/<id>/.
    for (const id of new Set([profile.id, user.id])) {
      const { data: files } = await admin.storage.from("media").list(`avatars/${id}`);
      const paths = (files ?? []).map((f) => `avatars/${id}/${f.name}`);
      if (paths.length) await admin.storage.from("media").remove(paths);
    }
  }

  const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
  if (authErr) {
    // The profile is already anonymised (deleted_at set), so a retry
    // skips straight to this step.
    console.error("[account delete] auth deleteUser failed:", authErr.message);
    return NextResponse.json({ error: "Η διαγραφή δεν ολοκληρώθηκε. Δοκίμασε ξανά." }, { status: 500 });
  }

  // Clear this browser's session cookies (the server-side session is
  // already gone with the auth user).
  await sb.auth.signOut({ scope: "local" }).catch(() => {});

  return NextResponse.json({ ok: true });
}

/** "διαγραφή", "Διαγραφη", "ΔΙΑΓΡΑΦΗ" all count. */
function normalizeConfirm(s: string): string {
  return s.trim().normalize("NFD").replace(/\p{M}/gu, "").toLocaleUpperCase("el-GR");
}
