import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCategoriesResolved } from "@/lib/categories-meta";

/**
 * GET /api/admin/categories
 *
 * Returns the 9 categories with DB-overlay metadata (label / icon /
 * display_order / is_nav_published). Slug + capability flags come
 * from the code constant since they're route-coupled and not safely
 * DB-editable. See `lib/categories-meta.ts` for the resolver.
 *
 * Writes go through PATCH /api/admin/categories/[slug].
 */
export async function GET() {
  const cats = await getCategoriesResolved();
  return NextResponse.json({ categories: cats });
}

/** Used by the slug PATCH route to nudge consumers; centralised here
 *  so future paths (BottomNav, home, etc.) only need one knob. */
export function revalidateAfterCategoryEdit() {
  // Home + every category landing surface a category label or icon.
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/categories");
}
