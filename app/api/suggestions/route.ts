import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type { CategorySlug } from "@/types";

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

interface SubmitBody {
  category: CategorySlug;
  title: string;
  reflection?: string;
  rating?: number;
  ai_match_data?: Record<string, unknown> | null;
  ai_quality_score?: number | null;
  cover_url?: string | null;
}

/**
 * POST /api/suggestions
 *
 * The user-facing submission flow's persistence endpoint. Called by
 * `useSubmission.publish()` when the user confirms their suggestion.
 *
 * Behavior:
 *  1. Auth (must be logged in).
 *  2. Validate body (category + title required).
 *  3. Resolve item: lookup by `${category}/${slug}`. Insert if missing.
 *  4. Duplicate check: has this user already suggested this item?
 *     - same user → 409 with `kind: "own"` (UI shows "Το έχεις ήδη προτείνει εσύ! 😄")
 *     - other user → 409 with `kind: "other"` + suggester handle (UI shows
 *       "Το [item] έχει ήδη προταθεί" with rate/follow CTAs)
 *  5. Insert suggestion with real SHA-256 content_hash (proof of authorship).
 *  6. Return new suggestion id, item slug, and the user's *new*
 *     suggestion_count so <AchievementProgress> can animate.
 *
 * Notes:
 * - `suggestion_count` and `avg_rating` on items are denormalized — we don't
 *   recompute here; admin processes / DB triggers handle that. We DO bump
 *   users.suggestion_count so the achievement block reflects reality
 *   immediately.
 * - Service-role client is used for the items insert (RLS would block an
 *   authenticated insert from a non-admin user). Suggestion insert also uses
 *   service role; we already validated auth at the top.
 */
