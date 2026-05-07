import { NextResponse } from "next/server";

// DIAGNOSTIC: stripped to bare no-op to isolate MIDDLEWARE_INVOCATION_FAILED.
// Admin auth still enforced server-side in app/admin/layout.tsx via Supabase
// session + role check, so removing the redirect here is safe — the page-level
// gate runs unchanged.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff|woff2)$).*)",
  ],
};
