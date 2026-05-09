/**
 * Quick A/B-style test for the Gemini AI integration.
 * Runs ~15 representative Greek queries (search + submission) through
 * Gemini 2.5 Flash and prints structured outputs + latency + token use.
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/test-ai-gemini.js
 *   (or set GEMINI_API_KEY in .env.local)
 */

require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}

const client = new GoogleGenerativeAI(KEY);

const SEARCH_PROMPT = `Είσαι assistant για το Proteino, μια ελληνική πλατφόρμα προτάσεων. Ο χρήστης γράφει ένα query σε ελληνικά (ή greeklish).

Εξάγαγε δομημένη πρόθεση από το query. Επέστρεψε ΜΟΝΟ JSON ΑΥΤΉΣ ΤΗΣ ΑΚΡΙΒΏΣ ΜΟΡΦΉΣ:

{
  "intent": "<original query verbatim>",
  "categories": [<one or more from: movies, series, books, food, recipes, bars, hotels, theater, events>],
  "vibe": "<MOOD/ATMOSPHERE descriptor only — cozy, romantic, lively, chill, family — ή null>",
  "type": "<sub-type/genre/cuisine — sushi, italian, comedy, thriller, cocktail-bar, music-bar, vegan — ή null>",
  "decade": "<πχ '1990s', '2000s' ή null>",
  "price": "<'budget' / 'mid' / 'high' ή null>",
  "person": "<όνομα ηθοποιού/σκηνοθέτη/συγγραφέα ή null>",
  "location": "<Greek place name (πόλη/περιοχή/νησί) ή null>"
}

ΚΡΙΣΙΜΟΙ ΚΑΝΟΝΕΣ:
- "vibe" = ΜΟΝΟ συναίσθημα/ατμόσφαιρα. ΟΧΙ τύπος, ΟΧΙ θέμα, ΟΧΙ τιμή.
  ΣΩΣΤΑ: "cozy", "romantic", "energetic", "chill"
  ΛΑΘΟΣ: "μουσική" (αυτό είναι type), "1990s" (αυτό είναι decade), "φθηνά" (αυτό είναι price), "ψυχολογίας" (αυτό είναι type/genre)
- "type" = είδος/κουζίνα/κατηγορία περιεχομένου. πχ "sushi", "comedy", "horror", "psychology", "music-bar", "rooftop"
- "decade" = δεκαετία ή χρονιά (όπως "2010")
- "price" = "budget" (φθηνά/cheap), "mid", "high" (premium/ακριβά)
- "person" = κύρια ονόματα (Nolan, Scorsese, Παπαδιαμάντης, Γκάγκος)
- "location" = περιοχή/πόλη/νησί. ΟΧΙ "κοντά μου" (κενό), ΟΧΙ "κέντρο" χωρίς πόλη
- Greeklish like "kalifeisi" → "Καλλιθέα", normalize στα ελληνικά
- Multi-category όταν είναι αμφίσημο (πχ συνταγές + φαγητό)
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown, χωρίς σχόλια.`;

const SUBMISSION_PROMPT = `Είσαι assistant για το Proteino. Ο χρήστης περιγράφει κάτι που του άρεσε σε ελληνικά. Εξάγαγε δομημένα στοιχεία από το κείμενό του.

Επέστρεψε ΜΟΝΟ JSON:

{
  "title": "<τίτλος αν αναγνωρίζεται, αλλιώς null>",
  "category": "<one of: movies, series, books, food, recipes, bars, hotels, theater, events, ή null αν άγνωστο>",
  "confidence": <0-100>,
  "year_hint": <number ή null>,
  "actor_hint": "<όνομα ηθοποιού/συγγραφέα/καλλιτέχνη ή null>",
  "director_hint": "<όνομα σκηνοθέτη/συγγραφέα ή null>",
  "mood": "<short emotional descriptor ή null>"
}

Κανόνες:
- Αν ο χρήστης λέει "είδα το X" / "διάβασα το Y" / "πήγα στο Z" → προσπάθησε να εντοπίσεις τον τίτλο
- Greeklish + ελληνικά mixed: normalize στα ελληνικά
- confidence 0-30: άγνωστο/ασαφές, 30-70: πιθανός match, 70-100: σχεδόν σίγουρο
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown.`;

const SEARCH_QUERIES = [
  "γαλατσι μπαρ για βραδυ με μουσικη",
  "ταινιες του νολαν",
  "vegan φαγητο κοντά μου",
  "βιβλια ψυχολογιας ελληνες συγγραφεις",
  "θεατρικη παρασταση κωμωδια αυτη την εβδομαδα",
  "φθηνα ξενοδοχεια μυκονος",
  "συνταγη για παιδικα παρτυ",
  "scorsese 1990s",
  "καφε με roof garden στο κεντρο",
  "movies real story 2010",
];

const SUBMISSION_TEXTS = [
  "Είδα το Oppenheimer χθες, εκπληκτική ταινία του Νόλαν",
  "Διάβασα 'Παραμύθι χωρίς όνομα' του Δελφή, κορυφαίο",
  "Πήγα στο μαγαζάκι του Νικόλα στη Σκύρο, τέλειο σολομό",
  "ωραιο ηταν",
  "Ένα από τα καλύτερα brunch που έχω φάει ποτέ - το Φως στη Γλυφάδα. Σερβίρισμα τέλειο, atmosphere ζεστή",
];

function approxTokens(s) {
  // Greek text averages ~3-4 chars/token. Rough estimate for cost preview.
  return Math.ceil(s.length / 3.5);
}

async function runOne(prompt, query) {
  const t0 = Date.now();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: prompt,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      responseMimeType: "application/json",
    },
  });
  const res = await model.generateContent(query);
  const elapsed = Date.now() - t0;
  const text = res.response.text();
  const usage = res.response.usageMetadata;
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { _raw: text, _parse_error: true }; }
  return {
    elapsed,
    tokens: usage
      ? { in: usage.promptTokenCount, out: usage.candidatesTokenCount }
      : { in: approxTokens(prompt + query), out: approxTokens(text) },
    parsed,
  };
}

// Free-tier throttling: gemini-2.5-flash is 5 RPM = one call per 12s.
// Wait 13s between calls to leave a small buffer.
const THROTTLE_MS = 13_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runWithThrottle(prompt, query, label) {
  try {
    const r = await runOne(prompt, query);
    console.log(`${label}: "${query}"`);
    console.log(`   ${r.elapsed}ms · ~${r.tokens.in}in/${r.tokens.out}out tokens`);
    console.log(`   →`, JSON.stringify(r.parsed, null, 2).split("\n").map((l, i) => i === 0 ? l : "     " + l).join("\n"));
    console.log();
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n")[0];
    console.log(`${label}: "${query}" → ERROR ${msg}\n`);
  }
}

async function main() {
  console.log("=== SEARCH QUERIES ===");
  console.log(`(throttling ${THROTTLE_MS}ms between calls — free tier is 5 RPM)\n`);
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    if (i > 0) await sleep(THROTTLE_MS);
    await runWithThrottle(SEARCH_PROMPT, SEARCH_QUERIES[i], "Q");
  }

  console.log("\n=== SUBMISSION TEXTS ===\n");
  for (let i = 0; i < SUBMISSION_TEXTS.length; i++) {
    await sleep(THROTTLE_MS);
    await runWithThrottle(SUBMISSION_PROMPT, SUBMISSION_TEXTS[i], "T");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
