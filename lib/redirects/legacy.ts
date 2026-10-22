/**
 * Old Joomla/K2 URL → new route resolver, used by proxy.ts for 301s after
 * the www.proteino.gr cutover. Pure + synchronous (no DB) — the lookup
 * tables are generated into legacy-map.json by
 * scripts/build-legacy-redirects.ts.
 *
 * Old URL shapes:
 *   /psyxagwgia/vivlio/<subcategory>/<alias>          item
 *   /anapsyxh/fagito/<region>/<city>/<alias>          venue item
 *   /psyxagwgia/vivlio/<subcategory>                  listing
 *   /index.php?option=com_k2&view=item&id=3546:alias  non-SEF item
 *   /profile/1024-eirini                              profile (K2 user id)
 *   /oroi-xrisis, /privacy-policy, /faq, …            static pages
 *
 * Retired sections (internet, short films, documentaries, TV shows,
 * wine/beer, contests) land on the closest live category — never a 404
 * ("no dead ends").
 */

export interface LegacyMap {
  byAlias: Record<string, Record<string, string>>;
  byK2Id: Record<string, string>;
  usersByK2Id: Record<string, string>;
}

/** Same normalisation for stored aliases and URL segments. */
export function normalizeLegacyAlias(s: string): string {
  let v = s;
  try { v = decodeURIComponent(v); } catch { /* keep raw */ }
  return v
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** `<root>/<section>` → new category slug; `<root>` alone → fallback. */
const SECTION_TO_CATEGORY: Record<string, string> = {
  "psyxagwgia/vivlio":               "books",
  "psyxagwgia/kinimatografos":       "movies",
  "psyxagwgia/theatro":              "theater",
  "psyxagwgia/ekdilwseis":           "events",
  "psyxagwgia/tainia-mikroy-mikous": "movies",  // retired: short films
  "thleorash/tileoptikes-seires":    "series",
  "thleorash/ntokimanter":           "series",  // retired: documentaries
  "thleorash/ekpompes":              "series",  // retired: TV shows
  "anapsyxh/diamoni":                "hotels",
  "anapsyxh/fagito":                 "food",
  "anapsyxh/diaskedasi":             "bars",
  "diatrofi/syntages":               "recipes",
  "diatrofi/oinos":                  "bars",    // retired: wine
  "diatrofi/mpira":                  "bars",    // retired: beer
};

const ROOT_FALLBACK: Record<string, string> = {
  psyxagwgia:  "/",
  thleorash:   "/series",
  anapsyxh:    "/",
  diatrofi:    "/recipes",
  diadiktyo:   "/",   // retired: websites / apps / games / video
  diagonismoi: "/",   // retired: contests
};

const STATIC: Record<string, string> = {
  "/oroi-xrisis":              "/terms",
  "/oroi-xrisis-2":            "/terms",
  "/privacy-policy":           "/privacy",
  "/faq":                      "/help",
  "/registration":             "/register",
  "/protasi":                  "/",
  "/stats":                    "/leaderboard",
  "/profileedit":              "/you",
  "/logout":                   "/",
  "/manageconnections":        "/",
  "/moderateuserapprovals":    "/",
  "/moderatereports":          "/",
  "/moderateimages":           "/",
  "/moderatebans":             "/",
  "/index.php":                "/",
  "/404":                      "/",
  "/about-us":                 "/help",
  "/cbuserlist":               "/leaderboard",
  "/forgotlogin":              "/forgot-password",
  "/profile":                  "/you",
};

/**
 * Returns the new path for an old URL, or null when the request is not a
 * legacy URL (let it through untouched).
 */
export function resolveLegacyRedirect(
  pathname: string,
  searchParams: URLSearchParams,
  map: LegacyMap,
): string | null {
  const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";

  // Non-SEF Joomla: /index.php?option=com_k2&view=item&id=3546:alias
  if (path === "/index.php" || path === "") {
    const id = searchParams.get("id")?.split(":")[0];
    if (searchParams.get("view") === "item" && id && map.byK2Id[id]) return map.byK2Id[id];
    return "/";
  }

  if (path.startsWith("/component/")) return path.includes("contact") ? "/support" : "/";

  if (STATIC[path]) return STATIC[path];

  // Old profiles carry the K2 user id: /profile/1024-eirini. Handles
  // without an id prefix are left alone — they match new handles as-is.
  const profile = path.match(/^\/profile\/(\d+)-/);
  if (profile) {
    const handle = map.usersByK2Id[profile[1]];
    return handle ? `/profile/${encodeURIComponent(handle)}` : "/";
  }

  const segs = path.split("/").filter(Boolean);
  const root = segs[0];
  if (!(root in ROOT_FALLBACK)) return null;

  const category = SECTION_TO_CATEGORY[`${root}/${segs[1] ?? ""}`];
  const listing = category ? `/${category}` : ROOT_FALLBACK[root];

  // Items live at depth ≥ 3; the last segment is the K2 alias. Shallower
  // paths and region/subcategory listings fall back to the category.
  if (segs.length >= 3) {
    const last = segs[segs.length - 1];
    const byCategory = map.byAlias[normalizeLegacyAlias(last)];
    if (byCategory) {
      if (category && byCategory[category]) return byCategory[category];
      const all = Object.values(byCategory);
      if (all.length === 1) return all[0];
    }
    // Rare "<k2id>-alias" form.
    const idPrefix = last.match(/^(\d+)-/)?.[1];
    if (idPrefix && map.byK2Id[idPrefix]) return map.byK2Id[idPrefix];
  }

  return listing;
}
