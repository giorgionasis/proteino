import type { PredicateFn, PredicateSchema, MomentContext } from "./types";

/**
 * Predicate registry.
 *
 * Each registered function decides whether a moment fires for a given
 * context. Functions are referenced by `predicate_key` in the
 * `moments` table; the admin form uses the matching schema entry to
 * render the right input fields per `predicate_args`.
 *
 * Adding a new predicate:
 *   1. Write the function — pure (or async if it queries DB)
 *   2. Add it to PREDICATES + PREDICATE_SCHEMAS keyed by the same name
 *   3. Admin form picks it up automatically
 */

// ── Helpers ────────────────────────────────────────────────────────────

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Math.floor(Number(v));
  }
  return null;
}

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

// ── Predicate functions ────────────────────────────────────────────────

/** Always fires. Use for surface-wide defaults. */
const always: PredicateFn = () => true;

/** Fires when payload.count strictly equals args.n. The canonical
 *  predicate for the achievement modal's per-count triggers. */
const suggestion_count_eq: PredicateFn = (ctx, args) => {
  const target = toInt(args.n);
  if (target == null) return false;
  const count = toInt(ctx.payload.count);
  return count === target;
};

/** Fires when payload.count >= args.n. */
const suggestion_count_gte: PredicateFn = (ctx, args) => {
  const min = toInt(args.n);
  if (min == null) return false;
  const count = toInt(ctx.payload.count);
  return count != null && count >= min;
};

/** Fires when payload.count strictly equals args.n. Used by review
 *  milestones — semantically identical to suggestion_count_eq but
 *  surfaced with review-specific copy in the admin form so the editor
 *  isn't confused about which counter the predicate is gating on. */
const review_count_eq: PredicateFn = (ctx, args) => {
  const target = toInt(args.n);
  if (target == null) return false;
  const count = toInt(ctx.payload.count);
  return count === target;
};

/** Fires when payload.bookmarkers_count >= args.min. Used for the
 *  "hot — N+ people want it too" bookmark variant. */
const bookmarkers_count_gte: PredicateFn = (ctx, args) => {
  const min = toInt(args.min);
  if (min == null) return false;
  const total = toInt(ctx.payload.bookmarkersTotal ?? ctx.payload.bookmarkers_count);
  return total != null && total >= min;
};

/** Fires when there are zero other bookmarkers — user is first. */
const bookmarkers_count_zero: PredicateFn = (ctx) => {
  const total = toInt(ctx.payload.bookmarkersTotal ?? ctx.payload.bookmarkers_count) ?? 0;
  return total === 0;
};

/** Fires when the user just hit their args.n-th bookmark in the
 *  given category. Payload must carry `category_bookmark_count` (the
 *  caller's responsibility — keeps the predicate side-effect-free). */
const category_bookmark_count_eq: PredicateFn = (ctx, args) => {
  const target = toInt(args.n);
  if (target == null) return false;
  const wantCategory = toStr(args.category);
  if (wantCategory && ctx.payload.category !== wantCategory) return false;
  const c = toInt(ctx.payload.category_bookmark_count);
  return c === target;
};

/** Fires when the user just published their args.n-th review in the
 *  given category. Payload must carry `category_review_count` + (when
 *  args.category is set) `category` — see /api/reviews route. Leaving
 *  args.category empty matches any category at the same count, useful
 *  for "first-in-each-category" rules under a single moment row. */
const category_review_count_eq: PredicateFn = (ctx, args) => {
  const target = toInt(args.n);
  if (target == null) return false;
  const wantCategory = toStr(args.category);
  if (wantCategory && ctx.payload.category !== wantCategory) return false;
  const c = toInt(ctx.payload.category_review_count);
  return c === target;
};

/** Fires when payload.category matches args.category exactly. */
const category_eq: PredicateFn = (ctx, args) => {
  const want = toStr(args.category);
  if (!want) return false;
  return ctx.payload.category === want;
};

// ── Exported maps ──────────────────────────────────────────────────────

export const PREDICATES: Record<string, PredicateFn> = {
  always,
  suggestion_count_eq,
  suggestion_count_gte,
  review_count_eq,
  bookmarkers_count_gte,
  bookmarkers_count_zero,
  category_bookmark_count_eq,
  category_review_count_eq,
  category_eq,
};

