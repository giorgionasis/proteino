/**
 * Greek-aware slugifier.
 *
 * Converts strings like "Βόρεια Προάστια" → "voreia-proastia" so they
 * become URL-safe slugs. Used by admin region/category create flows.
 *
 * Strategy: NFD-normalize to strip combining accents, then map Greek
 * letters to their Latin transliteration (single source — `el-GR`
 * official Greeklish convention). Final pass lowercases, replaces
 * non [a-z0-9] runs with `-`, trims edge dashes.
 */
const GREEK_MAP: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "ks", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps",
  ω: "o",
};

export function slugify(input: string): string {
  if (!input) return "";

  // Strip combining accents (NFD splits "ά" into "α" + accent mark).
  const folded = input.normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Greek → Latin char-by-char.
  let latinized = "";
  for (const ch of folded.toLowerCase()) {
    latinized += GREEK_MAP[ch] ?? ch;
  }

  return latinized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
