import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET  /api/profile/preferences            → current user's prefs object
 * PATCH /api/profile/preferences           → shallow-merge into prefs
 *
 * The preferences column on `users` is a single jsonb so each surface
 * (personalisation, notifications, tooltips, …) can write its own
 * key without conflicting with the others. PATCH does a *shallow*
 * merge at the top level: passing `{ interests: [...] }` replaces
 * just `interests`, leaves `notifications` untouched.
 *
 * Migration 022 adds the column with default `{}` — if it's not yet
 * applied, GET returns `{}` (empty), and PATCH errors clearly so the
 * user knows to apply the migration.
 */

interface PrefsRow {
  preferences: Record<string, unknown> | null;
}

export async function GET() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle<PrefsRow>();

  if (error) {
    // Column missing → migration 022 not applied. Surface clearly so
    // we don't silently mask the state of the DB.
    if ((error as any).code === "42703") {
      return NextResponse.json({ error: "Migration 022 not applied" }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data?.preferences ?? {} });
}

export async function PATCH(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch current prefs, shallow-merge, write back. PostgREST doesn't
  // expose jsonb_set with arbitrary depth without an RPC, so we
  // read-modify-write here. The atomicity tradeoff is minor since
  // user prefs are written by the user themselves (no concurrent
  // server-side writers).
  const { data: existing, error: readErr } = await admin
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle<PrefsRow>();

  if (readErr) {
    if ((readErr as any).code === "42703") {
      return NextResponse.json({ error: "Migration 022 not applied" }, { status: 503 });
    }
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const current = existing?.preferences ?? {};
  const next = { ...current, ...(body as Record<string, unknown>) };

  const { error: writeErr } = await (admin.from("users") as any)
    .update({ preferences: next })
    .eq("id", user.id);

  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: next });
}
