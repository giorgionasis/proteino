/**
 * Subcategory Assignment Script
 *
 * Steps:
 * 1. Create subcategories table in Supabase (if not exists)
 * 2. Seed canonical subcategory rows
 * 3. Map each item to its subcategory based on existing data
 * 4. UPDATE items.subcategory_id for all 1,953 items
 *
 * Run: node scripts/assign-subcategories.js
 */

const SUPABASE_URL = "https://qwrryuyukoiqccxwauuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cnJ5dXl1a29pcWNjeHdhdXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0NDM2MywiZXhwIjoyMDkzMDIwMzYzfQ.olZv-lhhEvPDH-UrFoL1XvmOl-fy-0sYLuqEBQ23Cnk";

// ─── Canonical Subcategories ─────────────────────────────────────────────
const SUBCATEGORIES = {
  movies:  ["Δράμα", "Κωμωδία", "Θρίλερ", "Δράση", "Sci-Fi", "Ρομαντική", "Animation", "Ντοκιμαντέρ", "Horror", "Βιογραφική"],
  series:  ["Δράμα", "Κωμωδία", "Crime", "Sci-Fi", "Θρίλερ", "Ρομαντική", "Ντοκιμαντέρ", "Mini-series", "Animation"],
  books:   ["Μυθιστόρημα", "Θρίλερ", "Sci-Fi", "Ιστορία", "Αυτοβιογραφία", "Ψυχολογία", "Φιλοσοφία", "Self-help", "Ποίηση", "Business", "Παιδικά"],
  recipes: ["Κυρίως Πιάτο", "Ορεκτικά", "Επιδόρπια", "Breakfast", "Ψητά", "Σαλάτες", "Σούπες", "Γλυκά", "Ψωμί & Ζύμες"],
  food:    ["Ελληνική", "Ιταλική", "Ασιατική", "Burger", "Sushi", "Fine Dining", "Brunch", "Vegan", "Seafood", "Street Food", "Middle Eastern"],
  bars:    ["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee", "Speakeasy", "Pub", "All-Day", "Sports Bar"],
  hotels:  ["Ξενοδοχείο", "Διαμέρισμα", "Δωμάτιο", "Camping", "Μονοκατοικία"],
  theater: ["Θέατρο", "Μιούζικαλ", "Stand-up", "Μονόπρακτο", "Παιδικό"],
  events:  ["Συναυλία", "Festival", "Έκθεση", "Stand-up", "Workshop", "Sports"],
};

// ─── Consolidation Mappings ──────────────────────────────────────────────
// Maps old tag/genre/type values → canonical subcategory name
// Multi-tag items: use FIRST matching tag (priority order in the map)

const MOVIE_MAP = {
  "δράμα": "Δράμα",
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
  "αθλητική": "Ντοκιμαντέρ",
  "σινεφίλ": "Δράμα",
  "κοινωνική": "Δράμα",
  "μιούζικαλ": "Κωμωδία",
};

const SERIES_MAP = {
  "δράμα": "Δράμα",
  "κωμωδία": "Κωμωδία",
  "έγκλημα": "Crime",
  "μυστηρίου": "Crime",
  "αστυνομική": "Crime",
  "επιστημονικής φαντασίας": "Sci-Fi",
  "φαντασίας": "Sci-Fi",
  "θρίλερ": "Θρίλερ",
  "ρομαντική": "Ρομαντική",
  "κινουμένων σχεδίων": "Animation",
  "τρόμου": "Θρίλερ",
  "δράση": "Θρίλερ",
  "περιπέτεια": "Θρίλερ",
  "ιστορική": "Δράμα",
  "βιογραφία": "Δράμα",
  "αθλητισμός": "Ντοκιμαντέρ",
  "reality": "Ντοκιμαντέρ",
  "κοινωνική": "Δράμα",
  "τηλεοπτικές σειρές": null, // generic tag, skip
};

