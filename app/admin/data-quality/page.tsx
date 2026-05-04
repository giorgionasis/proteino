import { createAdminClient } from "@/lib/supabase/admin";
import { DataQualityList } from "@/components/admin/DataQualityList";

const CATEGORIES = ["movies", "series", "books", "recipes", "food", "bars", "hotels", "theater", "events"];

export default async function DataQualityPage() {
  const supabase = createAdminClient();

  // Fetch all items with NULL subcategory_id
  const { data: nullItems } = await supabase
    .from("items")
    .select("id, title, category, metadata, poster_url, backdrop_url")
    .is("subcategory_id", null)
    .order("category")
    .order("title");

  // Fetch extension table data for context (cuisine/type/event_type)
  const itemIds = (nullItems ?? []).map((i: any) => i.id);

  const [foodExt, barsExt, hotelsExt, theaterExt, eventsExt] = await Promise.all([
    supabase.from("item_food").select("item_id, cuisine, type, address").in("item_id", itemIds),
    supabase.from("item_bars").select("item_id, type, address").in("item_id", itemIds),
    supabase.from("item_hotels").select("item_id, type, address").in("item_id", itemIds),
    supabase.from("item_theater").select("item_id, type").in("item_id", itemIds),
    supabase.from("item_events").select("item_id, event_type").in("item_id", itemIds),
  ]);

  const extLookup: Record<string, any> = {};
  for (const r of (foodExt.data ?? []) as any[]) extLookup[r.item_id] = { cuisine: r.cuisine, type: r.type, address: r.address };
  for (const r of (barsExt.data ?? []) as any[]) extLookup[r.item_id] = { type: r.type, address: r.address };
  for (const r of (hotelsExt.data ?? []) as any[]) extLookup[r.item_id] = { type: r.type, address: r.address };
  for (const r of (theaterExt.data ?? []) as any[]) extLookup[r.item_id] = { type: r.type };
  for (const r of (eventsExt.data ?? []) as any[]) extLookup[r.item_id] = { eventType: r.event_type };

  // Fetch all subcategories
  const { data: subcats } = await supabase
    .from("subcategories")
    .select("id, category, name")
    .order("category")
    .order("display_order");

  // Build items with their "signal" (the field that should have been mapped)
  const enriched = (nullItems ?? []).map((item: any) => {
    const ext = extLookup[item.id] || {};
    let signal = "";
    if (["movies", "series", "books", "recipes"].includes(item.category)) {
      signal = (item.metadata?.tags || []).join(", ");
    } else if (item.category === "food") {
      signal = ext.cuisine || "";
    } else if (item.category === "bars" || item.category === "hotels" || item.category === "theater") {
      signal = ext.type || "";
    } else if (item.category === "events") {
      signal = ext.eventType || "";
    }
    return {
      id: item.id,
      title: item.title,
      category: item.category,
      signal,
      address: ext.address || null,
      posterUrl: item.poster_url,
      backdropUrl: item.backdrop_url,
    };
  });

  // Group by category
  const grouped: Record<string, typeof enriched> = {};
  for (const cat of CATEGORIES) grouped[cat] = [];
  for (const item of enriched) {
    if (grouped[item.category]) grouped[item.category].push(item);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Data Quality</h1>
        <span className="text-sm text-zinc-500">{enriched.length} items χρειάζονται review</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-900">
        <p className="font-semibold mb-1">Items χωρίς subcategory</p>
        <p>Αυτά τα items δεν αντιστοιχήθηκαν αυτόματα. Επίλεξε subcategory ή άλλη ενέργεια ανά item.</p>
      </div>

      <DataQualityList grouped={grouped} subcategories={(subcats ?? []) as any} />
    </div>
  );
}
