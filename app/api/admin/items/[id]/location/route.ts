import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/items/[id]/location
 *
 * Focused write that updates ONLY address + lat/lng on a venue's extension
 * row. Decoupled from the global suggestion editor save so accidental pin
 * drags don't bleed into other field saves and the admin can confirm the
 * location explicitly. AddressMapSection's "Αποθήκευση τοποθεσίας" button
 * is the sole caller.
 *
 * Body: { category: "food"|"bars"|"hotels"|"theater"|"events", address, lat, lng }
 */

const VENUE_TABLES = new Set(["food", "bars", "hotels", "theater", "events"]);

interface Body {
  category?: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const itemId = params.id;
  const body = (await req.json().catch(() => ({}))) as Body;
  const category = (body.category ?? "").toLowerCase();

  if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!VENUE_TABLES.has(category)) {
    return NextResponse.json({ error: "category must be a venue category" }, { status: 400 });
  }

  // Coerce / sanity-check
  const address = typeof body.address === "string" ? body.address.trim() || null : null;
  const lat = typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null;
  const lng = typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null;
  if (lat !== null && (lat < -90 || lat > 90)) {
    return NextResponse.json({ error: "lat out of range" }, { status: 400 });
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    return NextResponse.json({ error: "lng out of range" }, { status: 400 });
  }

  const admin = createAdminClient();
  const table = `item_${category}`;

  const { error } = await (admin.from(table) as any)
    .upsert({ item_id: itemId, address, lat, lng }, { onConflict: "item_id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, address, lat, lng });
}
