/**
 * Schema.org JSON-LD emitter for item detail pages.
 *
 * Maps Proteino's category model to the appropriate Schema.org @type and
 * fills in the rich-result-friendly fields per Google's spec:
 *   https://developers.google.com/search/docs/appearance/structured-data
 *
 * The output is fed into a <script type="application/ld+json"> tag on the
 * detail page. Nulls/empties are silently dropped so we don't emit
 * `"director": null` (which fails the validator).
 *
 * One function per category keeps the per-type logic legible and avoids
 * a giant switch-on-strings inside a single mapper. Each function takes
 * `(item, ext, viewerCtx)` and returns a Record<string, unknown> that
 * the caller serialises.
 */

import { safeImageUrl } from "@/lib/image-url";

export interface StructuredDataContext {
  /** Public-facing URL of this item — used as `@id` + `url`. */
  pageUrl: string;
  /** Site base URL (origin). */
  siteOrigin: string;
}

type AnyItem = Record<string, any>;

interface ReviewLike {
  id: string;
  rating: number;
  reflection: string | null;
  created_at: string;
  user: { display_name: string; handle: string };
}

/** Original suggester — used as the canonical author for Recipe rich
 *  results (Google's Recipe spec recommends `author`). Other types
 *  generally don't need an author (Movie has director, Book has writer). */
interface SuggesterLike {
  display_name: string;
  handle: string;
  created_at: string;
}

const SITE_NAME = "Proteino";

/* ─── Public entry point ─────────────────────────────────────────────── */

export function buildItemStructuredData(
  category: string,
  item: AnyItem,
  ext: AnyItem,
  reviews: ReviewLike[],
  ctx: StructuredDataContext,
  suggester: SuggesterLike | null = null,
): Record<string, unknown> | null {
  switch (category) {
    case "movies":  return buildMovie(item, ext, reviews, ctx);
    case "series":  return buildSeries(item, ext, reviews, ctx);
    case "books":   return buildBook(item, ext, reviews, ctx);
    case "recipes": return buildRecipe(item, ext, reviews, ctx, suggester);
    case "food":    return buildRestaurant(item, ext, reviews, ctx);
    case "bars":    return buildBar(item, ext, reviews, ctx);
    case "hotels":  return buildHotel(item, ext, reviews, ctx);
    case "theater": return buildTheaterEvent(item, ext, reviews, ctx);
    case "events":  return buildEvent(item, ext, reviews, ctx);
    default:        return null;
  }
}

/* ─── Helpers shared across types ────────────────────────────────────── */

function compact<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim().length === 0) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as T;
}

