import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { FunnelBatchBody } from "@/lib/funnel/types";

/**
 * POST /api/submission-funnel
 *
 * Batch ingest endpoint for the submission funnel tracker. Calls
 * `public.ingest_funnel_batch()` SECURITY DEFINER — the API layer
 * only verifies auth + that the session belongs to this user, the SQL
 * function handles UPSERT semantics, denormalised counter merging,
 * and snapshot insertion.
 *
 * Returns 204 on success (no body — tracker is fire-and-forget). On
 * auth failure returns 401 so the tracker can stop trying.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const body = (await req.json().catch(() => null)) as FunnelBatchBody | null;
  if (!body || !body.session?.id) {
    return NextResponse.json({ error: "session.id required" }, { status: 400 });
  }

  const { error } = await (sb.rpc as any)("ingest_funnel_batch", {
    p_user_id:  user.id,
    p_session:  body.session,
    p_events:   body.events   ?? [],
    p_snapshot: body.snapshot ?? null,
    p_counters: body.counters ?? {},
  });

  if (error) {
    console.error("[funnel] ingest failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
