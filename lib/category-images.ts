/**
 * Centralised lookup for the circular category-tile images used on
 * the guest home, registered home, and the SuggestionFeed category
 * filter row. Returns null for categories where the asset has not
 * been generated yet — consumers should fall back to their existing
 * coloured placeholder (often with the category emoji).
 */
export const CATEGORY_IMAGE: Record<string, string | null> = {
  books:   "/categories/books.png",
  movies:  "/categories/movies.png",
  series:  "/categories/series.png",
  recipes: "/categories/recipes.png",
  food:    "/categories/food.png",
  bars:    "/categories/bars.png",
  hotels:  "/categories/hotels.png",
  theater: "/categories/theater.png",
  events:  "/categories/events.png",
};

export function categoryImage(slug: string): string | null {
  return CATEGORY_IMAGE[slug] ?? null;
}
