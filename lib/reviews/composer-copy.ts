/**
 * Per-category copy for the review composer modal. Single source of truth so
 * the 9 detail pages don't drift apart on phrasing. Edit here once, applies
 * everywhere.
 */

export interface ComposerCopy {
  /** Headline once the user has tapped a rating. */
  thanksLine: string;
  /** Sub-label above the textarea. */
  shareLabel: string;
  /** Placeholder inside the textarea — category-aware writing prompt. */
  placeholder: string;
  /** Plural genitive used in success copy ("...για να διαλέξουν τι να ___") */
  successVerb: string;
  /** Category-aware question on the detail page rate-this-item card. */
  question: string;
}

const COPY: Record<string, ComposerCopy> = {
  movies: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς τι σου άρεσε",
    placeholder: "Ποια σκηνή σε άγγιξε; Τι σε εντυπωσίασε στη σκηνοθεσία ή τις ερμηνείες;",
    successVerb: "να δουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες την ταινία;",
  },
  series: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς τι σου άρεσε",
    placeholder: "Πώς σε άφησε το τέλος; Καλύτερη εποχή; Καλύτερος χαρακτήρας;",
    successVerb: "να δουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες τη σειρά;",
  },
  books: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς τι σου άρεσε",
    placeholder: "Ποια ιδέα σε ξύπνησε; Πώς ήταν η γραφή; Ένας χαρακτήρας που θυμάσαι;",
    successVerb: "να διαβάσουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;",
  },
  food: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς την εμπειρία σου",
    placeholder: "Πώς ήταν το φαγητό; Service; Ατμόσφαιρα; Τιμές;",
    successVerb: "να επισκεφθούν",
    question: "Με πόσα αστέρια θα βαθμολογούσες το εστιατόριο;",
  },
  bars: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς την εμπειρία σου",
    placeholder: "Cocktails, ατμόσφαιρα, service; Πότε αξίζει να πας;",
    successVerb: "να επισκεφθούν",
    question: "Με πόσα αστέρια θα το βαθμολογούσες;",
  },
  hotels: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς την εμπειρία σου",
    placeholder: "Δωμάτιο, τοποθεσία, παροχές, service — τι ξεχώρισε;",
    successVerb: "να μείνουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες το κατάλυμα;",
  },
  recipes: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς πώς σου βγήκε",
    placeholder: "Τι σου άρεσε; Τι θα άλλαζες; Tips για το επόμενο;",
    successVerb: "να φτιάξουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες τη συνταγή;",
  },
  theater: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς τι σου άρεσε",
    placeholder: "Ερμηνεία, σκηνοθεσία, σκηνικά — τι ξεχώρισε;",
    successVerb: "να δουν",
    question: "Με πόσα αστέρια θα βαθμολογούσες την παράσταση;",
  },
  events: {
    thanksLine: "Σε ευχαριστούμε για τη βαθμολογία!",
    shareLabel: "Μπορείς να μοιραστείς την εμπειρία σου",
    placeholder: "Performers, ατμόσφαιρα, οργάνωση — πώς ήταν;",
    successVerb: "να πάνε",
    question: "Με πόσα αστέρια θα βαθμολογούσες την εκδήλωση;",
  },
};

export function composerCopy(category: string): ComposerCopy {
  return COPY[category] ?? COPY.movies;
}

/** Calibration label per star (1-5). Shows next to the chosen rating. */
export const STAR_LABELS: Record<number, string> = {
  1: "Δεν μου άρεσε",
  2: "Έτσι κι έτσι",
  3: "Καλό",
  4: "Πολύ καλό",
  5: "Αγαπημένο μου!",
};