export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as SubmitBody;
  const title = body.title?.trim();
  const category = body.category;
  const reflection = body.reflection?.trim() || null;
  const rating = typeof body.rating === "number" ? body.rating : null;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  if (!category) return NextResponse.json({ error: "category required" }, { status: 400 });
  if (rating !== null && (rating < 0 || rating > 5)) {
    return NextResponse.json({ error: "rating must be 0–5" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Resolve or create the item
  const baseSlug = slugify(title);
  const fullSlug = `${category}/${baseSlug}`;

  const { data: existingItem } = await admin
    .from("items")
    .select("id, slug, title")
    .eq("slug", fullSlug)
    .maybeSingle();

  let itemId: string;
  let itemSlug: string;

  if (existingItem) {
    itemId = (existingItem as any).id;
    itemSlug = (existingItem as any).slug;

    // 2. Duplicate check — has anyone already suggested this item?
    const { data: dup } = await admin
      .from("suggestions")
      .select("id, user_id, users(handle, display_name)")
      .eq("item_id", itemId)
      .limit(1)
      .maybeSingle();

    if (dup) {
      const ownSuggestion = (dup as any).user_id === user.id;
      return NextResponse.json(
        {
          error: "duplicate",
          kind: ownSuggestion ? "own" : "other",
          suggestion_id: (dup as any).id,
          item_slug: itemSlug,
          suggester: ownSuggestion ? null : (dup as any).users,
        },
        { status: 409 }
      );
    }
  } else {
    // Create new item — start with a unique slug suffix loop in case of
    // case-insensitive collisions or whitespace variations.
    let candidate = baseSlug;
    let n = 1;
    while (true) {
      const { data: clash } = await admin
        .from("items")
        .select("id")
        .eq("slug", `${category}/${candidate}`)
        .maybeSingle();
      if (!clash) break;
      candidate = `${baseSlug}-${++n}`;
    }
    itemSlug = `${category}/${candidate}`;

    // Pull rich metadata out of ai_match_data (TMDB / Books / Places shape).
    // Anything missing is null — admin can fill it later via the editor.
    const md = (body.ai_match_data ?? {}) as Record<string, any>;
    const posterUrl = typeof md.poster_url === "string" ? md.poster_url : null;
    const backdropUrl = typeof md.backdrop_url === "string" ? md.backdrop_url : null;
    const coverUrl = body.cover_url ?? posterUrl ?? backdropUrl ?? null;

    const { data: newItem, error: itemErr } = await (admin.from("items") as any)
      .insert({
        title,
        slug: itemSlug,
        category,
        cover_url: coverUrl,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        description_seo: typeof md.plot === "string" ? md.plot.slice(0, 500) : null,
        is_published: true,
        avg_rating: rating ?? 0,
        rating_count: rating !== null ? 1 : 0,
        suggestion_count: 1,
        images: coverUrl ? [{ url: coverUrl }] : [],
        metadata: {
          tags: [],
          ...(md.tmdb_id ? { tmdb_id: md.tmdb_id } : {}),
        },
      })
      .select("id, slug")
      .single();

    if (itemErr || !newItem) {
      return NextResponse.json(
        { error: itemErr?.message ?? "item insert failed" },
        { status: 500 }
      );
    }
    itemId = (newItem as any).id;
    itemSlug = (newItem as any).slug;

    // Insert the category extension row with whatever metadata we have.
    // Best-effort — if this fails we don't roll back the item, the admin
    // editor can fill the gaps later.
    if (category === "movies" || category === "series") {
      const directors = md.director ? [{ name: md.director }] : [];
      const actors = Array.isArray(md.cast)
        ? md.cast.map((c: any) => ({ name: c.name, avatar: c.avatar ?? null }))
        : [];
      const extPayload: Record<string, any> = {
        item_id: itemId,
        director: typeof md.director === "string" ? md.director : null,
        directors: directors.length > 0 ? directors : null,
        actors: actors.length > 0 ? actors : null,
        plot: typeof md.plot === "string" ? md.plot : null,
        country: null,
        language: null,
        trailer_url: null,
      };
      if (category === "movies") {
        extPayload.duration_min = typeof md.runtime === "number" ? md.runtime : null;
        if (md.year) extPayload.release_date = `${md.year}-01-01`;
      } else {
        if (md.year) extPayload.release_date = `${md.year}-01-01`;
      }
      const extTable = category === "movies" ? "item_movies" : "item_series";
      await (admin.from(extTable) as any).insert(extPayload);
    }
  }

  // 3. Insert the suggestion
  const now = new Date().toISOString();
  const contentHash = crypto
    .createHash("sha256")
    .update(`${user.id}|${itemId}|${reflection ?? ""}|${now}`)
    .digest("hex");

  const { data: sugRow, error: sugErr } = await (admin.from("suggestions") as any)
    .insert({
      user_id: user.id,
      item_id: itemId,
      reflection,
      rating,
      ai_quality_score: body.ai_quality_score ?? null,
      ai_match_data: body.ai_match_data ?? null,
      content_hash: contentHash,
      is_published: true,
      published_at: now,
    })
    .select("id")
    .single();

  if (sugErr || !sugRow) {
    return NextResponse.json(
      { error: sugErr?.message ?? "suggestion insert failed" },
      { status: 500 }
    );
  }

  // 4. Bump the user's suggestion_count + last_suggestion_at so the
  //    achievement block animates immediately. We compute the new count
  //    by reading current then writing — race-safe enough for individual
  //    user actions (the user can't double-publish).
  const { data: userRow } = await admin
    .from("users")
    .select("suggestion_count")
    .eq("id", user.id)
    .single();

  const newCount = ((userRow as any)?.suggestion_count ?? 0) + 1;

  await (admin.from("users") as any)
    .update({ suggestion_count: newCount, last_suggestion_at: now })
    .eq("id", user.id);

  // 5. Hook moments (HOOKS.md §2B). Three cheap counts that drive the
  //    Published screen's social-proof + variable-reward block. Computed
  //    in parallel; failures degrade gracefully (counts default to 0).
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [weeklyRes, audienceRes, followersRes] = await Promise.all([
    // Total suggestions (any user) in the last 7 days, including the one
    // we just inserted. Drives "Ήσουν ο Nth που πρότεινε αυτή την εβδομάδα".
    admin
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString()),
    // Distinct users with a bookmark in this category — soft proxy for
    // "how many people care about this category". No "follow category"
    // feature exists yet; bookmarks are the closest engagement signal.
    admin
      .from("bookmarks")
      .select("user_id", { count: "exact", head: true })
      .eq("category", category),
    // Followers of the suggester — drives "X χρήστες σε ακολουθούν —
    // θα το δουν στο feed τους". Only meaningful when > 0.
    admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id),
  ]);

  return NextResponse.json({
    suggestion_id: (sugRow as any).id,
    item_id: itemId,
    item_slug: itemSlug,
    new_suggestion_count: newCount,
    weekly_count: weeklyRes.count ?? 0,
    category_audience_count: audienceRes.count ?? 0,
    my_followers_count: followersRes.count ?? 0,
  });
}
