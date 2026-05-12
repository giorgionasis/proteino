import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function PUT(request: NextRequest) {
  const body = await request.json();

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Region: the structured `region_id` FK to regions(id) is the source
  // of truth going forward. The legacy `region` text column is filled
  // with the resolved region name (or whatever the caller passes
  // directly when no region_id is provided) so older queries / admin
  // surfaces still see something readable. Passing region_id = null
  // clears both.
  const rawRegionId =
    typeof body.region_id === "string" && body.region_id.trim() ? body.region_id.trim() : null;
  let resolvedRegionText: string | null =
    typeof body.region === "string" && body.region.trim() ? body.region.trim() : null;
  if (rawRegionId) {
    const { data: regRow } = await supabase
      .from("regions")
      .select("name")
      .eq("id", rawRegionId)
      .maybeSingle();
    if (regRow && (regRow as { name?: string }).name) {
      resolvedRegionText = (regRow as { name: string }).name;
    }
  } else if (body.region_id === null) {
    // Caller explicitly cleared the structured region — clear the
    // legacy text too unless they passed something fresh.
    if (!(typeof body.region === "string" && body.region.trim())) {
      resolvedRegionText = null;
    }
  }

  const { error } = await supabase
    .from("users")
    .update({
      display_name: body.display_name ?? null,
      bio:          body.bio ?? null,
      gender:       body.gender ?? null,
      birthday:     body.birthday ?? null,
      region:       resolvedRegionText,
      region_id:    rawRegionId,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[api/profile] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
