/**
 * Subcategory FIX Script — Strict Mapping
 *
 * Re-evaluates every item's subcategory using STRICT mapping rules.
 * Only assigns a subcategory when there's a clean semantic match.
 * NULLs items where the original tag doesn't naturally fit any subcategory.
 *
 * Run: node scripts/fix-subcategories.js [--apply]
 *   without --apply  → dry run, prints what WOULD change
 *   with    --apply  → actually patches the database
 */

const SUPABASE_URL = "https://qwrryuyukoiqccxwauuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cnJ5dXl1a29pcWNjeHdhdXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0NDM2MywiZXhwIjoyMDkzMDIwMzYzfQ.olZv-lhhEvPDH-UrFoL1XvmOl-fy-0sYLuqEBQ23Cnk";

const APPLY = process.argv.includes("--apply");

// ─── NEW SUBCATEGORIES TO ADD (auto-seeded if missing) ───────────────────
const NEW_SUBCATEGORIES = [
  { category: "movies",  name: "Μιούζικαλ",          slug: "mousikal" },
  { category: "movies",  name: "Αθλητική",           slug: "athlitiki-movies" },
  { category: "series",  name: "Δράση",              slug: "drasi" },
  { category: "series",  name: "Αθλητική",           slug: "athlitiki-series" },
  { category: "books",   name: "Γουέστερν",          slug: "goyesterk" },
  { category: "books",   name: "Κόμικς",             slug: "komiks" },
  { category: "books",   name: "Θρησκεία",           slug: "thriskeia" },
  { category: "books",   name: "Πολιτική",           slug: "politiki" },
  { category: "books",   name: "Θέατρο",             slug: "theatro-books" },
  { category: "food",    name: "Λατινοαμερικάνικη",  slug: "latinoamerikaniki" },
  { category: "food",    name: "Διεθνής",            slug: "diethnis" },
  { category: "events",  name: "Ομιλία",             slug: "omilia" },
];

// ─── STRICT MAPPINGS ──────────────────────────────────────────────────────
// Only includes mappings where the match is semantically correct.
// Tags NOT in these maps result in NULL (item gets no subcategory).

const MOVIE_MAP = {
  "δράμα": "Δράμα",
  "κοινωνική": "Δράμα",
  "κωμωδία": "Κωμωδία",
  "δραματική κομεντί": "Κωμωδία",
  "κομεντί": "Κωμωδία",
  "θρίλερ": "Θρίλερ",
  "μυστηρίου": "Θρίλερ",
  "ψυχολογικό θρίλερ": "Θρίλερ",
  "αστυνομική": "Θρίλερ",
  "έγκλημα": "Θρίλερ",
  "φιλμ νουάρ": "Θρίλερ",
  "δράση": "Δράση",
  "περιπέτεια": "Δράση",
  "σούπερ ήρωα": "Δράση",
  "πολεμική": "Δράση",
  "επιστημονικής φαντασίας": "Sci-Fi",
  "φαντασίας": "Sci-Fi",
  "ρομαντική": "Ρομαντική",
  "κινούμενα σχέδια": "Animation",
  "οικογενειακή": "Animation",
  "τρόμου": "Horror",
  "βιογραφία": "Βιογραφική",
  "ιστορική": "Βιογραφική",
  "μιούζικαλ": "Μιούζικαλ",  // NEW subcategory
  "αθλητική": "Αθλητική",     // NEW subcategory
  "σινεφίλ": "Δράμα",         // soft merge — all examples are art-house dramas
};

const SERIES_MAP = {
  "δράμα": "Δράμα",
  "κοινωνική": "Δράμα",
  "ιστορική": "Δράμα",
  "βιογραφία": "Δράμα",
  "κωμωδία": "Κωμωδία",
  "έγκλημα": "Crime",
  "μυστηρίου": "Crime",
  "αστυνομική": "Crime",
  "επιστημονικής φαντασίας": "Sci-Fi",
  "φαντασίας": "Sci-Fi",
  "θρίλερ": "Θρίλερ",
  "τρόμου": "Θρίλερ",
  "ρομαντική": "Ρομαντική",
  "κινουμένων σχεδίων": "Animation",
  "δράση": "Δράση",            // NEW subcategory for series
  "περιπέτεια": "Δράση",
  "αθλητισμός": "Αθλητική",    // NEW subcategory
  "reality": "Ντοκιμαντέρ",    // reality TV is documentary-adjacent
};

