import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-runtime middleware. Anything that throws here surfaces to Vercel as
 * MIDDLEWARE_INVOCATION_FAILED → 500 on every request. The whole body is
 * wrapped in try/catch so a malformed cookie / network blip / missing env
 * never takes the site down — worst case the user is treated as a guest
 * for that request.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  // Skip Supabase auth when keys are not configured.
  if (!url || !key) {
    return NextResponse.next({ request });
  }

  try {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // getSession() reads the JWT from cookies without a network call —
    // required for Edge runtime. Still wrap in try because a cookie
    // with a malformed JWT can throw during parse.
    let user = null;
    try {
      const { data } = await supabase.auth.getSession();
      user = data?.session?.user ?? null;
    } catch (err) {
      console.error("[middleware] getSession failed:", err);
    }

    // Protect admin routes
    if (pathname.startsWith("/admin") && !user && process.env.NODE_ENV !== "development") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return supabaseResponse;
  } catch (err) {
    // Last-resort: never 500 the site from middleware. Log + pass through
    // as guest. The page-level auth checks (admin layout, etc.) still run.
    console.error("[middleware] crashed, passing through:", err);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
