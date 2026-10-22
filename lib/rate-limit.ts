import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Per-IP fixed-window rate limit for public routes that spend AI tokens.
 * Backed by `rate_limit_hit()` (migration 048) so the count is shared
 * across all server instances.
 *
 *   const limited = await rateLimit(req, "ai-match", { max: 60, windowSec: 600 });
 *   if (limited) return limited;
 *
 * Fails OPEN: if the DB call errors (or the migration isn't applied yet)
 * the request goes through — a limiter outage must never take the
 * product down.
 */
export async function rateLimit(
  req: NextRequest,
  bucket: string,
  { max, windowSec }: { max: number; windowSec: number },
): Promise<NextResponse | null> {
  const key = `${bucket}:${clientIp(req)}`;
  try {
    const { data, error } = await (createAdminClient().rpc as any)("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSec,
      p_max: max,
    });
    if (error || data !== false) return null;
  } catch {
    return null;
  }
  return NextResponse.json(
    { error: "Πολλά αιτήματα — δοκίμασε ξανά σε λίγο." },
    { status: 429, headers: { "Retry-After": String(windowSec) } },
  );
}

/** Vercel sets x-forwarded-for (client first) and x-real-ip. */
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
