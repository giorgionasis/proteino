import { NextResponse } from "next/server";
import { PREDICATE_SCHEMAS } from "@/lib/moments";

/**
 * Returns the predicate registry schema so the admin form knows
 * which input fields to render for each predicate_key. Read-only,
 * cheap, no DB hit.
 */
export async function GET() {
  return NextResponse.json(PREDICATE_SCHEMAS);
}
