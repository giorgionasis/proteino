import { NextResponse, type NextRequest } from "next/server";
import { resolveLegacyRedirect, type LegacyMap } from "@/lib/redirects/legacy";
import legacyMap from "@/lib/redirects/legacy-map.json";

// Edge-runtime proxy (Next 16 — renamed from middleware.ts). Kept intentionally
// minimal — anything that throws here surfaces as MIDDLEWARE_INVOCATION_FAILED
// → 500 on every request. No @supabase/ssr import (historically flaky on Edge
// cold-starts) and no JWT validation — the proxy only needs cookie presence
// to gate /admin redirects.

function hasAuthCookie(request: NextRequest): boolean {
  try {
    const all = request.cookies.getAll();
    if (!all || !Array.isArray(all)) return false;
    for (const c of all) {
      const name = c?.name;
      const value = c?.value;
      if (typeof name === "string" && name.startsWith("sb-") && name.includes("-auth-token") && value) {
        return true;
      }
    }
  } catch {
    // Cookie parsing can throw on malformed headers — treat as guest.
  }
  return false;
}

export async function proxy(request: NextRequest) {
  try {
    const pathname = request.nextUrl?.pathname ?? "/";

    // Old Joomla/K2 URLs (pre-cutover www.proteino.gr) → 301 to the new
    // route. Pure in-memory lookup; null for every non-legacy path.
    const legacy = resolveLegacyRedirect(pathname, request.nextUrl.searchParams, legacyMap as LegacyMap);
    if (legacy && legacy !== pathname) {
      return NextResponse.redirect(new URL(legacy, request.url), 301);
    }

    const loggedIn = hasAuthCookie(request);

    // Protect /admin: redirect guests to login. Page-level role check still
    // runs in app/admin/layout.tsx with the full Supabase server client.
    if (pathname.startsWith("/admin") && !loggedIn && process.env.NODE_ENV !== "development") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Deliberately NOT redirecting logged-in users away from /login or
    // /register: this layer can only detect cookie presence, not JWT
    // validity, so a stale cookie would trap users who can never re-auth.
    // Those pages do their own server-side getSession() check.

    return NextResponse.next();
  } catch (err) {
    // Last-resort: never 500 the site from the proxy layer.
    console.error("[proxy] passthrough:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Run on everything except static assets, _next internals, favicon,
    // and API routes (which gate themselves). Image extensions excluded so
    // we don't burn invocations on every <img>.
    "/((?!_next/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2)$).*)",
  ],
};