const BOOK_MAP = {
  "αστυνομική λογοτεχνία": "Θρίλερ",
  "μεταφρασμένη λογοτεχνία": "Μυθιστόρημα",
  "ελληνική λογοτεχνία": "Μυθιστόρημα",
  "κλασική λογοτεχνία": "Μυθιστόρημα",
  "νεανική λογοτεχνία": "Μυθιστόρημα",
  "λογοτεχνία του φανταστικού": "Sci-Fi",
  "ιστορικό μυθιστόρημα": "Ιστορία",
  "ιστορία": "Ιστορία",
  "ψυχολογία": "Ψυχολογία",
  "αυτοβιογραφία": "Αυτοβιογραφία",
  "βιογραφία": "Αυτοβιογραφία",
  "ποίηση": "Ποίηση",
  "φιλοσοφία": "Φιλοσοφία",
  "δοκίμιο": "Φιλοσοφία",
  "οικονομικά": "Business",
  "management": "Business",
  "πολιτική": "Business",
  "για παιδιά": "Παιδικά",
  "παιδική λογοτεχνία": "Παιδικά",
  "παραμύθι": "Παιδικά",
  "γονείς και παιδιά": "Ψυχολογία",
  "υγεία": "Self-help",
  "κοινωνικές επιστήμες": "Φιλοσοφία",
  "νουβέλα": "Μυθιστόρημα",
  "διήγημα": "Μυθιστόρημα",
  "γουέστερν": "Μυθιστόρημα",
  "θέατρο": "Μυθιστόρημα",
  "μαγειρική": "Self-help",
  "κόμικς": "Παιδικά",
  "θρησκεία": "Φιλοσοφία",
  "μηχανική - μηχανολογία": "Business",
  "σπορ": "Self-help",
  "μαθηματικά": "Business",
  "αρχιτεκτονική": "Business",
};

const RECIPE_MAP = {
  "γλυκά": "Γλυκά",
  "αρτοσκευάσματα": "Ψωμί & Ζύμες",
  "σνακ": "Ορεκτικά",
  "ζυμαρικά": "Κυρίως Πιάτο",
  "σούπες": "Σούπες",
  "πίτες": "Ψωμί & Ζύμες",
  "κρεατικά": "Ψητά",
  "πουλερικά": "Ψητά",
  "θαλασσινά": "Κυρίως Πιάτο",
  "όσπρια": "Κυρίως Πιάτο",
  "ποτά": "Breakfast",
  "σάλτσες": "Ορεκτικά",
  "λαχανικά": "Σαλάτες",
  "ριζότο": "Κυρίως Πιάτο",
  "σαλάτες": "Σαλάτες",
  "ορεκτικά": "Ορεκτικά",
  "χωρίς ζάχαρη": "Επιδόρπια",
  "συνταγές": null, // generic tag, skip
};

const FOOD_MAP = {
  // cuisine → subcategory
  "ελληνική": "Ελληνική",
  "ελληνική - δημιουργική": "Ελληνική",
  "κρητική": "Ελληνική",
  "μικρασιατική": "Ελληνική",
  "μεσογειακή": "Ελληνική",
  "ιταλική": "Ιταλική",
  "ισπανική": "Ιταλική", // Mediterranean neighbor
  "ασιατική - πολυνησιακή": "Ασιατική",
  "ιαπωνική": "Sushi",
  "ταϊλανδέζικη": "Ασιατική",
  "ινδική": "Ασιατική",
  "american style - burgers": "Burger",
  "μεξικάνικη": "Street Food",
  "βραζιλιάνικη": "Street Food",
  "τούρκικη": "Middle Eastern",
  "ρωσική - ουκρανική": "Ελληνική", // closest fit for Greek audience
  "διεθνής": "Fine Dining",
  "vegan": "Vegan",
  "33": null, // bad data
};

