import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/settings — all settings as { key: { value, description } }
export async function GET() {
  const sb = createAdminClient();
  const { data, error } = await sb.from("app_settings").select("*").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH /api/admin/settings
// Body: { updates: { key: value }[] } — values are JSON-encodable (string, bool, number, object)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const updates = body.updates as Record<string, unknown> | undefined;
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "updates required" }, { status: 400 });
  }

  const sb = createAdminClient();
  const errors: string[] = [];

  for (const [key, value] of Object.entries(updates)) {
    const { error } = await (sb.from("app_settings") as any)
      .upsert({ key, value }, { onConflict: "key" });
    if (error) errors.push(`${key}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
