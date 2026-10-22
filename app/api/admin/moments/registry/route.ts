import { requireAdmin } from "@/lib/admin/require-admin";
import { NextResponse } from "next/server";
import { PREDICATE_SCHEMAS } from "@/lib/moments";

/**
 * Returns the predicate registry schema so the admin form knows
 * which input fields to render for each predicate_key. Read-only,
 * cheap, no DB hit.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  return NextResponse.json(PREDICATE_SCHEMAS);
}
