/**
 * Seeds extra_field_options table with all hardcoded option lists
 * extracted from components/admin/SuggestionEditor.tsx and similar.
 *
 * Run: node scripts/seed-extra-fields.js
 */

const SUPABASE_URL = "https://qwrryuyukoiqccxwauuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cnJ5dXl1a29pcWNjeHdhdXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0NDM2MywiZXhwIjoyMDkzMDIwMzYzfQ.olZv-lhhEvPDH-UrFoL1XvmOl-fy-0sYLuqEBQ23Cnk";

// ─── Option Catalogs ─────────────────────────────────────────────────────

const COUNTRIES = [
  "Αυστραλία","Αυστρία","Αίγυπτος","Αλβανία","Αργεντινή","Βέλγιο","Βουλγαρία","Βραζιλία",
  "Γαλλία","Γερμανία","Δανία","Ελβετία","Ελλάδα","ΗΠΑ","Ηνωμένο Βασίλειο","Ινδία","Ιαπωνία",
  "Ιρλανδία","Ισλανδία","Ισπανία","Ισραήλ","Ιταλία","Καναδάς","Κίνα","Κολομβία","Κορέα (Νότια)",
  "Κούβα","Κροατία","Κύπρος","Μαρόκο","Μεξικό","Νέα Ζηλανδία","Νορβηγία","Νότια Αφρική",
  "Ολλανδία","Ουγγαρία","Ουκρανία","Πολωνία","Πορτογαλία","Ρουμανία","Ρωσία","Σερβία",
  "Σκωτία","Σουηδία","Ταϊλάνδη","Τουρκία","Τσεχία","Φινλανδία","Χιλή",
];

const SEED = {
  movies: {
    country: COUNTRIES,
    award_oscar: ["Best Picture","Best Director","Best Actor","Best Actress","Best Supporting Actor","Best Supporting Actress","Best Screenplay","Best Cinematography","Best Score","Best Editing","Best Visual Effects","Best Animated Feature"],
    award_bafta: ["Best Film","Best Director","Best Leading Actor","Best Leading Actress","Best Supporting Actor","Best Supporting Actress","Best Screenplay"],
    award_golden_globe: ["Best Motion Picture – Drama","Best Motion Picture – Musical/Comedy","Best Director","Best Actor – Drama","Best Actress – Drama","Best Actor – Musical/Comedy","Best Actress – Musical/Comedy"],
    award_cannes: ["Palme d'Or","Grand Prix","Best Director","Jury Prize","Best Actor","Best Actress","Best Screenplay"],
    attributes: ["Based on true events","Based on a book","Remake","Sequel","Prequel","Contains violence","Contains sex","Classic","Independent film","Black & White","Foreign language","Animated"],
  },

  series: {
    country: COUNTRIES,
    streaming: ["Netflix","Disney+","Prime","YouTube","HBO","Apple TV+"],
    attributes: ["Contain UFO","Based on true events","Contain SEX","Series of one season","Contain Religion","Series is completed"],
  },

  books: {
    language: ["Ελληνικά","Αγγλικά","Γαλλικά","Γερμανικά","Ιταλικά","Ισπανικά"],
    publication: ["Διόπτρα","Πατάκη","Ψυχογιός","Καστανιώτη","Μεταίχμιο","Κέδρος","Εστία","Ίκαρος"],
  },

  food: {
    cuisine: ["Ελληνική","Ιταλική","Ασιατική","Burger","Sushi","Fine Dining","Brunch","Vegan","Seafood","Street Food","Middle Eastern","Λατινοαμερικάνικη","Διεθνής"],
    attributes: ["Parking","Wi-Fi","Outdoor Seating","Kid Friendly","Pet Friendly","Reservations","Takeaway","Delivery","Live Music","Accessible","Smoking Area","Credit Cards"],
    delivery_provider: ["efood","Wolt","Box"],
    source: ["Facebook","Instagram","Website","TripAdvisor"],
  },

  bars: {
    type: ["Cocktail Bar","Wine Bar","Jazz Bar","Rooftop","Beach Bar","Coffee","Speakeasy","Pub","All-Day","Sports Bar"],
    attributes: ["Parking","Wi-Fi","Outdoor Seating","Live Music","DJ","Pet Friendly","Reservations","Smoking Area","Accessible","Credit Cards","Happy Hour","Late Night"],
    source: ["Facebook","Instagram","Website"],
  },

  hotels: {
    type: ["Διαμέρισμα","Δωμάτιο","Camping","Μονοκατοικία","Ξενοδοχείο"],
    amenities_facilities: ["Pool","Bar","Restaurant","Parking","Breakfast","Spa","Gym"],
    amenities_room: ["Sea view","Mountain View","Wifi","Air Conditioning","TV","Mini Bar","Balcony"],
    amenities_extra: ["Pet Friendly","Disabilities","Transfer","24h Reception","Laundry"],
    availability_provider: ["Booking","Airbnb","Expedia"],
  },

  recipes: {
    unit: ["κ.γ.","κ.σ.","κούπα","κούπες","γρ.","κιλό","ml","lt","τεμ","φέτες","ματσάκι"],
    level: ["Easy","Medium","Hard"],
    nutrition: ["Vegan","Milk","Sugar","Gluten Free","Nut Free","Dairy Free","Egg Free"],
    common_ingredient: ["αλεύρι","ζάχαρη","βούτυρο","αυγά","γάλα","αλάτι","πιπέρι","ελαιόλαδο","κρεμμύδι","σκόρδο"],
  },

  theater: {
    availability: ["Υψηλή","Χαμηλή","Εξαντλημένα"],
  },

  events: {
    availability: ["Διαθέσιμο","Sold out","Pending"],
  },
};

async function req(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${path}: ${res.status} ${t}`);
  }
}

async function main() {
  console.log("=== Seeding extra_field_options ===\n");

  // Build all rows
  const rows = [];
  for (const [category, groups] of Object.entries(SEED)) {
    for (const [groupKey, values] of Object.entries(groups)) {
      values.forEach((v, i) => {
        rows.push({
          category,
          field_group: groupKey,
          value: typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9α-ωά-ώ]+/gi, "_").replace(/^_|_$/g, "") : String(i),
          label: v,
          display_order: i,
          is_published: true,
        });
      });
    }
  }

  console.log(`Total rows to insert: ${rows.length}`);

  // Check existing rows to avoid dupes (using upsert via on_conflict)
  // But REST upsert needs the unique constraint. Let's just insert in batches and ignore conflicts.
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/extra_field_options`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        inserted += batch.length;
      } else {
        const t = await res.text();
        console.error(`Batch ${i}: ${res.status} ${t}`);
      }
    } catch (e) {
      console.error(`Batch ${i} error:`, e.message);
    }
  }

  console.log(`\nDone. Inserted/upserted: ${inserted}`);

  // Verify counts per category
  console.log("\n=== Verification ===");
  const verify = await fetch(`${SUPABASE_URL}/rest/v1/extra_field_options?select=category,field_group`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
  });
  const allRows = await verify.json();
  const counts = {};
  for (const r of allRows) {
    const k = `${r.category}:${r.field_group}`;
    counts[k] = (counts[k] || 0) + 1;
  }
  Object.entries(counts).sort().forEach(([k, n]) => console.log(`  ${k}: ${n}`));
  console.log(`\nTotal rows in DB: ${allRows.length}`);
}

main().catch(console.error);
