#!/usr/bin/env node
/**
 * AI submission flow — per-category behavioural test.
 *
 * For each of the 9 categories we send a hand-authored Greek submission
 * text through GET /api/ai/match and capture the full SubmissionAnalysis.
 * The texts are intentionally diverse:
 *   - 6 lead with common Greek verbs (Είδα/Παρακολούθησα/Διάβασα/Έφτιαξα/
 *     Πήγαμε/Έμεινα) to regression-test the "leading-verb poisons the
 *     title" bug.
 *   - Mix of Greek-script titles, Latin-script titles, and Greek
 *     transliterations of foreign works.
 *   - Mix of well-indexed real-world entities (TMDB / Books / Places will
 *     get hit) and entities with no external verification (theater play,
 *     festival, recipe).
 *
 * Output: scripts/test-submission-flow-results.md (formatted report) +
 * scripts/test-submission-flow-results.json (raw responses for diffing
 * over time).
 *
 * Usage: node scripts/test-submission-flow.mjs  (dev server must be up)
 */

import { writeFileSync } from "node:fs";

const BASE_URL = process.env.PROTEINO_BASE_URL || "http://localhost:3000";

const TESTS = [
  {
    id: "movies",
    text: "Είδα την ταινία Anora, εξαιρετική ερμηνεία από τη Mikey Madison, με κέρδισε για τα καλά.",
    note: "Leading verb 'Είδα' (regression: should NOT become the title). Latin-script title. Actor name. Real TMDB-indexed Oscar winner.",
    expect: {
      category: "movies",
      title_contains: "Anora",
      enrichment: "tmdb",
      tier: "high|medium",
    },
  },
  {
    id: "series",
    text: "Παρακολούθησα τη νέα σεζόν του Severance στο Apple TV+, η συνέχεια ήταν εξαιρετική και η ατμόσφαιρα πιο σκοτεινή από την πρώτη σεζόν.",
    note: "σεζόν keyword forces series branch (regression for the 'σειρά → movie' bug). Channel mention. Latin-script title.",
    expect: {
      category: "series",
      title_contains: "Severance",
      enrichment: "tmdb",
      tier: "high|medium",
    },
  },
  {
    id: "books",
    text: "Διάβασα τον Άρχοντα των Δαχτυλιδιών του Tolkien, υπέροχο fantasy με τεράστια λεπτομέρεια και ιστορική βάση.",
    note: "Greek-translated title of Latin-script work. Author follows after το/του. Tests english_title_hint + english_author_hint fallback to Google Books.",
    expect: {
      category: "books",
      title_contains: "Άρχοντ|Lord",
      enrichment: "google-books",
      tier: "high|medium",
    },
  },
  {
    id: "recipes",
    text: "Έφτιαξα τσιπς από κολοκυθάκια στο φούρνο, υγιεινό και νόστιμο, ιδανικό για snack την παρέα.",
    note: "No external API for recipes — Gemini-only soft lock. Tests whether category detection picks 'recipes' from έφτιαξα + στο φούρνο, and whether title extraction is reasonable.",
    expect: {
      category: "recipes",
      title_contains: "τσιπς|κολοκυθ",
      enrichment: null,
      tier: "high|medium|low",
    },
  },
  {
    id: "food",
    text: "Πήγαμε για φαγητό στην Σπονδή στο Παγκράτι, εκπληκτικό fine dining με ελληνικά υλικά και επιμέλεια στις γεύσεις.",
    note: "Athens fine-dining venue. Tests location_hint extraction + Google Places match. πάμε/φάγαμε style leading verb.",
    expect: {
      category: "food",
      title_contains: "Σπονδή|Spondi",
      enrichment: "google-places",
      tier: "high|medium",
    },
  },
  {
    id: "bars",
    text: "Ήπιαμε cocktails στο Baba Au Rum κοντά στο Σύνταγμα, ένα από τα καλύτερα cocktail bars της Αθήνας, η ατμόσφαιρα σε ταξιδεύει.",
    note: "Internationally listed Athens cocktail bar. Tests Places + categorizeGooglePlace (cocktail-bar should land in 'bars', not 'food').",
    expect: {
      category: "bars",
      title_contains: "Baba",
      enrichment: "google-places",
      tier: "high|medium",
    },
  },
  {
    id: "hotels",
    text: "Έμεινα στο Coco-Mat Athens BC ξενοδοχείο με υπέροχη θέα στην Ακρόπολη, design hotel με ψυχή και τέλειο πρωινό.",
    note: "Greek-Athens design hotel. Tests Places venue + hotels disambiguation. ξενοδοχείο keyword.",
    expect: {
      category: "hotels",
      title_contains: "Coco|Mat|BC",
      enrichment: "google-places",
      tier: "high|medium",
    },
  },
  {
    id: "theater",
    text: "Είδα την παράσταση Άμλετ στο Εθνικό Θέατρο σε σκηνοθεσία Στάθη Λιβαθινού, μια εξαιρετική σύγχρονη ανάγνωση του κλασικού.",
    note: "No external enrichment — Gemini-only. Tests theater keyword detection (παράσταση/θέατρο/σκηνοθεσία) + director_hint extraction.",
    expect: {
      category: "theater",
      title_contains: "Άμλετ|Hamlet",
      enrichment: null,
      tier: "high|medium|low",
    },
  },
  {
    id: "events",
    text: "Πήγα στο Release Athens festival, στη συναυλία των Massive Attack στο Πλατώ Φαλήρου, καταπληκτική ατμόσφαιρα και ηχητική.",
    note: "No external enrichment. Tests event/συναυλία/festival detection + performer extraction.",
    expect: {
      category: "events",
      title_contains: "Release|Massive",
      enrichment: null,
      tier: "high|medium|low",
    },
  },
];

