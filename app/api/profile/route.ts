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

  const { error } = await supabase
    .from("users")
    .update({
      display_name: body.display_name ?? null,
      bio:          body.bio ?? null,
      gender:       body.gender ?? null,
      birthday:     body.birthday ?? null,
      region:       body.region ?? null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[api/profile] update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}