const BOOK_MAP = {
  "αστυνομική λογοτεχνία": "Θρίλερ",
  "λογοτεχνία του φανταστικού": "Sci-Fi",
  "ιστορικό μυθιστόρημα": "Ιστορία",
  "ιστορία": "Ιστορία",
  "ψυχολογία": "Ψυχολογία",
  "γονείς και παιδιά": "Ψυχολογία",
  "αυτοβιογραφία": "Αυτοβιογραφία",
  "βιογραφία": "Αυτοβιογραφία",
  "ποίηση": "Ποίηση",
  "φιλοσοφία": "Φιλοσοφία",
  "δοκίμιο": "Φιλοσοφία",
  "οικονομικά": "Business",
  "management": "Business",
  "για παιδιά": "Παιδικά",
  "παιδική λογοτεχνία": "Παιδικά",
  "παραμύθι": "Παιδικά",
  "νεανική λογοτεχνία": "Παιδικά",
  "υγεία": "Self-help",
  "μεταφρασμένη λογοτεχνία": "Μυθιστόρημα",
  "ελληνική λογοτεχνία": "Μυθιστόρημα",
  "κλασική λογοτεχνία": "Μυθιστόρημα",
  "νουβέλα": "Μυθιστόρημα",
  "διήγημα": "Μυθιστόρημα",
  "γουέστερν": "Γουέστερν",   // NEW subcategory
  "κόμικς": "Κόμικς",         // NEW subcategory
  "θρησκεία": "Θρησκεία",     // NEW subcategory
  "πολιτική": "Πολιτική",     // NEW subcategory
  "θέατρο": "Θέατρο",         // NEW subcategory
  // REMOVED (no good subcategory — items get NULL, admin reviews):
  //   μαγειρική, μηχανική - μηχανολογία, σπορ, μαθηματικά,
  //   αρχιτεκτονική, κοινωνικές επιστήμες
};

const RECIPE_MAP = {
  "γλυκά": "Γλυκά",
  "αρτοσκευάσματα": "Ψωμί & Ζύμες",
  "πίτες": "Ψωμί & Ζύμες",
  "σνακ": "Ορεκτικά",
  "ορεκτικά": "Ορεκτικά",
  "σάλτσες": "Ορεκτικά",
  "ζυμαρικά": "Κυρίως Πιάτο",
  "ριζότο": "Κυρίως Πιάτο",
  "θαλασσινά": "Κυρίως Πιάτο",
  "όσπρια": "Κυρίως Πιάτο",
  "σούπες": "Σούπες",
  "κρεατικά": "Ψητά",
  "πουλερικά": "Ψητά",
  "λαχανικά": "Σαλάτες",
  "σαλάτες": "Σαλάτες",
  "χωρίς ζάχαρη": "Επιδόρπια",
  "ποτά": "Επιδόρπια",     // sangria/liqueurs fit dessert/sweet category
  // REMOVED: συνταγές → Κυρίως Πιάτο (too generic)
};

const FOOD_MAP = {
  "ελληνική": "Ελληνική",
  "ελληνική - δημιουργική": "Ελληνική",
  "κρητική": "Ελληνική",
  "μικρασιατική": "Ελληνική",
  "μεσογειακή": "Ελληνική",
  "ιταλική": "Ιταλική",
  "ασιατική - πολυνησιακή": "Ασιατική",
  "ταϊλανδέζικη": "Ασιατική",
  "ινδική": "Ασιατική",
  "ιαπωνική": "Sushi",
  "american style - burgers": "Burger",
  "vegan": "Vegan",
  "τούρκικη": "Middle Eastern",
  "μεξικάνικη": "Λατινοαμερικάνικη",      // NEW subcategory
  "βραζιλιάνικη": "Λατινοαμερικάνικη",
  "ισπανική": "Λατινοαμερικάνικη",         // Spanish-speaking world
  "διεθνής": "Διεθνής",                    // NEW subcategory
  // REMOVED (no clean match — admin reviews):
  //   ρωσική - ουκρανική (1 item, too few)
};