const BAR_MAP = {
  // type → subcategory
  "cocktail bar": "Cocktail Bar",
  "all day cocktail bar restaurant": "Cocktail Bar",
  "cocktail roof bar": "Cocktail Bar",
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
  "cafe bar": "Coffee",
  "καφετέρια": "Coffee",
  "καφέ": "Coffee",
  "καφεπωλείο - βιβλιοπωλείο": "Coffee",
  "cafe": "Coffee",
  "cafe restaraunt": "Coffee",
  "cafe-bar restaurant": "Coffee",
  "cafe bar restaurant": "Coffee",
  "bar restaurant": "All-Day",
  "bar": "Cocktail Bar",
  "casual bar": "Cocktail Bar",
  "art bar": "Cocktail Bar",
  "tapas bar": "Cocktail Bar",
  "γλυκοπωλείο": "Coffee",
  "ζαχαροπλαστείο": "Coffee",
  "εργαστήριο ζαχαροπλαστικής": "Coffee",
  "παγωτό - βάφλα": "Coffee",
  "παγωτό - βάφλα - κρέπα": "Coffee",
  "tailor-made προφιτερόλ": "Coffee",
  "λουκουμάδες": "Coffee",
  "bakery": "Coffee",
  "καφέ - brunch": "Coffee",
  "bistrot": "Coffee",
  "τεϊοποτείο": "Coffee",
  "παραδοσιακό καφενείο": "Coffee",
  "street food - βάφλα": "Coffee",
  "θερινός κινηματογράφος": "All-Day",
  "μουσική σκηνή": "Cocktail Bar",
  "ζωντανή μουσική": "Cocktail Bar",
  "club": "Cocktail Bar",
  "καφετέρια σοκολάτας- μπιραρία": "Coffee",
  "καφετέρια - παιδότοπος": "Coffee",
  "παιδότοπος": "Coffee",
  "παιδικό πάρκο": "Coffee",
  "ιππασία, καφέ, ζωολογικός κήπος, go kart, παιδότοπος": "Coffee",
  "θεματικό πάρκο": "All-Day",
  "ακαδημία ποδοσφαίρου": "Sports Bar",
  "κέντρο ψυχαγωγίας, escape room": "All-Day",
  "κέντρο πολιτισμού": "All-Day",
  "πολυχώρος (κάβα, delicatessen, coffee & pastry shop)": "Wine Bar",
  "πιατάδικο": "All-Day",
  "καφέ - ουζερί": "All-Day",
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
  "bbbb": null, // bad data
};

