export const VIBES = [
  "cozy",
  "adventurous",
  "romantic",
  "mysterious",
  "inspiring",
  "funny",
  "intense",
  "relaxing",
  "educational",
  "nostalgic",
  "quirky",
  "uplifting",
] as const;

export type Vibe = (typeof VIBES)[number];

export const VIBE_LABELS: Record<Vibe, string> = {
  cozy: "Cozy",
  adventurous: "Περιπέτεια",
  romantic: "Ρομαντικό",
  mysterious: "Μυστήριο",
  inspiring: "Εμπνευστικό",
  funny: "Χιουμοριστικό",
  intense: "Έντονο",
  relaxing: "Χαλαρωτικό",
  educational: "Εκπαιδευτικό",
  nostalgic: "Νοσταλγικό",
  quirky: "Ιδιόρρυθμο",
  uplifting: "Ανυψωτικό",
};
