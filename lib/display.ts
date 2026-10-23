/**
 * "Empty-state = hide, never —" (CLAUDE.md detail-page rules). Detail
 * components default missing fields to "-", so a cell checks this before
 * rendering and a row hides when both of its cells are blank.
 */
export function isBlankValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return s === "" || s === "-" || s === "—" || s === "–" || s === "null" || s === "undefined";
}
