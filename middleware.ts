import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-runtime middleware. Kept intentionally minimal — anything that
 * throws here surfaces as MIDDLEWARE_INVOCATION_FAILED → 500 on every
 * request. We don't import @supabase/ssr (it has historically been
 * flaky on Edge cold-starts) and we don't validate the JWT — middleware
 * only needs to know "is there an auth cookie?" to decide redirects.
 * The actual auth check happens server-side in route handlers / layouts.
 */

/**
 * Detect a Supabase auth cookie. Supabase names cookies as
 * `sb-<projectRef>-auth-token` (and a `.0`, `.1`, … chunked variant).
 * Presence implies the user has at some point authenticated; freshness
 * is validated downstream.
 */
function hasAuthCookie(request: NextRequest): boolean {
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value) {
      return true;
    }
  }
  return false;
}

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const loggedIn = hasAuthCookie(request);

    // Protect admin routes (page-level role check still runs in /admin/layout)
    if (pathname.startsWith("/admin") && !loggedIn && process.env.NODE_ENV !== "development") {
      return NextResponse.redirect(new URL("/login?redirect=" + encodeURIComponent(pathname), request.url));
    }

    // Redirect authenticated users away from auth pages
    if (loggedIn && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Last-resort: never 500 the site from middleware.
    console.error("[middleware] crashed, passing through:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Run middleware on everything EXCEPT static assets, image optimization,
    // favicon, image files, and API routes (which handle their own auth).
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