const BAR_MAP = {
  "cocktail bar": "Cocktail Bar",
  "all day cocktail bar restaurant": "Cocktail Bar",
  "cocktail roof bar": "Cocktail Bar",
  "casual bar": "Cocktail Bar",
  "art bar": "Cocktail Bar",
  "tapas bar": "Cocktail Bar",
  "bar": "Cocktail Bar",
  "wine bar": "Wine Bar",
  "cafe - wine bar": "Wine Bar",
  "wine bar restaurant": "Wine Bar",
  "beach bar": "Beach Bar",
  "seaside cafe bar": "Beach Bar",
  "beach & resto bar": "Beach Bar",
  "pub": "Pub",
  "παμπ": "Pub",
  "μπιραρία": "Pub",
  "καφέ - μπιραρία": "Pub",
  "whiskey bar": "Pub",
  "all day cafe bar": "All-Day",
  "all day cafe": "All-Day",
  "all day bar": "All-Day",
  "all day cafe restaurant": "All-Day",
  "all day bar restaurant": "All-Day",
  "all day cafe bar restaurant": "All-Day",
  "all day lounge": "All-Day",
  "all day cafe restaurant bar": "All-Day",
  "all-day cafe bar": "All-Day",
  "bar restaurant": "All-Day",
  "cafe bar": "Coffee",
  "καφετέρια": "Coffee",
  "καφέ": "Coffee",
  "cafe": "Coffee",
  "cafe restaraunt": "Coffee",
  "cafe-bar restaurant": "Coffee",
  "cafe bar restaurant": "Coffee",
  "καφεπωλείο - βιβλιοπωλείο": "Coffee",
  "παραδοσιακό καφενείο": "Coffee",
  "καφέ - brunch": "Coffee",
  "bistrot": "Coffee",
  "τεϊοποτείο": "Coffee",
  "bakery": "Coffee",
  "γλυκοπωλείο": "Coffee",
  "ζαχαροπλαστείο": "Coffee",
  "εργαστήριο ζαχαροπλαστικής": "Coffee",
  // REMOVED (wrong — these aren't bars at all!):
  //   παιδότοπος, παιδικό πάρκο, ακαδημία ποδοσφαίρου, θεματικό πάρκο,
  //   κέντρο ψυχαγωγίας, κέντρο πολιτισμού, ιππασία/ζωολογικός κήπος,
  //   παγωτό - βάφλα/κρέπα, λουκουμάδες, tailor-made προφιτερόλ,
  //   street food - βάφλα, θερινός κινηματογράφος, μουσική σκηνή,
  //   ζωντανή μουσική, club, καφετέρια σοκολάτας, καφετέρια - παιδότοπος,
  //   πιατάδικο, καφέ - ουζερί, πολυχώρος (κάβα/delicatessen)
};

const HOTEL_MAP = {
  "ξενοδοχείο": "Ξενοδοχείο",
  "ξενοδοχείο με πάρκα νερού": "Ξενοδοχείο",
  "ενοικιαζόμενα δωμάτια": "Δωμάτιο",
  "δωμάτια - studio": "Δωμάτιο",
  "σουίτες και στούντιο": "Δωμάτιο",
  "σουίτες": "Δωμάτιο",
  "ξενώνας": "Δωμάτιο",
  "βίλες": "Μονοκατοικία",
  "βίλα": "Μονοκατοικία",
  "εξοχική κατοικία": "Μονοκατοικία",
  "κατοικία": "Μονοκατοικία",
  "παραδοσιακές κατοικίες": "Μονοκατοικία",
  "διαμερίσματα": "Διαμέρισμα",
};

