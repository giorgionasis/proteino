import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { safeRedirect } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Sanitised: a raw `${origin}${next}` turned "@evil.com" into a
  // userinfo URL (open redirect).
  const next = safeRedirect(searchParams.get("next"));

  // Email links (signup confirmation, password recovery) that expired or
  // were opened in another browser end up here without a usable code —
  // PKCE needs the verifier cookie from the browser that asked. Send them
  // somewhere that explains it instead of "OAuth failed".
  const isRecovery = next.startsWith("/reset-password");
  const isEmailLink = isRecovery || searchParams.has("error_code") || searchParams.get("type") === "signup";
  const linkFail = `${origin}${isRecovery ? "/forgot-password" : "/login"}?error=link`;

  if (!code) {
    return NextResponse.redirect(isEmailLink || searchParams.has("error") ? linkFail : `${origin}/login?error=oauth`);
  }

  // Build the redirect response FIRST so cookies go onto it directly.
  // Using cookieStore.set() + a separate NextResponse.redirect() loses the cookies.
  const redirectTo   = NextResponse.redirect(`${origin}${next}`);
  // Email links are tagged (?type=signup from RegisterForm, next=/reset-
  // password from ForgotPasswordForm); anything else is Google OAuth.
  const redirectFail = NextResponse.redirect(isEmailLink ? linkFail : `${origin}/login?error=oauth`);

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

  // Create the public.users profile on first login (handle collisions
  // get a numeric suffix — see lib/auth/ensure-profile.ts).
  if (data.user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await ensureProfile(data.user);
    } catch (err) { console.error("[callback] ensureProfile failed:", err); }
  }

  return redirectTo;
}
