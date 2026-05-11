import { bookmarkLabels } from "@/lib/bookmarks/labels";
import type { BookmarkStatus, BookmarkContext } from "@/hooks/useBookmark";

/**
 * Pick a bookmark toast variant given the action + server context.
 *
 * The variants escalate by signal: milestone counts beat today-velocity
 * beats a plain confirmation. The order in `candidates` below is
 * priority — first match wins. This is intentional: a 10th-bookmark
 * milestone is more rewarding than "56 saved today".
 *
 * Returns a single line — the Toast primitive truncates anything
 * longer than ~50ch, so we keep messages tight.
 */

interface PickInput {
  action:   "wishlist" | "done" | "removed" | "moved-to-done";
  category: string;
  context:  BookmarkContext | null;
}

interface ToastSpec {
  message: string;
}

const MILESTONES = new Set([5, 10, 25, 50, 100]);
const TODAY_VELOCITY_THRESHOLD = 20;

export function pickBookmarkToast(input: PickInput): ToastSpec {
  const { action, category, context } = input;
  const l = bookmarkLabels(category);

  if (action === "removed") {
    return { message: "Αφαιρέθηκε από τις λίστες σου" };
  }

  if (action === "moved-to-done") {
    return { message: `Μετακινήθηκε στα ${l.done} ✓` };
  }

  const targetLabel = action === "done" ? l.done : l.wishlist;
  const noun = l.noun;
  const article = l.article;

  // Milestone wins everything else (rare + memorable signal).
  if (context && MILESTONES.has(context.categoryCount)) {
    return {
      message: `Είναι ${article === "η" ? "η" : "το"} ${context.categoryCount}η ${noun} σου — fan mode 🔥`,
    };
  }

  // Today's velocity — "you and X others" social proof.
  if (context && context.todayCount >= TODAY_VELOCITY_THRESHOLD) {
    return {
      message: `Αποθηκεύτηκε. ${context.todayCount} χρήστες σήμερα 🔥`,
    };
  }

  // Default confirmation — names the destination list explicitly so
  // the user knows where it went and can find it on the chips below.
  return { message: `Αποθηκεύτηκε στο "${targetLabel}"` };
}
