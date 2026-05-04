/**
 * Activities — proximity helpers.
 *
 * Used by hotel detail pages to surface admin-curated nearby activities
 * within X km of the hotel's lat/lng. No manual hotel↔activity linking —
 * geography does the work.
 */

type SupabaseLike = { from: (table: string) => any };

export interface NearbyActivity {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  lat: number;
  lng: number;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  phone: string | null;
  image_url: string | null;
  type_name: string;
  type_icon: string | null;
  category_name: string;
  category_icon: string | null;
  distance_km: number;
}

/**
 * Haversine distance in kilometers.
 * Earth's mean radius: 6371 km.
 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Fetch published activities within `radiusKm` of (lat, lng).
 *
 * Strategy: bounding-box pre-filter at the DB (uses idx_activities_loc),
 * then exact Haversine filter + sort in JS. Cheap enough for the scales
 * we expect (hundreds of activities total).
 */
export async function fetchNearbyActivities(
  sb: SupabaseLike,
  lat: number,
  lng: number,
  radiusKm = 50,
  limit = 10
): Promise<NearbyActivity[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  // Bounding-box approximation. 1 degree latitude ≈ 111 km;
  // 1 degree longitude ≈ 111 km × cos(lat).
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));

  const { data, error } = await sb
    .from("activities")
    .select(
      "id, name, description, address, lat, lng, website_url, facebook_url, instagram_url, phone, image_url, " +
      "activity_types!inner(name, icon, activity_categories!inner(name, icon))"
    )
    .eq("is_published", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta)
    .limit(100);

  if (error) {
    console.error("[activities] proximity query failed:", error.message);
    return [];
  }

  const enriched: NearbyActivity[] = (data ?? [])
    .map((row: any): NearbyActivity | null => {
      const tp = row.activity_types;
      const cat = tp?.activity_categories;
      if (!tp || !cat || row.lat == null || row.lng == null) return null;
      const distance_km = haversineKm(lat, lng, row.lat, row.lng);
      if (distance_km > radiusKm) return null;
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        website_url: row.website_url,
        facebook_url: row.facebook_url,
        instagram_url: row.instagram_url,
        phone: row.phone,
        image_url: row.image_url,
        type_name: tp.name,
        type_icon: tp.icon,
        category_name: cat.name,
        category_icon: cat.icon,
        distance_km,
      };
    })
    .filter((x: NearbyActivity | null): x is NearbyActivity => x !== null);

  enriched.sort((a, b) => a.distance_km - b.distance_km);
  return enriched.slice(0, limit);
}

/**
 * Format distance for display: "1.2 χλμ" / "350 μ"
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} μ`;
  return `${km.toFixed(1)} χλμ`;
}
