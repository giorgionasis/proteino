import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin moments CRUD — list + create.
 *
 * GET  /api/admin/moments        → all rows, ordered by trigger_event then priority
 * POST /api/admin/moments        → create row (server fills timestamps)
 *
 * Per-row update + delete live at /api/admin/moments/[id].
 * Stats (last 7d fires / CTA clicks / dismisses) at /api/admin/moments/stats.
 */

export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("moments")
    .select("*")
    .order("trigger_event", { ascending: true })
    .order("priority", { ascending: false })
    .order("key", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const row = {
    key:            typeof body.key === "string" ? body.key.trim() : "",
    label:          typeof body.label === "string" ? body.label.trim() || null : null,
    surface:        typeof body.surface === "string" ? body.surface : "",
    trigger_event:  typeof body.trigger_event === "string" ? body.trigger_event : "",
    predicate_key:  typeof body.predicate_key === "string" ? body.predicate_key : "always",
    predicate_args: body.predicate_args && typeof body.predicate_args === "object" ? body.predicate_args : {},
    copy:           body.copy    && typeof body.copy    === "object" ? body.copy    : {},
    display:        body.display && typeof body.display === "object" ? body.display : {},
    priority:       typeof body.priority === "number" ? body.priority : 100,
    variant_group:  typeof body.variant_group === "string" && body.variant_group.trim() ? body.variant_group.trim() : null,
    is_active:      typeof body.is_active === "boolean" ? body.is_active : true,
    valid_from:     typeof body.valid_from  === "string" && body.valid_from  ? body.valid_from  : null,
    valid_until:    typeof body.valid_until === "string" && body.valid_until ? body.valid_until : null,
  };

  if (!row.key)            return NextResponse.json({ error: "key required" },           { status: 400 });
  if (!row.surface)        return NextResponse.json({ error: "surface required" },       { status: 400 });
  if (!row.trigger_event)  return NextResponse.json({ error: "trigger_event required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await (sb.from("moments") as any).insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
