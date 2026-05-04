import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GET /api/admin/movies-tonight?from=2026-05-04&to=2026-05-10
// Returns airings within the date range with the embedded movie item.
export async function GET(req: NextRequest) {
  const sb = createAdminClient();
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q: any = sb
    .from("movies_tonight")
    .select(
      "id, item_id, channel, air_date, air_time, is_published, " +
      "items!inner(id, title, slug, cover_url, avg_rating, metadata, item_movies(release_date))"
    )
    .order("air_date")
    .order("air_time");

  if (from) q = q.gte("air_date", from);
  if (to) q = q.lte("air_date", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { item_id, channel, air_date, air_time, is_published } = body;

  if (!item_id) return NextResponse.json({ error: "item_id required" }, { status: 400 });
  if (!channel?.trim()) return NextResponse.json({ error: "channel required" }, { status: 400 });
  if (!air_date) return NextResponse.json({ error: "air_date required" }, { status: 400 });
  if (!air_time) return NextResponse.json({ error: "air_time required" }, { status: 400 });

  const sb = createAdminClient();
  const { data, error } = await (sb.from("movies_tonight") as any)
    .insert({
      item_id,
      channel: channel.trim(),
      air_date,
      air_time,
      is_published: is_published ?? true,
    })
    .select("*")
    .single();

  if (error) {
    // Common: unique constraint violation
    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "Αυτή η ταινία υπάρχει ήδη για αυτό το κανάλι/ώρα." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