async function runOne(test) {
  const start = Date.now();
  const url = `${BASE_URL}/api/ai/match?text=${encodeURIComponent(test.text)}`;
  let body, status, error;
  try {
    const res = await fetch(url, { method: "GET" });
    status = res.status;
    body = await res.json();
  } catch (e) {
    error = e?.message || String(e);
  }
  const elapsed = Date.now() - start;
  return { test, status, body, error, elapsed_ms: elapsed };
}

function shortAlts(matchData) {
  if (!matchData?.alternatives?.length) return "—";
  return matchData.alternatives
    .map((a) => `${a.title}${a.year ? ` (${a.year})` : ""} score=${a.score}`)
    .join("; ");
}

function fmtCell(v) {
  if (v == null) return "—";
  if (typeof v === "string" && v.length > 80) return v.slice(0, 77) + "…";
  return String(v);
}

function buildReport(results) {
  const lines = [];
  lines.push("# AI Submission Flow — Per-category Behavioural Test");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Endpoint: \`${BASE_URL}/api/ai/match\``);
  lines.push("");
  lines.push("Each test sends a hand-authored Greek submission text and captures the full `SubmissionAnalysis` from `/api/ai/match`. The endpoint runs Gemini extraction (`extractSubmissionFields`) then routes to the appropriate verification provider (TMDB/Books/Places) or falls through to Gemini-only soft lock for theater/events/recipes.");
  lines.push("");

  // ── Per-category detail ─────────────────────────────────────────
  for (const r of results) {
    const t = r.test;
    lines.push(`## ${t.id.toUpperCase()}`);
    lines.push("");
    lines.push(`> ${t.text}`);
    lines.push("");
    lines.push(`**Test intent:** ${t.note}`);
    lines.push("");
    lines.push(`**Expected:** category=\`${t.expect.category}\` · title~\`${t.expect.title_contains}\` · enrichment=\`${t.expect.enrichment ?? "—"}\` · tier=\`${t.expect.tier}\``);
    lines.push("");

    if (r.error) {
      lines.push(`**ERROR:** \`${r.error}\``);
      lines.push("");
      continue;
    }

    const b = r.body || {};
    const md = b.matchData || {};
    const isMatch =
      (t.expect.category && b.category === t.expect.category) ||
      // venue Gemini-vs-Google reclassification (e.g. bars → food)
      (t.expect.category && md.gemini_guessed_category === t.expect.category);
    const titleMatch =
      t.expect.title_contains &&
      b.title &&
      new RegExp(t.expect.title_contains, "i").test(b.title);
    const verdict = !b.matched
      ? "⚠️ NOT MATCHED"
      : isMatch && titleMatch
        ? "✅ AS EXPECTED"
        : isMatch
          ? "🟡 CATEGORY OK · title drift"
          : "❌ CATEGORY MISMATCH";

    lines.push(`**Result:** ${verdict}  · HTTP ${r.status} · ${r.elapsed_ms}ms`);
    lines.push("");
    lines.push("| Field | Value |");
    lines.push("|---|---|");
    lines.push(`| matched | ${b.matched} |`);
    lines.push(`| title | ${fmtCell(b.title)} |`);
    lines.push(`| category | ${fmtCell(b.category)} |`);
    lines.push(`| confidence | ${fmtCell(b.confidence)} |`);
    lines.push(`| message | ${fmtCell(b.message)} |`);
    lines.push(`| matchData.source | ${fmtCell(md.source)} |`);
    lines.push(`| matchData.tier | ${fmtCell(md.confidence_tier)} |`);
    lines.push(`| matchData.best_score | ${fmtCell(md.best_score)} |`);
    lines.push(`| matchData.tried_candidate | ${fmtCell(md.tried_candidate)} |`);

    // Source-specific rich fields
    if (md.source === "tmdb") {
      lines.push(`| tmdb_id | ${fmtCell(md.tmdb_id)} |`);
      lines.push(`| year | ${fmtCell(md.year)} |`);
      lines.push(`| director | ${fmtCell(md.director)} |`);
      lines.push(`| cast (top 3) | ${md.cast?.slice(0, 3).map((c) => c.name).join(", ") || "—"} |`);
      lines.push(`| genres | ${md.genres?.join(", ") || "—"} |`);
      lines.push(`| country | ${fmtCell(md.country)} |`);
      lines.push(`| poster_url | ${md.poster_url ? "✓" : "—"} |`);
    } else if (md.source === "google_books") {
      lines.push(`| google_books_id | ${fmtCell(md.google_books_id)} |`);
      lines.push(`| author | ${fmtCell(md.author ?? md.authors?.[0])} |`);
      lines.push(`| publisher | ${fmtCell(md.publisher)} |`);
      lines.push(`| year | ${fmtCell(md.published_year ?? md.year)} |`);
      lines.push(`| pages | ${fmtCell(md.pages)} |`);
      lines.push(`| cover | ${md.cover_url || md.poster_url ? "✓" : "—"} |`);
    } else if (md.source === "google_places" || md.source === "google-places") {
      lines.push(`| place_id | ${fmtCell(md.google_places_id ?? md.place_id)} |`);
      lines.push(`| address | ${fmtCell(md.address ?? md.short_address)} |`);
      lines.push(`| lat | ${fmtCell(md.lat)} |`);
      lines.push(`| lng | ${fmtCell(md.lng)} |`);
      lines.push(`| primary_type | ${fmtCell(md.primary_type)} |`);
      lines.push(`| gemini_guessed | ${fmtCell(md.gemini_guessed_category)} |`);
      lines.push(`| google_derived | ${fmtCell(md.google_derived_category)} |`);
      lines.push(`| cover | ${md.cover_url || md.poster_url || md.backdrop_url ? "✓" : "—"} |`);
    } else if (md.source === "gemini" || md.source === "heuristic") {
      const gx = md.gemini_extraction || {};
      lines.push(`| derived_title | ${fmtCell(md.derived_title)} |`);
      lines.push(`| gemini.year_hint | ${fmtCell(gx.year_hint)} |`);
      lines.push(`| gemini.actor_hint | ${fmtCell(gx.actor_hint)} |`);
      lines.push(`| gemini.director_hint | ${fmtCell(gx.director_hint)} |`);
      lines.push(`| gemini.mood | ${fmtCell(gx.mood)} |`);
      lines.push(`| gemini.english_title_hint | ${fmtCell(gx.english_title_hint)} |`);
      lines.push(`| gemini.english_author_hint | ${fmtCell(gx.english_author_hint)} |`);
      lines.push(`| gemini.location_hint | ${fmtCell(gx.location_hint)} |`);
    }

    lines.push(`| alternatives | ${shortAlts(md)} |`);
    lines.push(`| quality.label | ${fmtCell(b.quality?.label)} |`);
    lines.push(`| quality.tip | ${fmtCell(b.quality?.tip)} |`);
    lines.push("");
  }

  // ── Summary table ──────────────────────────────────────────────
  lines.push("---");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Category | Matched | Cat OK | Title OK | Source | Tier | ms |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of results) {
    const t = r.test, b = r.body || {}, md = b.matchData || {};
    const isCatOk =
      (t.expect.category && b.category === t.expect.category) ||
      (t.expect.category && md.gemini_guessed_category === t.expect.category);
    const isTitleOk =
      t.expect.title_contains && b.title && new RegExp(t.expect.title_contains, "i").test(b.title);
    lines.push(`| ${t.id} | ${b.matched ? "✓" : "✗"} | ${isCatOk ? "✓" : "✗"} | ${isTitleOk ? "✓" : "✗"} | ${md.source ?? "—"} | ${md.confidence_tier ?? "—"} | ${r.elapsed_ms} |`);
  }
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log(`Running ${TESTS.length} submission tests against ${BASE_URL}...`);
  const results = [];
  for (const t of TESTS) {
    process.stdout.write(`  [${t.id}] `);
    const r = await runOne(t);
    if (r.error) {
      process.stdout.write(`ERROR: ${r.error}\n`);
    } else {
      process.stdout.write(
        `HTTP ${r.status} · ${r.body?.matched ? "matched" : "no-match"} · ${r.elapsed_ms}ms\n`,
      );
    }
    results.push(r);
  }

  const report = buildReport(results);
  writeFileSync("scripts/test-submission-flow-results.md", report, "utf8");
  writeFileSync(
    "scripts/test-submission-flow-results.json",
    JSON.stringify(results, null, 2),
    "utf8",
  );
  console.log("\nWritten:");
  console.log("  scripts/test-submission-flow-results.md");
  console.log("  scripts/test-submission-flow-results.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
