/**
 * Merge the just-published `liveReview` into the server-fetched reviews list.
 *
 * Drops any server row by the same user (it's stale — the live row is the
 * truth) and prepends the live one so the carousel renders it first. Used
 * by every detail page's CommunitySection so the new review materialises
 * in the carousel right after publish — which gives the success-modal
 * FLIP morph a DOM target to land on.
 */

interface ReviewUser {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  level: number;
  suggestion_count: number;
}

interface ServerReview {
  id: string;
  user: ReviewUser;
  rating: number;
  reflection: string | null;
  vote_up: number;
  vote_down: number;
  /** Server filters hidden rows out so these fields are optional in the public detail-page projection. */
  is_hidden?: boolean;
  hidden_reason?: string | null;
  created_at: string;
  my_vote: 1 | -1 | null;
}

interface LiveReview {
  id: string;
  rating: number;
  reflection: string | null;
}

interface CurrentUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  suggestion_count: number;
}

export function mergeLiveReview(
  serverReviews: ServerReview[],
  live: LiveReview | null,
  user: CurrentUser | null,
): ServerReview[] {
  if (!live || !user) return serverReviews;
  const filtered = serverReviews.filter((r) => r.user.id !== user.id);
  const liveRow: ServerReview = {
    id: live.id,
    user: {
      id: user.id,
      display_name: user.display_name,
      handle: user.handle,
      avatar_url: user.avatar_url,
      level: 1,
      suggestion_count: user.suggestion_count,
    },
    rating: live.rating,
    reflection: live.reflection,
    vote_up: 0,
    vote_down: 0,
    created_at: new Date().toISOString(),
    my_vote: null,
  };
  return [liveRow, ...filtered];
}