const THEATER_MAP = {
  "κωμωδία": "Θέατρο",
  "δράμα": "Θέατρο",
  "κοινωνικό": "Θέατρο",
  "μαύρη κωμωδία": "Θέατρο",
  "ψυχολογικό θρίλερ": "Θέατρο",
  "παραβολή": "Θέατρο",
  "μιούζικαλ": "Μιούζικαλ",
  "κουκλοθεατρικό μιούζικαλ": "Μιούζικαλ",
  "μουσική παράσταση": "Μιούζικαλ",
  "μουσικός μονόλογος": "Μονόπρακτο",
  "παιδική παράσταση": "Παιδικό",
};

const EVENT_MAP = {
  "συναυλία": "Συναυλία",
  "rock festival": "Festival",
  "καλλιτεχνικό φεστιβάλ": "Festival",
  "φεστιβάλ κρασιού": "Festival",
  "φεστιβάλ βιβλίου": "Festival",
  "φεστιβάλ κόμικ": "Festival",
  "φεστιβάλ animation": "Festival",
  "φεστιβάλ σοκολάτας": "Festival",
  "φεστιβάλ ταινιών μικρού μήκους": "Festival",
  "φεστιβάλ κινηματογράφου": "Festival",
  "διεθνές φεστιβάλ λόγου και τέχνης": "Festival",
  "χριστουγεννιάτικες εκδηλώσεις": "Festival",
  "καρναβάλι": "Festival",
  "εικαστικά": "Έκθεση",
  "έκθεση κρασιού": "Έκθεση",
  "έκθεση ενδυμασιών και στολών": "Έκθεση",
  "αγώνας δρόμου": "Sports",
  "διασκεδαστικός αγώνας 5km": "Sports",
  "ημιορεινός ημιμαραθώνιος": "Sports",
  "ορεινός αγώνας δρόμου 13km": "Sports",
  "παρουσίαση βιβλίου": "Ομιλία",          // NEW subcategory
  "παρουσίαση συγγραφέα": "Ομιλία",
  "βραδιά γνωριμίας με αστυνομική λογοτεχνία": "Ομιλία",
  "ψυχοεκπαιδευτικό βιωματικό webinar": "Workshop", // legitimate workshop
  "γαστρονομία": "Workshop",                // gastronomy events = workshops
  // REMOVED: magic show → Stand-up (magic ≠ comedy)
};

// ─── Helper Functions ────────────────────────────────────────────────────