function imageList(item: AnyItem, ext: AnyItem): string[] {
  const urls = [
    item.backdrop_url,
    item.poster_url,
    item.cover_url,
    ...(Array.isArray(item.images) ? item.images.map((i: any) => i?.url) : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = safeImageUrl(raw);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  // Also try ext.gallery for venue tabs (food/bars/hotels)
  if (out.length === 0 && Array.isArray(ext.gallery)) {
    for (const g of ext.gallery) {
      const url = safeImageUrl(g?.url);
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  return out;
}

function aggregateRating(item: AnyItem) {
  const count = Number(item.rating_count ?? 0);
  const avg   = Number(item.avg_rating ?? 0);
  if (!count || !avg) return null;
  return {
    "@type":       "AggregateRating",
    ratingValue:   avg.toFixed(2),
    ratingCount:   count,
    bestRating:    "5",
    worstRating:   "1",
  };
}

function reviewObjects(reviews: ReviewLike[]) {
  return reviews
    .filter((r) => r.reflection && r.reflection.trim().length > 0)
    .slice(0, 8)
    .map((r) => compact({
      "@type":     "Review",
      reviewRating: {
        "@type":     "Rating",
        ratingValue: String(r.rating),
        bestRating:  "5",
        worstRating: "1",
      },
      author: {
        "@type": "Person",
        name:    r.user.display_name,
        url:     `/profile/${r.user.handle}`,
      },
      datePublished: r.created_at,
      reviewBody:    r.reflection,
    }));
}

function tagList(item: AnyItem): string[] {
  const tags = item?.metadata?.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim());
}

function genreFromTags(item: AnyItem): string | string[] | null {
  const tags = tagList(item);
  if (tags.length === 0) return null;
  if (tags.length === 1) return tags[0]!;
  return tags;
}

function trailerVideo(url: unknown, item: AnyItem): Record<string, unknown> | null {
  if (typeof url !== "string" || !url.trim()) return null;
  const thumb = safeImageUrl(item?.backdrop_url) ?? safeImageUrl(item?.poster_url) ?? null;
  return compact({
    "@type":      "VideoObject",
    name:         `${item.title} — Trailer`,
    description:  `Trailer για ${item.title}`,
    thumbnailUrl: thumb,
    // Schema spec needs uploadDate; we don't store one for trailers,
    // so fall back to item's modified_at / created_at.
    uploadDate:   (item.modified_at as string | undefined) ?? (item.created_at as string | undefined) ?? null,
    embedUrl:     toEmbedUrl(url) ?? undefined,
    contentUrl:   url,
  });
}

function toEmbedUrl(url: string): string | null {
  // YouTube watch URL → embed URL
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

function awardList(awards: unknown): string[] | null {
  if (!Array.isArray(awards)) return null;
  const out: string[] = [];
  for (const a of awards) {
    if (!a || typeof a !== "object") continue;
    const row = a as { type?: string; category?: string; year?: number | string };
    const type     = typeof row.type === "string"     ? row.type.trim()     : "";
    const category = typeof row.category === "string" ? row.category.trim() : "";
    const year     = row.year !== undefined && row.year !== null ? ` (${row.year})` : "";
    const label = [type, category].filter(Boolean).join(" — ");
    if (label) out.push(`${label}${year}`);
  }
  return out.length > 0 ? out : null;
}

/** Convert minutes → ISO 8601 duration. 95 → "PT1H35M". */
function isoDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : h > 0 ? "" : "0M"}`;
}

function postalAddress(streetAddress: string | null | undefined, locality?: string | null) {
  if (!streetAddress && !locality) return null;
  return compact({
    "@type":          "PostalAddress",
    streetAddress:    streetAddress ?? undefined,
    addressLocality:  locality ?? undefined,
    addressCountry:   "GR",
  });
}

function geoCoordinates(lat: number | null | undefined, lng: number | null | undefined) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return {
    "@type":    "GeoCoordinates",
    latitude:   lat,
    longitude:  lng,
  };
}

/* ─── Movies / Series ─────────────────────────────────────────────────── */

function buildMovie(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  return compact({
    "@context":     "https://schema.org",
    "@type":        "Movie",
    "@id":          ctx.pageUrl,
    url:            ctx.pageUrl,
    name:           item.title,
    alternateName:  item.original_title ?? null,
    description:    ext.plot ?? item.description_seo ?? null,
    image:          imageList(item, ext),
    genre:          genreFromTags(item),
    director:       ext.director ? { "@type": "Person", name: ext.director } : null,
    actor:          actorList(ext.actors),
    datePublished:  ext.release_date ?? (ext.year ? `${ext.year}-01-01` : null),
    duration:       isoDuration(ext.duration_min),
    inLanguage:     ext.language ?? null,
    countryOfOrigin: ext.country ? { "@type": "Country", name: ext.country } : null,
    trailer:        trailerVideo(ext.trailer_url, item),
    award:          awardList(ext.awards),
    aggregateRating: aggregateRating(item),
    review:         reviewObjects(reviews),
  });
}

function buildSeries(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  return compact({
    "@context":      "https://schema.org",
    "@type":         "TVSeries",
    "@id":           ctx.pageUrl,
    url:             ctx.pageUrl,
    name:            item.title,
    alternateName:   item.original_title ?? null,
    description:     ext.plot ?? item.description_seo ?? null,
    image:           imageList(item, ext),
    genre:           genreFromTags(item),
    creator:         ext.director ? { "@type": "Person", name: ext.director } : null,
    actor:           actorList(ext.actors),
    startDate:       ext.release_date ?? null,
    endDate:         ext.end_date ?? null,
    numberOfSeasons: typeof ext.seasons === "number" ? ext.seasons : null,
    inLanguage:      ext.language ?? null,
    trailer:         trailerVideo(ext.trailer_url, item),
    aggregateRating: aggregateRating(item),
    review:          reviewObjects(reviews),
  });
}

function actorList(actors: unknown) {
  if (!Array.isArray(actors)) return null;
  const out = actors
    .map((a: any) => {
      if (typeof a === "string") return { "@type": "Person", name: a };
      if (a && typeof a.name === "string") return { "@type": "Person", name: a.name };
      return null;
    })
    .filter((x): x is { "@type": "Person"; name: string } => !!x)
    .slice(0, 10);
  return out.length > 0 ? out : null;
}

/* ─── Books ───────────────────────────────────────────────────────────── */

function buildBook(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  // Authoritative external links — Public.gr / Politeia / etc. URLs stored
  // in metadata.publisher_url. Schema.org `sameAs` is the canonical place
  // to declare these "this is the same entity at another URL" references.
  const publisherUrl = typeof item?.metadata?.publisher_url === "string" ? item.metadata.publisher_url : null;
  return compact({
    "@context":      "https://schema.org",
    "@type":         "Book",
    "@id":           ctx.pageUrl,
    url:             ctx.pageUrl,
    name:            item.title,
    alternateName:   item.original_title ?? null,
    description:     ext.plot ?? item.description_seo ?? null,
    image:           imageList(item, ext),
    genre:           genreFromTags(item),
    author:          ext.writer ? { "@type": "Person", name: ext.writer } : null,
    publisher:       ext.publication ? { "@type": "Organization", name: ext.publication } : null,
    numberOfPages:   typeof ext.pages === "number" ? ext.pages : null,
    inLanguage:      ext.language ?? null,
    datePublished:   ext.publication_year ? `${ext.publication_year}-01-01` : null,
    isbn:            ext.isbn ?? null,
    bookFormat:      "https://schema.org/Paperback", // default — we don't track e-book vs hardcover
    sameAs:          publisherUrl ? [publisherUrl] : null,
    aggregateRating: aggregateRating(item),
    review:          reviewObjects(reviews),
  });
}

/* ─── Recipes ─────────────────────────────────────────────────────────── */

function buildRecipe(
  item: AnyItem,
  ext: AnyItem,
  reviews: ReviewLike[],
  ctx: StructuredDataContext,
  suggester: SuggesterLike | null,
) {
  const ingredients = parseIngredients(ext.ingredients);
  const steps       = parseSteps(ext.steps);
  const duration    = ext.duration as { prep?: number; cook?: number; total?: number } | undefined;
  const nutrition   = ext.nutrition as Record<string, unknown> | undefined;
  const tags        = tagList(item);

  return compact({
    "@context":         "https://schema.org",
    "@type":            "Recipe",
    "@id":              ctx.pageUrl,
    url:                ctx.pageUrl,
    name:               item.title,
    description:        ext.plot ?? item.description_seo ?? null,
    image:              imageList(item, ext),
    // Recipe.author — Google's spec recommends this strongly. The
    // original suggester is the canonical author on Proteino.
    author:             suggester
                          ? { "@type": "Person", name: suggester.display_name, url: `${ctx.siteOrigin}/profile/${suggester.handle}` }
                          : null,
    datePublished:      suggester?.created_at ?? item.created_at ?? null,
    keywords:           tags.length > 0 ? tags.join(", ") : null,
    recipeYield:        typeof item.yields === "number" ? `${item.yields} μερίδες` : (ext.yields ? `${ext.yields} μερίδες` : null),
    recipeCuisine:      ext.origin ?? null,
    recipeCategory:     ext.level ?? null,
    prepTime:           isoDuration(duration?.prep),
    cookTime:           isoDuration(duration?.cook),
    totalTime:          isoDuration(duration?.total ?? (duration?.prep && duration?.cook ? duration.prep + duration.cook : null)),
    recipeIngredient:   ingredients,
    recipeInstructions: steps,
    nutrition:          nutritionInfo(nutrition, ext.calories),
    aggregateRating:    aggregateRating(item),
    review:             reviewObjects(reviews),
  });
}

function parseIngredients(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r === "string" && r.trim()) {
      out.push(r.trim());
    } else if (r && typeof r === "object") {
      const obj = r as { name?: string; quantity?: string | number; unit?: string };
      if (obj.name) {
        const parts = [obj.quantity, obj.unit, obj.name].filter((x) => x !== undefined && x !== null && String(x).trim() !== "");
        out.push(parts.join(" "));
      }
    }
  }
  return out.length > 0 ? out : null;
}

function parseSteps(raw: unknown) {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((s: any, i: number) => {
      const text = typeof s === "string" ? s : (s && typeof s.text === "string" ? s.text : null);
      if (!text || !text.trim()) return null;
      return { "@type": "HowToStep", position: i + 1, text: text.trim() };
    })
    .filter((x): x is { "@type": "HowToStep"; position: number; text: string } => !!x);
  return out.length > 0 ? out : null;
}

function nutritionInfo(n: Record<string, unknown> | undefined, calories: unknown) {
  if (!n && (typeof calories !== "number" || calories <= 0)) return null;
  return compact({
    "@type":   "NutritionInformation",
    calories:  typeof calories === "number" && calories > 0 ? `${calories} kcal` : null,
    // Boolean diet flags become suitableForDiet hints when set.
    suitableForDiet: dietList(n),
  });
}

function dietList(n: Record<string, unknown> | undefined): string[] | null {
  if (!n) return null;
  const out: string[] = [];
  const truthy = (v: unknown) => v === true || v === "true" || v === 1;
  if (truthy((n as any).vegan)) out.push("https://schema.org/VeganDiet");
  if (truthy((n as any).vegetarian)) out.push("https://schema.org/VegetarianDiet");
  if (truthy((n as any).gluten_free)) out.push("https://schema.org/GlutenFreeDiet");
  return out.length > 0 ? out : null;
}

/* ─── Venues: Restaurant / Bar / Hotel ────────────────────────────────── */

function buildRestaurant(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  return compact({
    "@context":      "https://schema.org",
    "@type":         "Restaurant",
    "@id":           ctx.pageUrl,
    url:             ctx.pageUrl,
    name:            item.title,
    description:     ext.plot ?? item.description_seo ?? null,
    image:           imageList(item, ext),
    address:         postalAddress(ext.address),
    geo:             geoCoordinates(ext.lat, ext.lng),
    telephone:       ext.telephone ?? null,
    servesCuisine:   ext.cuisine ?? null,
    aggregateRating: aggregateRating(item),
    review:          reviewObjects(reviews),
  });
}

function buildBar(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  return compact({
    "@context":      "https://schema.org",
    "@type":         "BarOrPub",
    "@id":           ctx.pageUrl,
    url:             ctx.pageUrl,
    name:            item.title,
    description:     ext.plot ?? item.description_seo ?? null,
    image:           imageList(item, ext),
    address:         postalAddress(ext.address),
    geo:             geoCoordinates(ext.lat, ext.lng),
    telephone:       ext.telephone ?? null,
    aggregateRating: aggregateRating(item),
    review:          reviewObjects(reviews),
  });
}

function buildHotel(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  const facilities = (ext.facilities && typeof ext.facilities === "object" && !Array.isArray(ext.facilities))
    ? Object.entries(ext.facilities as Record<string, unknown>)
        .filter(([, v]) => v === true)
        .map(([k]) => ({
          "@type": "LocationFeatureSpecification",
          name:    k.replace(/_/g, " "),
          value:   true,
        }))
    : null;

  return compact({
    "@context":       "https://schema.org",
    "@type":          "Hotel",
    "@id":            ctx.pageUrl,
    url:              ctx.pageUrl,
    name:             item.title,
    description:      ext.plot ?? item.description_seo ?? null,
    image:            imageList(item, ext),
    address:          postalAddress(ext.address),
    geo:              geoCoordinates(ext.lat, ext.lng),
    telephone:        ext.telephone ?? null,
    priceRange:       ext.price_range ?? null,
    amenityFeature:   facilities && facilities.length > 0 ? facilities : null,
    aggregateRating:  aggregateRating(item),
    review:           reviewObjects(reviews),
  });
}

/* ─── Events: Theater + general Event ─────────────────────────────────── */

function buildTheaterEvent(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  const dates = parseEventDates(ext.dates);
  return compact({
    "@context":            "https://schema.org",
    "@type":               "TheaterEvent",
    "@id":                 ctx.pageUrl,
    url:                   ctx.pageUrl,
    name:                  item.title,
    description:           ext.plot ?? item.description_seo ?? null,
    image:                 imageList(item, ext),
    location:              placeFromVenue(ext.name_place, ext.address, ext.lat, ext.lng),
    startDate:             dates?.start ?? null,
    endDate:               dates?.end ?? null,
    eventStatus:           "https://schema.org/EventScheduled",
    eventAttendanceMode:   "https://schema.org/OfflineEventAttendanceMode",
    director:              ext.director ? { "@type": "Person", name: ext.director } : null,
    performer:             actorList(ext.actors),
    offers:                offersFrom(ext.ticket_url, ext.price),
    aggregateRating:       aggregateRating(item),
    review:                reviewObjects(reviews),
  });
}

function buildEvent(item: AnyItem, ext: AnyItem, reviews: ReviewLike[], ctx: StructuredDataContext) {
  const dates = parseEventDates(ext.dates);
  return compact({
    "@context":            "https://schema.org",
    "@type":               "Event",
    "@id":                 ctx.pageUrl,
    url:                   ctx.pageUrl,
    name:                  item.title,
    description:           ext.description ?? item.description_seo ?? null,
    image:                 imageList(item, ext),
    location:              placeFromVenue(ext.name_place, ext.address, ext.lat, ext.lng),
    startDate:             dates?.start ?? null,
    endDate:               dates?.end ?? null,
    eventStatus:           "https://schema.org/EventScheduled",
    eventAttendanceMode:   "https://schema.org/OfflineEventAttendanceMode",
    performer:             performerList(ext.performers),
    offers:                offersFrom(ext.ticket_url, ext.price),
    aggregateRating:       aggregateRating(item),
    review:                reviewObjects(reviews),
  });
}

function parseEventDates(raw: unknown): { start: string; end: string | null } | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const stamps = raw
    .map((d: any) => {
      if (typeof d === "string") return d;
      if (d && typeof d.date === "string") return d.date;
      if (d && typeof d.start === "string") return d.start;
      return null;
    })
    .filter((x): x is string => !!x)
    .sort();
  if (stamps.length === 0) return null;
  return {
    start: stamps[0]!,
    end:   stamps.length > 1 ? stamps[stamps.length - 1]! : null,
  };
}

function placeFromVenue(name: unknown, address: unknown, lat: unknown, lng: unknown) {
  const hasAny = name || address || (typeof lat === "number" && typeof lng === "number");
  if (!hasAny) return null;
  return compact({
    "@type":  "Place",
    name:     typeof name === "string" ? name : undefined,
    address:  typeof address === "string" ? postalAddress(address) : undefined,
    geo:      geoCoordinates(lat as number, lng as number),
  });
}

function offersFrom(url: unknown, price: unknown) {
  if (!url && !price) return null;
  return compact({
    "@type":         "Offer",
    url:             typeof url === "string" ? url : undefined,
    price:           price !== undefined && price !== null ? String(price) : undefined,
    priceCurrency:   "EUR",
    availability:    "https://schema.org/InStock",
  });
}

function performerList(raw: unknown) {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .map((p: any) => typeof p === "string" ? { "@type": "PerformingGroup", name: p } : null)
    .filter((x): x is { "@type": "PerformingGroup"; name: string } => !!x)
    .slice(0, 10);
  return out.length > 0 ? out : null;
}
