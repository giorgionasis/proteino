import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/submission-funnel/close
 *
 * Called once per session on overlay dismiss. Uses POST (not PATCH)
 * because `navigator.sendBeacon` only supports POST — and sendBeacon
 * is what makes the close survive a tab close.
 *
 * Body: { session_id: uuid, final_state: text }
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const body = await req.json().catch(() => null) as
    | { session_id?: string; final_state?: string }
    | null;
  if (!body?.session_id || !body?.final_state) {
    return NextResponse.json({ error: "session_id + final_state required" }, { status: 400 });
  }

  const { error } = await (sb.rpc as any)("close_funnel_session", {
    p_user_id:     user.id,
    p_session_id:  body.session_id,
    p_final_state: body.final_state,
  });

  if (error) {
    console.error("[funnel] close failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