const THEATER_MAP = {
  "κωμωδία": "Θέατρο",
  "δράμα": "Θέατρο",
  "κοινωνικό": "Θέατρο",
  "μαύρη κωμωδία": "Θέατρο",
  "ψυχολογικό θρίλερ": "Θέατρο",
  "παραβολή": "Θέατρο",
  "μουσικός μονόλογος": "Μονόπρακτο",
  "μιούζικαλ": "Μιούζικαλ",
  "κουκλοθεατρικό μιούζικαλ": "Μιούζικαλ",
  "μουσική παράσταση": "Μιούζικαλ",
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
  "εικαστικά": "Έκθεση",
  "έκθεση κρασιού": "Έκθεση",
  "έκθεση ενδυμασιών και στολών": "Έκθεση",
  "παρουσίαση βιβλίου": "Workshop",
  "παρουσίαση συγγραφέα": "Workshop",
  "βραδιά γνωριμίας με αστυνομική λογοτεχνία": "Workshop",
  "ψυχοεκπαιδευτικό βιωματικό webinar": "Workshop",
  "γαστρονομία": "Workshop",
  "magic show": "Stand-up",
  "χριστουγεννιάτικες εκδηλώσεις": "Festival",
  "καρναβάλι": "Festival",
  "αγώνας δρόμου": "Sports",
  "διασκεδαστικός αγώνας 5km": "Sports",
  "ημιορεινός ημιμαραθώνιος": "Sports",
  "ορεινός αγώνας δρόμου 13km": "Sports",
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

function slugify(text) {
  const map = {
    "α":"a","β":"v","γ":"g","δ":"d","ε":"e","ζ":"z","η":"i","θ":"th",
    "ι":"i","κ":"k","λ":"l","μ":"m","ν":"n","ξ":"x","ο":"o","π":"p",
    "ρ":"r","σ":"s","ς":"s","τ":"t","υ":"y","φ":"f","χ":"ch","ψ":"ps","ω":"o",
    "ά":"a","έ":"e","ή":"i","ί":"i","ό":"o","ύ":"y","ώ":"o","ϊ":"i","ϋ":"y",
    "ΐ":"i","ΰ":"y",
  };
  return text
    .toLowerCase()
    .split("")
    .map(c => map[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolveMovieSubcategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  // Skip generic "τηλεοπτικές σειρές" and similar non-genre tags
  for (const tag of tags) {
    const mapped = MOVIE_MAP[tag.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return null;
}

function resolveSeriesSubcategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  for (const tag of tags) {
    const mapped = SERIES_MAP[tag.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return null;
}

function resolveBookSubcategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  // Priority: specific genres first, then fallback to generic literature tags
  const priority = ["αστυνομική λογοτεχνία", "λογοτεχνία του φανταστικού",
    "ιστορικό μυθιστόρημα", "ψυχολογία", "αυτοβιογραφία", "βιογραφία",
    "ποίηση", "φιλοσοφία", "δοκίμιο", "οικονομικά", "management",
    "για παιδιά", "παιδική λογοτεχνία", "παραμύθι",
    "μεταφρασμένη λογοτεχνία", "ελληνική λογοτεχνία", "κλασική λογοτεχνία"];

  const lowerTags = tags.map(t => t.toLowerCase().trim());
  for (const p of priority) {
    if (lowerTags.includes(p)) {
      const mapped = BOOK_MAP[p];
      if (mapped) return mapped;
    }
  }
  // Fallback: try any tag
  for (const tag of lowerTags) {
    const mapped = BOOK_MAP[tag];
    if (mapped) return mapped;
  }
  return null;
}

function resolveRecipeSubcategory(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  for (const tag of tags) {
    const mapped = RECIPE_MAP[tag.toLowerCase().trim()];
    if (mapped) return mapped;
  }
  return "Κυρίως Πιάτο"; // default for recipes with only "συνταγές" tag
}

// ─── Main Execution ──────────────────────────────────────────────────────

async function main() {
  console.log("=== Subcategory Assignment Script ===\n");

  // Step 1: Create subcategories table (via SQL - needs to be done manually or via migration)
  console.log("Step 1: Seeding subcategories table...");

  // First check if subcategories table exists and has data
  let existing;
  try {
    existing = await supabaseRequest("subcategories?select=id,category,name&limit=1000");
    console.log(`  Found ${existing.length} existing subcategories`);
  } catch (e) {
    console.error("  ERROR: subcategories table doesn't exist yet!");
    console.log("  Please create the table first with this SQL:\n");
    console.log(`
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description_seo text,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, slug)
);

-- Add subcategory_id to items
ALTER TABLE items ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES subcategories(id);
CREATE INDEX IF NOT EXISTS idx_items_subcategory ON items(subcategory_id);
`);
    return;
  }

  // Step 2: Seed subcategories if empty
  if (existing.length === 0) {
    console.log("  Seeding canonical subcategories...");
    const rows = [];
    for (const [category, names] of Object.entries(SUBCATEGORIES)) {
      names.forEach((name, i) => {
        rows.push({
          category,
          name,
          slug: slugify(name),
          display_order: i,
          is_published: true,
        });
      });
    }

    // Insert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      await supabaseRequest("subcategories", {
        method: "POST",
        body: JSON.stringify(batch),
      });
    }
    console.log(`  Seeded ${rows.length} subcategories`);

    // Re-fetch to get IDs
    existing = await supabaseRequest("subcategories?select=id,category,name&limit=1000");
  }

  // Build lookup: { "movies:Δράμα": "uuid-123" }
  const subcatLookup = {};
  for (const row of existing) {
    subcatLookup[`${row.category}:${row.name}`] = row.id;
  }
  console.log(`  Lookup built: ${Object.keys(subcatLookup).length} entries\n`);

  // Step 3: Fetch all items + extension data
  console.log("Step 2: Fetching items...");

  let allItems = [];
  let offset = 0;
  while (true) {
    const batch = await supabaseRequest(
      `items?select=id,category,metadata&order=id&offset=${offset}&limit=1000`
    );
    allItems = allItems.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  console.log(`  Fetched ${allItems.length} items\n`);

  // Fetch extension tables for food, bars, hotels, theater, events
  console.log("  Fetching extension tables...");
  const [foodExt, barsExt, hotelsExt, theaterExt, eventsExt] = await Promise.all([
    supabaseRequest("item_food?select=item_id,cuisine&limit=1000"),
    supabaseRequest("item_bars?select=item_id,type&limit=1000"),
    supabaseRequest("item_hotels?select=item_id,type&limit=1000"),
    supabaseRequest("item_theater?select=item_id,type&limit=1000"),
    supabaseRequest("item_events?select=item_id,event_type&limit=1000"),
  ]);

  const foodMap = Object.fromEntries(foodExt.map(r => [r.item_id, r.cuisine]));
  const barsMap = Object.fromEntries(barsExt.map(r => [r.item_id, r.type]));
  const hotelsMap = Object.fromEntries(hotelsExt.map(r => [r.item_id, r.type]));
  const theaterMap = Object.fromEntries(theaterExt.map(r => [r.item_id, r.type]));
  const eventsMap = Object.fromEntries(eventsExt.map(r => [r.item_id, r.event_type]));

  // Step 4: Resolve subcategory for each item
  console.log("Step 3: Resolving subcategories...");

  const updates = []; // { id, subcategory_id }
  const unresolved = { movies: 0, series: 0, books: 0, recipes: 0, food: 0, bars: 0, hotels: 0, theater: 0, events: 0 };
  const resolved = { movies: 0, series: 0, books: 0, recipes: 0, food: 0, bars: 0, hotels: 0, theater: 0, events: 0 };

  for (const item of allItems) {
    const tags = item.metadata?.tags || [];
    let subcatName = null;

    switch (item.category) {
      case "movies":
        subcatName = resolveMovieSubcategory(tags);
        break;
      case "series":
        subcatName = resolveSeriesSubcategory(tags);
        break;
      case "books":
        subcatName = resolveBookSubcategory(tags);
        break;
      case "recipes":
        subcatName = resolveRecipeSubcategory(tags);
        break;
      case "food": {
        const cuisine = foodMap[item.id];
        if (cuisine) {
          subcatName = FOOD_MAP[cuisine.toLowerCase().trim()];
        }
        break;
      }
      case "bars": {
        const type = barsMap[item.id];
        if (type) {
          subcatName = BAR_MAP[type.toLowerCase().trim()];
        }
        break;
      }
      case "hotels": {
        const type = hotelsMap[item.id];
        if (type) {
          subcatName = HOTEL_MAP[type.toLowerCase().trim()];
        }
        break;
      }
      case "theater": {
        const type = theaterMap[item.id];
        if (type) {
          subcatName = THEATER_MAP[type.toLowerCase().trim()];
        }
        break;
      }
      case "events": {
        const type = eventsMap[item.id];
        if (type) {
          subcatName = EVENT_MAP[type.toLowerCase().trim()];
        }
        break;
      }
    }

    if (subcatName) {
      const subcatId = subcatLookup[`${item.category}:${subcatName}`];
      if (subcatId) {
        updates.push({ id: item.id, subcategory_id: subcatId });
        resolved[item.category]++;
      } else {
        console.warn(`  WARNING: No subcategory ID for ${item.category}:${subcatName}`);
        unresolved[item.category]++;
      }
    } else {
      unresolved[item.category]++;
    }
  }

  console.log("\n  Resolution results:");
  for (const cat of Object.keys(resolved)) {
    const total = resolved[cat] + unresolved[cat];
    if (total > 0) {
      console.log(`    ${cat}: ${resolved[cat]}/${total} resolved (${unresolved[cat]} unresolved)`);
    }
  }

  // Step 5: Apply updates in batches
  console.log(`\nStep 4: Applying ${updates.length} updates...`);

  let applied = 0;
  let errors = 0;

  // Supabase REST doesn't support bulk update, so we use individual PATCH calls
  // but batch them with Promise.all (groups of 20 for rate limiting)
  const BATCH_SIZE = 20;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(({ id, subcategory_id }) =>
        supabaseRequest(`items?id=eq.${id}`, {
          method: "PATCH",
          body: JSON.stringify({ subcategory_id }),
          prefer: "return=minimal",
        })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") applied++;
      else { errors++; console.error(`  Error: ${r.reason.message}`); }
    }

    if ((i + BATCH_SIZE) % 200 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, updates.length)}/${updates.length}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Applied: ${applied}, Errors: ${errors}, Unresolved: ${allItems.length - updates.length}`);
}

main().catch(console.error);
