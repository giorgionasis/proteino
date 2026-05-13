/**
 * Follow-state helpers.
 *
 * Single batch query that returns the subset of `candidateIds` the viewer
 * already follows. Use this from server components rendering lists of
 * "people you might want to follow" so each card's FollowButton can render
 * with the correct initial state instead of flicker-on-mount or fake state.
 */

type SupabaseLike = {
  from: (table: string) => any;
};

/**
 * Returns a Set of user IDs (from `candidateIds`) that the viewer currently
 * follows. Returns an empty Set when the viewer is anonymous OR the candidate
 * list is empty. Silently returns empty Set on query errors — the cards
 * will just default to "not following" which is the safer fallback.
 */
export async function getFollowedSet(
  sb: SupabaseLike,
  viewerId: string | null,
  candidateIds: string[],
): Promise<Set<string>> {
  if (!viewerId) return new Set();
  if (!candidateIds || candidateIds.length === 0) return new Set();

  // Cap defensively — none of our list surfaces request more than ~50.
  const capped = candidateIds.slice(0, 200);

  const { data, error } = await (sb.from("follows") as any)
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", capped);

  if (error || !data) return new Set();
  return new Set((data as { following_id: string }[]).map((r) => r.following_id));
}
