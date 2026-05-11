import type { BookmarkStatus } from "@/hooks/useBookmark";

/**
 * Bookmark UX labels keyed by category. Each category has a verb pair
 * — "want to" vs "have done" — that surfaces in three places:
 *
 *   • Detail page chips below the hero ("Θα δω" / "Είδα")
 *   • Profile sub-tabs grouped by category
 *   • Toasts after status changes
 *
 * Keeping this in one place ensures the verb is consistent across
 * those surfaces. The same map is consumed by both client and
 * server (for toast assembly).
 */

interface CategoryLabels {
  /** Status setter chip when not yet done — present-future tense. */
  wishlist: string;
  /** Status setter chip when done — past tense. */
  done:     string;
  /** Singular noun for the milestone hook copy: "η X-η ταινία σου". */
  noun:     string;
  /** Article + gender for the singular noun ("η ταινία" / "το βιβλίο"). */
  article:  "η" | "το";
}

const LABELS: Record<string, CategoryLabels> = {
  movies:  { wishlist: "Θα δω",       done: "Είδα",     noun: "ταινία",       article: "η" },
  series:  { wishlist: "Θα δω",       done: "Είδα",     noun: "σειρά",        article: "η" },
  books:   { wishlist: "Θα διαβάσω",  done: "Διάβασα",  noun: "βιβλίο",       article: "το" },
  food:    { wishlist: "Θέλω να πάω", done: "Έχω πάει", noun: "εστιατόριο",   article: "το" },
  bars:    { wishlist: "Θέλω να πάω", done: "Έχω πάει", noun: "bar",          article: "το" },
  hotels:  { wishlist: "Θέλω να πάω", done: "Έχω πάει", noun: "ξενοδοχείο",   article: "το" },
  theater: { wishlist: "Θα πάω",      done: "Πήγα",     noun: "παράσταση",    article: "η" },
  events:  { wishlist: "Θα πάω",      done: "Πήγα",     noun: "εκδήλωση",     article: "η" },
  recipes: { wishlist: "Θα φτιάξω",   done: "Έφτιαξα",  noun: "συνταγή",      article: "η" },
};

const DEFAULT_LABELS: CategoryLabels = {
  wishlist: "Στη λίστα μου", done: "Έγινε", noun: "πρόταση", article: "η",
};

export function bookmarkLabels(category: string): CategoryLabels {
  return LABELS[category] ?? DEFAULT_LABELS;
}

export function statusChipLabel(category: string, status: BookmarkStatus): string {
  const l = bookmarkLabels(category);
  return status === "wishlist" ? l.wishlist : l.done;
}