export const PREDICATE_SCHEMAS: Record<string, PredicateSchema> = {
  always: {
    label: "Πάντα — δεν έχει συνθήκη",
    description: "Ταιριάζει πάντα. Χρησιμοποίησέ το ως default όταν θες ένα moment να εμφανίζεται σε κάθε fire του trigger.",
    args: {},
  },
  suggestion_count_eq: {
    label: "Όταν ο χρήστης έφτασε N συνολικές προτάσεις",
    description: "Ταιριάζει ακριβώς όταν το suggestion_count του χρήστη φτάνει στον αριθμό N μετά από αυτή τη δημοσίευση.",
    args: {
      n: { label: "Αριθμός προτάσεων (N)", type: "integer", hint: "π.χ. 1, 3, 10, 25, 50" },
    },
  },
  suggestion_count_gte: {
    label: "Όταν ο χρήστης έχει N+ συνολικές προτάσεις",
    description: "Ταιριάζει όταν το suggestion_count είναι ≥ N. Χρήσιμο για 'συνεχόμενα' μηνύματα μετά από έναν αριθμό.",
    args: {
      n: { label: "Ελάχιστος αριθμός προτάσεων", type: "integer" },
    },
  },
  review_count_eq: {
    label: "Όταν ο χρήστης έγραψε N αξιολογήσεις",
    description: "Ταιριάζει ακριβώς όταν ο χρήστης δημοσιεύσει την N-οστή αξιολόγηση. Χρησιμοποιείται με trigger 'review_published' για milestone celebrations.",
    args: {
      n: { label: "Αριθμός αξιολογήσεων (N)", type: "integer", hint: "π.χ. 1, 5, 10, 25, 50" },
    },
  },
  bookmarkers_count_gte: {
    label: "Όταν το item έχει ήδη N+ bookmarkers",
    description: "Κοινωνική απόδειξη — π.χ. εμφάνισε 'Hot' μήνυμα όταν 100+ άλλοι έχουν αποθηκεύσει το ίδιο item.",
    args: {
      min: { label: "Ελάχιστος αριθμός bookmarkers", type: "integer", hint: "π.χ. 100" },
    },
  },
  bookmarkers_count_zero: {
    label: "Όταν είναι ο πρώτος που το αποθηκεύει",
    description: "Ταιριάζει όταν κανένας άλλος δεν έχει αποθηκεύσει αυτό το item ακόμα.",
    args: {},
  },
  category_bookmark_count_eq: {
    label: "Όταν ο χρήστης φτάσει το Νο N bookmark σε κατηγορία",
    description: "π.χ. το 10ο bookmark σε movies. Άφησε την κατηγορία κενή για να ταιριάζει σε όλες (τότε το {category} placeholder αναφέρεται στην τρέχουσα).",
    args: {
      n:        { label: "N", type: "integer" },
      category: { label: "Κατηγορία (προαιρετικά)", type: "category", hint: "Άσε κενό για να ταιριάζει σε κάθε κατηγορία" },
    },
  },
  category_review_count_eq: {
    label: "Όταν ο χρήστης γράψει την N-οστή αξιολόγηση σε κατηγορία",
    description: "π.χ. η 5η αξιολόγηση σε movies. Άσε την κατηγορία κενή για να ταιριάζει σε κάθε κατηγορία (το {category} placeholder αναφέρεται στην τρέχουσα). Χρησιμοποιείται με trigger 'review_published'.",
    args: {
      n:        { label: "N", type: "integer", hint: "π.χ. 1, 3, 10" },
      category: { label: "Κατηγορία (προαιρετικά)", type: "category", hint: "Άσε κενό για να ταιριάζει σε κάθε κατηγορία" },
    },
  },
  category_eq: {
    label: "Όταν το event αφορά συγκεκριμένη κατηγορία",
    description: "Φίλτρο για συγκεκριμένη κατηγορία (π.χ. εμφάνισε αυτό το moment μόνο για food).",
    args: {
      category: { label: "Κατηγορία", type: "category" },
    },
  },
};

/** Convenience — combine predicate execution with the registry. Returns
 *  false (not eligible) when the predicate_key is unknown so a stale
 *  DB row never crashes the resolver. */
export async function runPredicate(
  predicateKey: string,
  ctx: MomentContext,
  args: Record<string, unknown>,
): Promise<boolean> {
  const fn = PREDICATES[predicateKey];
  if (!fn) {
    console.warn(`[moments] unknown predicate_key="${predicateKey}" — skipping`);
    return false;
  }
  try {
    return await fn(ctx, args);
  } catch (err) {
    console.error(`[moments] predicate "${predicateKey}" threw:`, err);
    return false;
  }
}
