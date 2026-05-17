import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * DELETE /api/auth/identities/[provider]
 *
 * Unlinks a social identity (Google, Facebook, …) from the current
 * user. Server enforces that:
 *   - the identity is currently linked
 *   - the user has at least one other authentication method left
 *     (another identity OR an email/password). Otherwise unlinking
 *     would lock them out.
 *
 * Supabase `auth.unlinkIdentity()` accepts the full identity object
 * (not just provider name), so we read identities first to find the
 * matching row, then unlink it.
 */
interface RouteParams {
  params: Promise<{ provider: string }>;
}

export async function DELETE(_req: NextRequest, props: RouteParams) {
  const params = await props.params;
  const sb = await createClient();
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identities = user.identities ?? [];
  const target     = identities.find((i) => i.provider === params.provider);
  if (!target) {
    return NextResponse.json({ error: "Αυτή η σύνδεση δεν είναι ενεργή" }, { status: 404 });
  }

  // Lockout guard: at least one OTHER authentication path must remain
  // (another social identity OR the "email" identity created when the
  // user has a password). We treat presence of any other provider as
  // sufficient.
  const others = identities.filter((i) => i.id !== target.id);
  if (others.length === 0) {
    return NextResponse.json(
      { error: "Δεν μπορείς να αποσυνδέσεις την τελευταία μέθοδο εισόδου. Όρισε πρώτα κωδικό ή σύνδεσε άλλο πάροχο." },
      { status: 400 },
    );
  }

  const { error } = await sb.auth.unlinkIdentity(target as any);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
