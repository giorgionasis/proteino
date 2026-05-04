/**
 * Seed Greek Regions (2-level hierarchy)
 * Level 1: Major regions (Αττική, Κρήτη, Μακεδονία, etc.)
 * Level 2: Areas/Cities within each region
 *
 * Run: node scripts/seed-regions.js
 */

const SUPABASE_URL = "https://qwrryuyukoiqccxwauuz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cnJ5dXl1a29pcWNjeHdhdXV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ0NDM2MywiZXhwIjoyMDkzMDIwMzYzfQ.olZv-lhhEvPDH-UrFoL1XvmOl-fy-0sYLuqEBQ23Cnk";

const REGIONS = {
  "Αττική": ["Αθήνα Κέντρο", "Νότια Προάστια", "Βόρεια Προάστια", "Δυτικά Προάστια", "Πειραιάς", "Ανατολική Αττική"],
  "Θεσσαλονίκη": ["Κέντρο", "Ανατολική Θεσσαλονίκη", "Δυτική Θεσσαλονίκη"],
  "Κρήτη": ["Ηράκλειο", "Χανιά", "Ρέθυμνο", "Άγιος Νικόλαος", "Σητεία"],
  "Πελοπόννησος": ["Ναύπλιο", "Καλαμάτα", "Σπάρτη", "Τρίπολη", "Πάτρα", "Μονεμβασιά"],
  "Κυκλάδες": ["Μύκονος", "Σαντορίνη", "Πάρος", "Νάξος", "Μήλος", "Σύρος", "Τήνος"],
  "Δωδεκάνησα": ["Ρόδος", "Κως", "Κάρπαθος", "Σύμη"],
  "Ιόνια Νησιά": ["Κέρκυρα", "Ζάκυνθος", "Κεφαλονιά", "Λευκάδα"],
  "Βόρειο Αιγαίο": ["Λέσβος", "Χίος", "Σάμος", "Λήμνος"],
  "Μακεδονία": ["Χαλκιδική", "Καβάλα", "Κατερίνη", "Σέρρες", "Καστοριά", "Βέροια"],
  "Θεσσαλία": ["Βόλος", "Λάρισα", "Τρίκαλα", "Μετέωρα"],
  "Ήπειρος": ["Ιωάννινα", "Πρέβεζα", "Ζαγόρι", "Μέτσοβο"],
  "Θράκη": ["Αλεξανδρούπολη", "Ξάνθη", "Κομοτηνή"],
  "Στερεά Ελλάδα": ["Δελφοί", "Αράχωβα", "Λαμία", "Χαλκίδα", "Καρπενήσι"],
  "Σποράδες": ["Σκιάθος", "Σκόπελος", "Αλόννησος"],
};

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

async function main() {
  console.log("=== Seeding Greek Regions ===\n");

  // Check if regions already exist
  const existing = await supabaseRequest("regions?select=id,name&limit=1");
  if (existing.length > 0) {
    console.log("Regions already seeded. Skipping.");
    return;
  }

  // Insert parent regions first
  const parentRows = Object.keys(REGIONS).map((name, i) => ({
    name,
    slug: slugify(name),
    parent_id: null,
    display_order: i,
  }));

  const parents = await supabaseRequest("regions", {
    method: "POST",
    body: JSON.stringify(parentRows),
  });

  console.log(`Inserted ${parents.length} parent regions`);

  // Build parent lookup
  const parentLookup = {};
  for (const p of parents) {
    parentLookup[p.name] = p.id;
  }

  // Insert child regions
  const childRows = [];
  for (const [parentName, children] of Object.entries(REGIONS)) {
    children.forEach((childName, i) => {
      childRows.push({
        name: childName,
        slug: slugify(childName),
        parent_id: parentLookup[parentName],
        display_order: i,
      });
    });
  }

  // Insert in batches
  for (let i = 0; i < childRows.length; i += 50) {
    const batch = childRows.slice(i, i + 50);
    await supabaseRequest("regions", {
      method: "POST",
      body: JSON.stringify(batch),
    });
  }

  console.log(`Inserted ${childRows.length} child regions`);
  console.log("\n=== Done ===");
}

main().catch(console.error);
