import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const GREEK_TO_LATIN: Record<string, string> = {
  "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
  "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
  "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
  "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
  "ΐ":"i","ΰ":"y",
};
function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => GREEK_TO_LATIN[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/suggestions/check?title=...&category=...
 *
 * Preflight duplicate check used by useSubmission BEFORE the user invests
 * time writing a reflection / picking a rating. If the AI-matched item
 * already exists with at least one suggestion, this returns the duplicate
 * info so the overlay can short-circuit straight to the DuplicateScreen
 * (HOOKS.md §8) instead of letting the user write 200 chars of reflection
 * that POST /api/suggestions will reject anyway.
 *
 * Returns:
 *   { exists: false }                                                  — go ahead
 *   { exists: true, own: true,  item_slug, suggestion_id }             — show "Το έχεις ήδη προτείνει εσύ"
 *   { exists: true, own: false, item_slug, suggestion_id, suggester } — show "Έχει ήδη προταθεί" + rate/follow CTAs
 *
 * Read-only — never mutates. Safe to call on every match-lock.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const title = url.searchParams.get("title")?.trim();
  const category = url.searchParams.get("category")?.trim();

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });

  const fullSlug = `${category}/${slugify(title)}`;

  const admin = createAdminClient();

  const { data: item } = await admin
    .from("items")
    .select("id, slug")
    .eq("slug", fullSlug)
    .maybeSingle();

  if (!item) return NextResponse.json({ exists: false });

  const itemId = (item as any).id;
  const itemSlug = (item as any).slug;

  const { data: sug } = await admin
    .from("suggestions")
    .select("id, user_id, users!suggestions_user_id_fkey(id, handle, display_name, avatar_url)")
    .eq("item_id", itemId)
    .limit(1)
    .maybeSingle();

  if (!sug) {
    // Item exists but has no suggestion yet — caller can proceed to publish
    return NextResponse.json({ exists: false });
  }

  // Determine if the current viewer is the original suggester
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  const ownSuggestion = !!user && (sug as any).user_id === user.id;

  // When someone else owns the suggestion, check whether the viewer
  // is already following them — drives the follow CTA on the
  // duplicate screen (HOOKS.md §8): "you both wanted to recommend
  // the same thing — your taste aligns, follow them".
  let isFollowing = false;
  if (!ownSuggestion && user) {
    const { data: f } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", (sug as any).user_id)
      .maybeSingle();
    isFollowing = !!f;
  }

  return NextResponse.json({
    exists: true,
    own: ownSuggestion,
    suggestion_id: (sug as any).id,
    item_slug: itemSlug,
    suggester: ownSuggestion ? null : (sug as any).users,
    is_following: isFollowing,
  });
}
