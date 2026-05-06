"use client";

import { useState, useCallback } from "react";

export type Vote = 1 | -1 | null;

interface InitialState {
  myVote: Vote;
  voteUp: number;
  voteDown: number;
}

/**
 * useReviewVote — thumbs up/down a review with optimistic UI.
 *
 * Tap thumbs-up: if not voted → up; if already up → clear; if down → switch.
 * Same logic for thumbs-down. Optimistic counter updates revert on API error.
 *
 * Self-vote (the author of the review) returns 403 from the API and the
 * UI flashes the count back, no popup — caller can read `error` if it needs.
 */
export function useReviewVote(reviewId: string, initial: InitialState) {
  const [myVote, setMyVote] = useState<Vote>(initial.myVote);
  const [voteUp, setVoteUp] = useState(initial.voteUp);
  const [voteDown, setVoteDown] = useState(initial.voteDown);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (next: Vote) => {
      if (busy) return;
      setBusy(true);
      setError(null);

      // Optimistic delta
      const prev = { myVote, voteUp, voteDown };
      setMyVote(next);
      let nextUp = voteUp, nextDown = voteDown;
      if (myVote === 1) nextUp = Math.max(nextUp - 1, 0);
      if (myVote === -1) nextDown = Math.max(nextDown - 1, 0);
      if (next === 1) nextUp += 1;
      if (next === -1) nextDown += 1;
      setVoteUp(nextUp);
      setVoteDown(nextDown);

      try {
        const res = await fetch(`/api/reviews/${reviewId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote: next }),
        });

        if (res.status === 401) {
          window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          // Revert
          setMyVote(prev.myVote);
          setVoteUp(prev.voteUp);
          setVoteDown(prev.voteDown);
          setError(body.error || `Αποτυχία (${res.status})`);
          return;
        }

        const body = await res.json();
        setVoteUp(body.vote_up);
        setVoteDown(body.vote_down);
        setMyVote(body.my_vote);
      } catch {
        // Revert on network error
        setMyVote(prev.myVote);
        setVoteUp(prev.voteUp);
        setVoteDown(prev.voteDown);
        setError("Σφάλμα δικτύου");
      } finally {
        setBusy(false);
      }
    },
    [reviewId, busy, myVote, voteUp, voteDown]
  );

  const toggleUp = useCallback(() => {
    send(myVote === 1 ? null : 1);
  }, [send, myVote]);

  const toggleDown = useCallback(() => {
    send(myVote === -1 ? null : -1);
  }, [send, myVote]);

  return { myVote, voteUp, voteDown, busy, error, toggleUp, toggleDown };
}
