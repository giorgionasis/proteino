import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAdminUsers } from "@/lib/admin/users-list";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/users?search=&sort=<idx>&page=<n>
// Paged user list for /admin/users (includes private columns — admin only).
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const sp = req.nextUrl.searchParams;
  const { rows, total, error } = await fetchAdminUsers(createAdminClient(), {
    search:  sp.get("search") ?? "",
    sortIdx: Number(sp.get("sort") ?? 0) || 0,
    page:    Number(sp.get("page") ?? 1) || 1,
  });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ rows, total });
}
