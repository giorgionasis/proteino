import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  // Build the redirect response FIRST so cookies go onto it directly.
  // Using cookieStore.set() + a separate NextResponse.redirect() loses the cookies.
  const redirectTo   = NextResponse.redirect(`${origin}${next}`);
  const redirectFail = NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectTo.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectFail;
  }

  // Create public.users profile on first login
  if (data.user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      const meta = data.user.user_metadata ?? {};
      const googlePhoto = meta.avatar_url ?? meta.picture ?? null;

      if (!existing) {
        // Check for email collision: Supabase may create a new auth UUID for OAuth
        // even when a profile with the same email already exists.
        const { data: existingByEmail } = (await (admin as any)
          .from("users")
          .select("id, avatar_url, handle")
          .eq("email", data.user.email!)
          .maybeSingle()) as { data: { id: string; avatar_url: string | null; handle: string } | null };

        if (existingByEmail) {
          // Same person, different auth UUID — sync photo, skip insert
          if (googlePhoto && !existingByEmail.avatar_url) {
            await (admin as any)
              .from("users")
              .update({ avatar_url: googlePhoto })
              .eq("id", existingByEmail.id);
          }
          console.log("[callback] OAuth email matched existing profile:", existingByEmail.handle);
        } else {
          const rawHandle = meta.handle
            ?? data.user.email?.split("@")[0].replace(/[^a-z0-9_.]/gi, "_").slice(0, 30)
            ?? `user_${data.user.id.slice(0, 8)}`;
          const handle  = rawHandle.toLowerCase();
          const display = meta.display_name ?? meta.full_name ?? meta.name ?? handle;

          const { error: insertErr } = await admin.from("users").insert({
            id:               data.user.id,
            email:            data.user.email!,
            handle,
            display_name:     display,
            avatar_url:       googlePhoto,
            role:             "user",
            points:           0,
            level:            1,
            suggestion_count: 0,
            rating_count:     0,
            is_private:       false,
            is_verified:      false,
          } as any);
          if (insertErr) console.error("[callback] insert error:", insertErr);
          else console.log("[callback] user created:", handle);
        }
      } else if (googlePhoto) {
        // Existing user logging in via OAuth — sync photo if not already set
        const { data: current } = (await admin
          .from("users")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single()) as { data: { avatar_url: string | null } | null };

        if (!current?.avatar_url) {
          await (admin as any)
            .from("users")
            .update({ avatar_url: googlePhoto })
            .eq("id", data.user.id);
          console.log("[callback] synced google photo for existing user");
        }
      }
    } catch (err) { console.error("[callback] unexpected error:", err); }
  }

  return redirectTo;
}
