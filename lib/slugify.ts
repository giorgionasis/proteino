/**
 * The one slug function. Every URL slug / key made from Greek text goes
 * through here (items, collections, subcategories, regions, …).
 *
 * Convention = the old proteino.gr (chosen session 41 for continuity with
 * the 1,884 migrated addresses): Greek → Latin letter by letter, with
 *
 *   χ → x     ξ → ks    ψ → ps    θ → th    ου → ou
 *   η, ι → i  υ → y     β → v     ω → o
 *   αυ / ευ / ηυ → av / ev / iv before a vowel or voiced consonant,
 *                  af / ef / if before a voiceless one or at word end
 *   μπ → mp   ντ → nt   γκ → gk   γγ → gg   (plain letter by letter)
 *
 * A diaeresis splits a diphthong: προϋπόθεση → proypothesi, not "prou…".
 * Accents are dropped; anything that isn't a-z / 0-9 becomes "-".
 *
 * Only NEW slugs use this — stored slugs never change (links, SEO and
 * the legacy redirects depend on them). Never compare a stored slug with
 * a freshly computed one to find an item; match titles instead
 * (lib/items/find-existing.ts).
 */

const LETTER: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "ks", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "x", ψ: "ps",
  ω: "o",
};

/** After αυ/ευ/ηυ these make the υ sound "f"; everything else "v". */
const VOICELESS = new Set(["θ", "κ", "ξ", "π", "σ", "ς", "τ", "φ", "χ", "ψ"]);

const MAX_LENGTH = 90;

export function slugify(input: string): string {
  if (!input) return "";

  // Per character: base letter + whether it carries a diaeresis.
  const chars = [...input.normalize("NFC").toLowerCase()].map((c) => {
    const d = c.normalize("NFD");
    return { base: d[0], dia: d.includes("̈") };
  });

  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const { base } = chars[i];
    const next = chars[i + 1];

    if (next && next.base === "υ" && !next.dia) {
      if (base === "ο") { out += "ou"; i++; continue; }
      if (base === "α" || base === "ε" || base === "η") {
        const after = chars[i + 2]?.base;
        const f = after === undefined || !LETTER[after] || VOICELESS.has(after);
        out += (base === "α" ? "a" : base === "ε" ? "e" : "i") + (f ? "f" : "v");
        i++;
        continue;
      }
    }

    out += LETTER[base] ?? base;
  }

  const slug = out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length <= MAX_LENGTH) return slug;
  const cut = slug.slice(0, MAX_LENGTH);
  return cut.slice(0, cut.lastIndexOf("-") > 40 ? cut.lastIndexOf("-") : MAX_LENGTH).replace(/-+$/, "");
}
