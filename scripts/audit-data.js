/**
 * Data Integrity Audit
 *
 * Checks:
 * 1. Items with NULL subcategory_id — can they be auto-resolved?
 * 2. Extension table coverage — does every item have a row in its category's ext table?
 * 3. Critical extension fields — flag missing/empty values
 */

const SUPABASE_URL = "https://qwrryuyukoiqccxwauuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cnJ5dXl1a29pcWNjeHdhdXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0NDM2MywiZXhwIjoyMDkzMDIwMzYzfQ.olZv-lhhEvPDH-UrFoL1XvmOl-fy-0sYLuqEBQ23Cnk";

async function req(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function fetchAll(table, fields, extra = "") {
  let all = [];
  let offset = 0;
  while (true) {
    const batch = await req(`${table}?select=${fields}&order=item_id&offset=${offset}&limit=1000${extra}`);
    all = all.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function fetchAllItems() {
  let all = [];
  let offset = 0;
  while (true) {
    const batch = await req(`items?select=id,title,category,subcategory_id,metadata,cover_url,poster_url,backdrop_url&order=id&offset=${offset}&limit=1000`);
    all = all.concat(batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  return all;
}

async function main() {
  console.log("=== Data Integrity Audit ===\n");

  // 1. Fetch all items
  const items = await fetchAllItems();
  console.log(`Total items: ${items.length}\n`);

  // 2. Group by category
  const byCategory = {};
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  // 3. NULL subcategory analysis
  console.log("=== NULL subcategory_id analysis ===");
  const nullsByCategory = {};
  for (const [cat, list] of Object.entries(byCategory)) {
    const nulls = list.filter(i => !i.subcategory_id);
    if (nulls.length > 0) nullsByCategory[cat] = nulls;
    console.log(`  ${cat}: ${nulls.length}/${list.length} items have NULL subcategory`);
  }

  // 4. Extension table coverage
  console.log("\n=== Extension table coverage ===");
  const extTables = {
    movies: ["item_movies", "director,country,duration_min,release_date,plot,trailer_url,actors"],
    series: ["item_series", "director,seasons,country,plot"],
    books: ["item_books", "writer,publication,language,pages,publication_year,plot"],
    food: ["item_food", "cuisine,type,address,lat,lng"],
    bars: ["item_bars", "type,address,lat,lng"],
    hotels: ["item_hotels", "type,address,lat,lng,price_range"],
    recipes: ["item_recipes", "yields,calories,level,ingredients,steps"],
    theater: ["item_theater", "name_place,writer,director,year,plot"],
    events: ["item_events", "name_place,event_type,description"],
  };

  const extData = {};
  for (const [cat, [table, fields]] of Object.entries(extTables)) {
    const rows = await fetchAll(table, `item_id,${fields}`);
    extData[cat] = Object.fromEntries(rows.map(r => [r.item_id, r]));
  }

  const missingExt = {};
  for (const [cat, list] of Object.entries(byCategory)) {
    const missing = list.filter(i => !extData[cat]?.[i.id]);
    if (missing.length > 0) missingExt[cat] = missing;
    console.log(`  ${cat}: ${list.length - missing.length}/${list.length} have extension row (${missing.length} missing)`);
  }

  // 5. Show items with missing extension rows
  if (Object.keys(missingExt).length > 0) {
    console.log("\n=== Items MISSING extension table row ===");
    for (const [cat, list] of Object.entries(missingExt)) {
      console.log(`\n  ${cat} (${list.length}):`);
      list.slice(0, 5).forEach(i => console.log(`    - "${i.title}" (id: ${i.id.slice(0, 8)})`));
      if (list.length > 5) console.log(`    ... and ${list.length - 5} more`);
    }
  }

  // 6. Critical empty fields per category
  console.log("\n=== Empty critical fields ===");
  const emptyFields = {};

  for (const [cat, list] of Object.entries(byCategory)) {
    const stats = {};
    for (const item of list) {
      const ext = extData[cat]?.[item.id];
      if (!ext) continue;

      // Check critical fields per category
      const criticals = {
        movies: ["director", "duration_min", "plot", "release_date"],
        series: ["plot"],
        books: ["writer", "plot", "pages"],
        food: ["address", "lat", "lng"],
        bars: ["address", "lat", "lng"],
        hotels: ["address", "lat", "lng"],
        recipes: ["ingredients", "steps"],
        theater: ["name_place", "plot"],
        events: ["name_place", "description"],
      };

      const fields = criticals[cat] || [];
      for (const f of fields) {
        const v = ext[f];
        const empty = v === null || v === undefined || v === "" ||
                      (Array.isArray(v) && v.length === 0) ||
                      (typeof v === "object" && v !== null && Object.keys(v).length === 0);
        if (empty) {
          stats[f] = (stats[f] || 0) + 1;
        }
      }
    }
    if (Object.keys(stats).length > 0) {
      emptyFields[cat] = stats;
      console.log(`\n  ${cat} (${list.length} items):`);
      for (const [field, count] of Object.entries(stats)) {
        console.log(`    ${field}: ${count} items missing`);
      }
    }
  }

  // 7. Check images
  console.log("\n=== Image coverage ===");
  for (const [cat, list] of Object.entries(byCategory)) {
    const noCover = list.filter(i => !i.cover_url).length;
    const noPoster = list.filter(i => !i.poster_url).length;
    const noBackdrop = list.filter(i => !i.backdrop_url).length;
    console.log(`  ${cat}: ${list.length} items — no cover: ${noCover}, no poster: ${noPoster}, no backdrop: ${noBackdrop}`);
  }

  // 8. Auto-resolve NULL subcategories — check what tags they have
  console.log("\n=== NULL subcategory items by signal ===");
  for (const [cat, nulls] of Object.entries(nullsByCategory)) {
    const signalCounts = {};
    for (const item of nulls) {
      let signal = "—";
      if (cat === "books" || cat === "movies" || cat === "series" || cat === "recipes") {
        signal = (item.metadata?.tags || []).join(", ") || "—";
      } else {
        const ext = extData[cat]?.[item.id];
        if (cat === "food") signal = ext?.cuisine || "—";
        else if (cat === "bars") signal = ext?.type || "—";
        else if (cat === "hotels") signal = ext?.type || "—";
        else if (cat === "theater") signal = ext?.type || "—";
        else if (cat === "events") signal = ext?.event_type || "—";
      }
      signalCounts[signal] = (signalCounts[signal] || 0) + 1;
    }
    console.log(`\n  ${cat} (${nulls.length} NULL):`);
    Object.entries(signalCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([sig, n]) => console.log(`    ${n}× "${sig}"`));
  }
}

main().catch(console.error);
