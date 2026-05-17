import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/reviews/[id]/hide
 * Body: { hide: boolean; reason: string | null }
 *
 * Toggles `reviews.is_hidden` + sets hidden_at / hidden_reason / hidden_by.
 * Service-role write; auth gate is admin role on `public.users`.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });

  // Auth gate — must be admin.
  const sbAuth = await createClient();
  const {
    data: { user },
  } = await sbAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const sbAdmin = createAdminClient();
  const { data: me } = await sbAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((me as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { hide?: boolean; reason?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const willHide = !!body.hide;
  const reason = body.reason?.trim() ?? null;

  if (willHide && (!reason || reason.length < 5)) {
    return NextResponse.json(
      { error: "A reason of ≥5 characters is required when hiding." },
      { status: 400 }
    );
  }

  const patch = willHide
    ? {
        is_hidden: true,
        hidden_at: new Date().toISOString(),
        hidden_reason: reason,
        hidden_by: user.id,
      }
    : {
        is_hidden: false,
        hidden_at: null,
        hidden_reason: null,
        hidden_by: null,
      };

  const { error } = await (sbAdmin.from("reviews") as any).update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
