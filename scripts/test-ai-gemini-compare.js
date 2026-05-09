/**
 * Side-by-side compare of gemini-2.5-flash vs gemini-2.5-flash-lite on
 * the same Greek search + submission queries. Prints both outputs +
 * latency + token use so we can decide which to ship.
 *
 * Free-tier throttling: Flash is 5 RPM, Flash-Lite is 15 RPM. We run
 * Flash first (slow), then Flash-Lite. Total runtime ~5 min for 15 queries.
 *
 *   GEMINI_API_KEY=... node scripts/test-ai-gemini-compare.js
 */

require("dotenv").config({ path: ".env.local" });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("Missing GEMINI_API_KEY"); process.exit(1); }

const client = new GoogleGenerativeAI(KEY);

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const RPM = { "gemini-2.5-flash": 5, "gemini-2.5-flash-lite": 15 };

const SEARCH_PROMPT = `Είσαι assistant για το Proteino, μια ελληνική πλατφόρμα προτάσεων. Ο χρήστης γράφει ένα query σε ελληνικά (ή greeklish).

Εξάγαγε δομημένη πρόθεση από το query. Επέστρεψε ΜΟΝΟ JSON ΑΥΤΉΣ ΤΗΣ ΑΚΡΙΒΏΣ ΜΟΡΦΉΣ:

{
  "intent": "<original query verbatim>",
  "categories": [<one or more from: movies, series, books, food, recipes, bars, hotels, theater, events>],
  "vibe": "<MOOD/ATMOSPHERE descriptor only — cozy, romantic, lively, chill, family — ή null>",
  "type": "<sub-type/genre/cuisine — sushi, italian, comedy, thriller, cocktail-bar, music-bar, vegan, rooftop, psychology — ή null>",
  "decade": "<πχ '1990s', '2010s' ή null>",
  "price": "<'budget' / 'mid' / 'high' ή null>",
  "person": "<όνομα ηθοποιού/σκηνοθέτη/συγγραφέα ή null>",
  "location": "<Greek place name (πόλη/περιοχή/νησί) ή null>"
}

ΚΡΙΣΙΜΟΙ ΚΑΝΟΝΕΣ:
- "vibe" = ΜΟΝΟ συναίσθημα/ατμόσφαιρα. ΟΧΙ τύπος, ΟΧΙ θέμα, ΟΧΙ τιμή.
- "type" = είδος/κουζίνα/κατηγορία περιεχομένου
- "decade" = δεκαετία ή χρονιά
- "price" = "budget" / "mid" / "high"
- "person" = κύρια ονόματα (Nolan, Scorsese, Παπαδιαμάντης)
- "location" = περιοχή/πόλη/νησί. ΟΧΙ "κοντά μου", ΟΧΙ μόνο "κέντρο"
- Greeklish like "kalifeisi" → "Καλλιθέα"
- Multi-category όταν αμφίσημο
- Επιστροφή ΜΟΝΟ έγκυρου JSON, χωρίς markdown.`;

const SUBMISSION_PROMPT = `Είσαι assistant για το Proteino. Ο χρήστης περιγράφει κάτι που του άρεσε σε ελληνικά. Εξάγαγε δομημένα στοιχεία από το κείμενό του.

Επέστρεψε ΜΟΝΟ JSON:
{
  "title": "<τίτλος ή null>",
  "category": "<one of: movies, series, books, food, recipes, bars, hotels, theater, events, ή null>",
  "confidence": <0-100>,
  "year_hint": <number ή null>,
  "actor_hint": "<όνομα ή null>",
  "director_hint": "<όνομα ή null>",
  "mood": "<short descriptor ή null>"
}

Κανόνες:
- "είδα το X" / "διάβασα το Y" / "πήγα στο Z" → εντόπισε τον τίτλο
- confidence 0-30 ασαφές, 30-70 πιθανός, 70-100 σχεδόν σίγουρο
- ΜΟΝΟ έγκυρο JSON.`;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runOne(modelName, prompt, query) {
  const t0 = Date.now();
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: prompt,
    generationConfig: { temperature: 0.2, topP: 0.95, responseMimeType: "application/json" },
  });
  const res = await model.generateContent(query);
  const elapsed = Date.now() - t0;
  const usage = res.response.usageMetadata;
  let parsed;
  try { parsed = JSON.parse(res.response.text()); } catch { parsed = { _raw: res.response.text() }; }
  return { elapsed, tokens: usage ? { in: usage.promptTokenCount, out: usage.candidatesTokenCount } : null, parsed };
}

