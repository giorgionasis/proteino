import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { revalidateCategory } from "@/lib/revalidate";

// GET /api/admin/activities?category_id=...&type_id=...&q=...&page=0
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("category_id");
  const typeId = url.searchParams.get("type_id");
  const search = url.searchParams.get("q")?.trim();
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const pageSize = 50;

  let q: any = sb
    .from("activities")
    .select(
      "*, activity_types!inner(id, name, slug, icon, category_id, activity_categories!inner(id, name, slug, icon))",
      { count: "exact" }
    )
    .order("modified_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  if (typeId) q = q.eq("type_id", typeId);
  if (categoryId) q = q.eq("activity_types.category_id", categoryId);
  if (search) q = q.ilike("name", `%${search}%`);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type_id, name } = body;
  if (!type_id) return NextResponse.json({ error: "type_id required" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = createAdminClient();
  const insert = {
    type_id,
    name: name.trim(),
    description: body.description?.trim() || null,
    address: body.address?.trim() || null,
    lat: body.lat ?? null,
    lng: body.lng ?? null,
    website_url: body.website_url?.trim() || null,
    facebook_url: body.facebook_url?.trim() || null,
    instagram_url: body.instagram_url?.trim() || null,
    phone: body.phone?.trim() || null,
    image_url: body.image_url?.trim() || null,
    is_published: body.is_published ?? true,
  };

  const { data, error } = await (sb.from("activities") as any)
    .insert(insert)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Activities appear in nearby-activities cards on hotel detail pages.
  revalidateCategory("hotels");
  return NextResponse.json(data);
}
