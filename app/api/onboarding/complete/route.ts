import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_SLUGS } from "@/constants/categories";

/**
 * POST /api/onboarding/complete
 *
 * Two modes, governed by `final`:
 *   { interests: string[], final?: false }  → save interests only.
 *                                              Intermediate write mid-flow.
 *                                              Does NOT stamp onboarded_at.
 *   { final: true, interests?: string[] }   → save interests + stamp
 *                                              onboarded_at (=ISO now).
 *                                              Last call from the flow.
 *   { final: true, skipped: true }          → stamp onboarded_at only.
 *                                              Used when the user bails
 *                                              on the hook screen.
 *
 * The split exists because the (main) layout uses `onboarded_at` as the
 * gate — stamping it mid-flow means a stray re-render that hits the
 * server entry would redirect the user to /, skipping the remaining
 * steps. Always set `onboarded_at` only when the user is truly done.
 *
 * If migration 022 is not applied (`preferences` column missing), we
 * return 503 — same contract as `/api/profile/preferences`.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as {
    interests?: unknown;
    final?:     unknown;
    skipped?:   unknown;
  }));
  const final = body?.final === true || body?.skipped === true;

  const incoming = Array.isArray(body?.interests) ? (body.interests as unknown[]) : [];
  const interests = incoming
    .filter((x): x is string => typeof x === "string")
    .filter((slug) => (CATEGORY_SLUGS as readonly string[]).includes(slug));

  const admin = createAdminClient();
  const { data: existing, error: readErr } = await admin
    .from("users")
    .select("preferences")
    .eq("id", user.id)
    .maybeSingle<{ preferences: Record<string, unknown> | null }>();

  if (readErr) {
    if ((readErr as any).code === "42703") {
      return NextResponse.json({ error: "Migration 022 not applied" }, { status: 503 });
    }
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const current = existing?.preferences ?? {};
  const next: Record<string, unknown> = { ...current };
  if (Array.isArray(body?.interests)) {
    next.interests = interests;
  }
  if (final) {
    next.onboarded_at = new Date().toISOString();
  }

  const { error: writeErr } = await (admin.from("users") as any)
    .update({ preferences: next })
    .eq("id", user.id);

  if (writeErr) {
    return NextResponse.json({ error: writeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preferences: next });
}