async function runAll(modelName, prompt, queries, label) {
  const throttle = Math.ceil(60_000 / RPM[modelName]) + 500; // ms between calls
  const results = [];
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await sleep(throttle);
    try {
      const r = await runOne(modelName, prompt, queries[i]);
      results.push({ query: queries[i], ...r });
      process.stdout.write(`  [${label}] ${i + 1}/${queries.length} ${r.elapsed}ms\n`);
    } catch (e) {
      results.push({ query: queries[i], error: String(e.message ?? e).split("\n")[0] });
      process.stdout.write(`  [${label}] ${i + 1}/${queries.length} ERROR\n`);
    }
  }
  return results;
}

function summarize(results) {
  const okCount = results.filter((r) => !r.error).length;
  const avgLatency = results
    .filter((r) => !r.error)
    .reduce((s, r) => s + r.elapsed, 0) / Math.max(1, okCount);
  const totalTokensIn = results
    .filter((r) => r.tokens)
    .reduce((s, r) => s + r.tokens.in, 0);
  const totalTokensOut = results
    .filter((r) => r.tokens)
    .reduce((s, r) => s + r.tokens.out, 0);
  return { okCount, total: results.length, avgLatency, totalTokensIn, totalTokensOut };
}

function compactJson(obj) {
  if (!obj) return "(none)";
  const out = {};
  // Drop nulls so the printout is scannable
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && v !== "") out[k] = v;
  }
  return JSON.stringify(out);
}

async function main() {
  const allResults = {};

  console.log("\n===== SEARCH QUERIES =====\n");
  for (const m of MODELS) {
    console.log(`\n--- ${m} ---`);
    allResults[`${m}-search`] = await runAll(m, SEARCH_PROMPT, SEARCH_QUERIES, m.replace("gemini-2.5-", ""));
  }

  console.log("\n===== SUBMISSION TEXTS =====\n");
  for (const m of MODELS) {
    console.log(`\n--- ${m} ---`);
    allResults[`${m}-submission`] = await runAll(m, SUBMISSION_PROMPT, SUBMISSION_TEXTS, m.replace("gemini-2.5-", ""));
  }

  // Side-by-side print
  console.log("\n\n========== SEARCH SIDE-BY-SIDE ==========\n");
  for (let i = 0; i < SEARCH_QUERIES.length; i++) {
    const q = SEARCH_QUERIES[i];
    const f = allResults["gemini-2.5-flash-search"][i];
    const l = allResults["gemini-2.5-flash-lite-search"][i];
    console.log(`Q: "${q}"`);
    console.log(`  flash      ${f.error ? `ERROR ${f.error}` : `${f.elapsed}ms · ${compactJson(f.parsed)}`}`);
    console.log(`  flash-lite ${l.error ? `ERROR ${l.error}` : `${l.elapsed}ms · ${compactJson(l.parsed)}`}`);
    console.log();
  }

  console.log("\n========== SUBMISSION SIDE-BY-SIDE ==========\n");
  for (let i = 0; i < SUBMISSION_TEXTS.length; i++) {
    const t = SUBMISSION_TEXTS[i];
    const f = allResults["gemini-2.5-flash-submission"][i];
    const l = allResults["gemini-2.5-flash-lite-submission"][i];
    console.log(`T: "${t}"`);
    console.log(`  flash      ${f.error ? `ERROR ${f.error}` : `${f.elapsed}ms · ${compactJson(f.parsed)}`}`);
    console.log(`  flash-lite ${l.error ? `ERROR ${l.error}` : `${l.elapsed}ms · ${compactJson(l.parsed)}`}`);
    console.log();
  }

  // Aggregate stats
  console.log("\n========== STATS ==========\n");
  for (const m of MODELS) {
    const ss = summarize(allResults[`${m}-search`]);
    const sub = summarize(allResults[`${m}-submission`]);
    console.log(`${m}:`);
    console.log(`  search:     ${ss.okCount}/${ss.total} ok · avg ${Math.round(ss.avgLatency)}ms · tokens ${ss.totalTokensIn}in/${ss.totalTokensOut}out`);
    console.log(`  submission: ${sub.okCount}/${sub.total} ok · avg ${Math.round(sub.avgLatency)}ms · tokens ${sub.totalTokensIn}in/${sub.totalTokensOut}out`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