async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || "GET"} ${path}: ${res.status} ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function resolveByTags(tags, map) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  for (const tag of tags) {
    const mapped = map[tag.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return null;
}

function resolveBookSubcategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  // Priority: specific genres first, generic literature tags last
  const priority = [
    "γουέστερν", "κόμικς", "θρησκεία", "πολιτική", "θέατρο", // NEW specific genres first
    "αστυνομική λογοτεχνία", "λογοτεχνία του φανταστικού", "ιστορικό μυθιστόρημα",
    "ψυχολογία", "γονείς και παιδιά", "αυτοβιογραφία", "βιογραφία",
    "ποίηση", "φιλοσοφία", "δοκίμιο", "οικονομικά", "management",
    "για παιδιά", "παιδική λογοτεχνία", "παραμύθι", "νεανική λογοτεχνία",
    "υγεία",
    "μεταφρασμένη λογοτεχνία", "ελληνική λογοτεχνία", "κλασική λογοτεχνία",
    "νουβέλα", "διήγημα",
  ];
  const lowerTags = tags.map(t => t.toLowerCase().trim());
  for (const p of priority) {
    if (lowerTags.includes(p) && BOOK_MAP[p]) return BOOK_MAP[p];
  }
  for (const t of lowerTags) {
    if (BOOK_MAP[t]) return BOOK_MAP[t];
  }
  return null;
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Subcategory FIX Script (strict mapping) ===`);
  console.log(`Mode: ${APPLY ? "APPLY (will update database)" : "DRY RUN (no changes)"}\n`);

  // 0. Seed any missing new subcategories
  console.log("Checking for missing subcategories...");
  let subcats = await supabaseRequest("subcategories?select=id,category,name,slug&limit=1000");
  const existingKeys = new Set(subcats.map(s => `${s.category}:${s.name}`));
  const toAdd = NEW_SUBCATEGORIES.filter(n => !existingKeys.has(`${n.category}:${n.name}`));

  if (toAdd.length > 0) {
    if (APPLY) {
      // Compute display_order: append to end of existing for that category
      const orderByCategory = {};
      subcats.forEach(s => {
        orderByCategory[s.category] = Math.max(orderByCategory[s.category] || 0, 1);
      });
      const rows = toAdd.map(n => ({
        category: n.category,
        name: n.name,
        slug: n.slug,
        display_order: 100, // will be sorted at end
        is_published: true,
      }));
      console.log(`  Adding ${toAdd.length} new subcategories: ${toAdd.map(n => n.category + ':' + n.name).join(', ')}`);
      await supabaseRequest("subcategories", {
        method: "POST",
        body: JSON.stringify(rows),
      });
      // Re-fetch
      subcats = await supabaseRequest("subcategories?select=id,category,name,slug&limit=1000");
    } else {
      console.log(`  WOULD add ${toAdd.length} new subcategories: ${toAdd.map(n => n.category + ':' + n.name).join(', ')}`);
    }
  } else {
    console.log("  All needed subcategories exist.");
  }

  // 1. Build lookup
  const subcatLookup = {};
  for (const s of subcats) subcatLookup[`${s.category}:${s.name}`] = s.id;
  // For dry-run preview: include new subcategories with placeholder IDs so we
  // can see what WOULD be assigned even before they're seeded
  if (!APPLY) {
    for (const n of toAdd) {
      subcatLookup[`${n.category}:${n.name}`] = `(new:${n.name})`;
    }
  }
  console.log(`Loaded ${subcats.length} subcategories${!APPLY && toAdd.length ? ` (+${toAdd.length} virtual for preview)` : ""}\n`);

  // 2. Fetch all items
  console.log("Fetching items...");
  let allItems = [];
  let offset = 0;
  while (true) {
    const batch = await supabaseRequest(
      `items?select=id,title,category,subcategory_id,metadata&order=id&offset=${offset}&limit=1000`
    );
    allItems = allItems.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  console.log(`Fetched ${allItems.length} items`);

  // 3. Fetch extension tables
  console.log("Fetching extension tables...");
  const [foodExt, barsExt, hotelsExt, theaterExt, eventsExt] = await Promise.all([
    supabaseRequest("item_food?select=item_id,cuisine&limit=2000"),
    supabaseRequest("item_bars?select=item_id,type&limit=2000"),
    supabaseRequest("item_hotels?select=item_id,type&limit=2000"),
    supabaseRequest("item_theater?select=item_id,type&limit=2000"),
    supabaseRequest("item_events?select=item_id,event_type&limit=2000"),
  ]);
  const foodMap = Object.fromEntries(foodExt.map(r => [r.item_id, r.cuisine]));
  const barsMap = Object.fromEntries(barsExt.map(r => [r.item_id, r.type]));
  const hotelsMap = Object.fromEntries(hotelsExt.map(r => [r.item_id, r.type]));
  const theaterMap = Object.fromEntries(theaterExt.map(r => [r.item_id, r.type]));
  const eventsMap = Object.fromEntries(eventsExt.map(r => [r.item_id, r.event_type]));

  // 4. Resolve each item
  console.log("\nResolving subcategories with strict rules...\n");

  const stats = {};
  const changes = []; // { item, oldId, newId }
  const losingSubcat = {}; // category → [{title, originalTag}]

  for (const item of allItems) {
    const cat = item.category;
    if (!stats[cat]) stats[cat] = { total: 0, kept: 0, willNull: 0, newAssign: 0, unchanged: 0 };
    stats[cat].total++;

    const tags = item.metadata?.tags || [];
    let newName = null;
    let originalSignal = null;

    switch (cat) {
      case "movies":
        newName = resolveByTags(tags, MOVIE_MAP);
        originalSignal = tags.join(", ");
        break;
      case "series":
        newName = resolveByTags(tags, SERIES_MAP);
        originalSignal = tags.join(", ");
        break;
      case "books":
        newName = resolveBookSubcategory(tags);
        originalSignal = tags.join(", ");
        break;
      case "recipes":
        newName = resolveByTags(tags, RECIPE_MAP);
        originalSignal = tags.join(", ");
        break;
      case "food": {
        const c = foodMap[item.id];
        if (c) {
          newName = FOOD_MAP[c.toLowerCase().trim()] || null;
          originalSignal = c;
        }
        break;
      }
      case "bars": {
        const t = barsMap[item.id];
        if (t) {
          newName = BAR_MAP[t.toLowerCase().trim()] || null;
          originalSignal = t;
        }
        break;
      }
      case "hotels": {
        const t = hotelsMap[item.id];
        if (t) {
          newName = HOTEL_MAP[t.toLowerCase().trim()] || null;
          originalSignal = t;
        }
        break;
      }
      case "theater": {
        const t = theaterMap[item.id];
        if (t) {
          newName = THEATER_MAP[t.toLowerCase().trim()] || null;
          originalSignal = t;
        }
        break;
      }
      case "events": {
        const t = eventsMap[item.id];
        if (t) {
          newName = EVENT_MAP[t.toLowerCase().trim()] || null;
          originalSignal = t;
        }
        break;
      }
    }

    const newId = newName ? subcatLookup[`${cat}:${newName}`] || null : null;
    const oldId = item.subcategory_id;

    if (newId === oldId) {
      stats[cat].unchanged++;
      if (newId) stats[cat].kept++;
    } else {
      changes.push({ item, oldId, newId, originalSignal, newName });
      if (newId === null) {
        stats[cat].willNull++;
        if (!losingSubcat[cat]) losingSubcat[cat] = [];
        losingSubcat[cat].push({ title: item.title, signal: originalSignal });
      } else {
        stats[cat].newAssign++;
      }
    }
  }

  // 5. Report
  console.log("=== Stats per category ===");
  for (const [cat, s] of Object.entries(stats)) {
    console.log(`  ${cat}: total=${s.total}, will null=${s.willNull}, will reassign=${s.newAssign}, unchanged=${s.unchanged}`);
  }

  // 6. Show items losing subcategory (sample)
  console.log("\n=== Items losing subcategory (sample of 10 per category) ===");
  for (const [cat, list] of Object.entries(losingSubcat)) {
    console.log(`\n  ${cat} (${list.length} items):`);
    list.slice(0, 10).forEach(x => {
      console.log(`    - "${x.title}" (was tagged: ${x.signal || "—"})`);
    });
    if (list.length > 10) console.log(`    ... and ${list.length - 10} more`);
  }

  console.log(`\nTotal changes: ${changes.length}`);

  if (!APPLY) {
    console.log("\nDRY RUN — no changes made. Re-run with --apply to commit.");
    return;
  }

  // 7. Apply changes
  console.log(`\nApplying ${changes.length} updates...`);
  let applied = 0;
  let errors = 0;
  const BATCH_SIZE = 20;

  for (let i = 0; i < changes.length; i += BATCH_SIZE) {
    const batch = changes.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ item, newId }) =>
        supabaseRequest(`items?id=eq.${item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ subcategory_id: newId }),
          prefer: "return=minimal",
        })
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") applied++;
      else { errors++; console.error(`  Error: ${r.reason.message}`); }
    }
    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= changes.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, changes.length)}/${changes.length}`);
    }
  }

  console.log(`\n=== DONE === Applied: ${applied}, Errors: ${errors}`);
}

main().catch(console.error);
