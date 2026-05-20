/**
 * One-off cleanup: strip useMemo / useCallback wrappers now that the
 * React Compiler is auto-memoizing every component (CLAUDE.md §43).
 *
 * Conservative — only touches the exact two patterns. Leaves
 * useImperativeHandle, useRef, useState, useEffect untouched.
 *
 *   Pattern A (useCallback):
 *     const x = useCallback((args) => { body }, [deps]);
 *     →
 *     const x = (args) => { body };
 *
 *   Pattern B (useMemo with arrow fn body):
 *     const x = useMemo(() => { body return expr; }, [deps]);
 *     →
 *     const x = (() => { body return expr; })();
 *
 *   Pattern C (useMemo with expression return):
 *     const x = useMemo(() => expression, [deps]);
 *     →
 *     const x = expression;
 *
 * Run:
 *   node scripts/sweep-memo-callback.js           # dry-run, prints diff stats
 *   node scripts/sweep-memo-callback.js --apply   # write changes
 *
 * Import statements are cleaned up afterwards by hand or by a
 * follow-up script — too many shapes to do robustly here.
 */

const fs = require("node:fs");
const path = require("node:path");

const apply = process.argv.includes("--apply");
const roots = ["app", "components", "lib", "hooks"];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

/** Match the body of a balanced-paren wrapper. Starts at index `i`
 *  where source[i] === '('. Returns the index AFTER the matching ')'. */
function matchParen(src, i) {
  if (src[i] !== "(") throw new Error("expected (");
  let depth = 0;
  let inString = null;
  let inLineComment = false;
  let inBlockComment = false;
  let inTemplate = false;
  let templateDepth = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    const next = src[k + 1];
    if (inLineComment) { if (c === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (c === "*" && next === "/") { inBlockComment = false; k++; } continue; }
    if (inString) {
      if (c === "\\") { k++; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (c === "\\") { k++; continue; }
      if (c === "$" && next === "{") { templateDepth++; k++; continue; }
      if (c === "}" && templateDepth > 0) { templateDepth--; continue; }
      if (c === "`" && templateDepth === 0) { inTemplate = false; }
      continue;
    }
    if (c === "/" && next === "/") { inLineComment = true; k++; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; k++; continue; }
    if (c === '"' || c === "'") { inString = c; continue; }
    if (c === "`") { inTemplate = true; continue; }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return k + 1;
    }
  }
  throw new Error("unbalanced paren");
}

/** Strip one useCallback / useMemo call starting at `start` where
 *  source[start..] reads "useMemo(" or "useCallback(". Returns the
 *  edited source + the index just past the replaced span. */
function stripOne(src, start) {
  const which = src.startsWith("useMemo(", start) ? "useMemo"
              : src.startsWith("useCallback(", start) ? "useCallback"
              : null;
  if (!which) return null;

  const openParen = start + which.length;            // index of '('
  const closeParen = matchParen(src, openParen);    // index after ')'

  // Inside: () => ...   OR   () => { ... }
  const innerRaw = src.slice(openParen + 1, closeParen - 1);
  // Strip any trailing whitespace + trailing comma so the deps split
  // doesn't pick the dangling comma after `[deps]` (formatter style).
  const inner = innerRaw.replace(/[\s,]+$/, "");

  // Split inner into [arrowFn, depsArray]. The last top-level comma is
  // the boundary; same paren-walk but on the inner span.
  const commaIdx = findLastTopLevelComma(inner);
  if (commaIdx === -1) return null;                  // no deps — leave alone
  let arrow = inner.slice(0, commaIdx).trim();
  const depsRaw = inner.slice(commaIdx + 1).trim();
  if (!depsRaw.startsWith("[") || !depsRaw.endsWith("]")) return null; // weird

  // arrow MUST be an arrow function expression. Detect: optional async,
  // then arg list `(…)` or single identifier, optional TS return type
  // `: Foo<X> | Bar`, then `=>`. Return-type chars excluded: `(`, `{`,
  // `=` — keeps the `=>` of inline `() => void` out of the match.
  const arrowMatch = arrow.match(/^(async\s+)?(\([^)]*\)|\w+)(\s*:\s*[\w\s.,<>|&[\]?'"-]+)?\s*=>/s);
  // useMemo MAY be `() => { return … }` OR `() => expr`. useCallback is
  // always `(args) => body` or `async (args) => body`. If the inner
  // doesn't look like an arrow fn, skip.
  if (!arrowMatch) return null;

  let replacement;
  if (which === "useCallback") {
    // Drop the wrapper completely. The arrow fn stands as the value.
    replacement = arrow;
  } else {
    // useMemo: if the body is a single expression after `=>`, hoist it;
    // otherwise wrap as an IIFE so the local `let`s + early returns
    // stay valid.
    const bodyStart = arrowMatch[0].length;
    const body = arrow.slice(bodyStart).trim();
    if (body.startsWith("{")) {
      replacement = `(${arrow})()`;
    } else {
      // Single expression. Drop the arrow header.
      replacement = body;
    }
  }

  // Stitch.
  return {
    edited: src.slice(0, start) + replacement + src.slice(closeParen),
    next:   start + replacement.length,
  };
}

function findLastTopLevelComma(src) {
  let depth = 0, bracket = 0, brace = 0;
  let inString = null, inLineComment = false, inBlockComment = false;
  let inTemplate = false;
  let lastComma = -1;
  for (let k = 0; k < src.length; k++) {
    const c = src[k];
    const next = src[k + 1];
    if (inLineComment) { if (c === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (c === "*" && next === "/") { inBlockComment = false; k++; } continue; }
    if (inString) {
      if (c === "\\") { k++; continue; }
      if (c === inString) inString = null;
      continue;
    }
    if (inTemplate) {
      if (c === "\\") { k++; continue; }
      if (c === "`") inTemplate = false;
      continue;
    }
    if (c === "/" && next === "/") { inLineComment = true; k++; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; k++; continue; }
    if (c === '"' || c === "'") { inString = c; continue; }
    if (c === "`") { inTemplate = true; continue; }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "[") bracket++;
    else if (c === "]") bracket--;
    else if (c === "{") brace++;
    else if (c === "}") brace--;
    else if (c === "," && depth === 0 && bracket === 0 && brace === 0) lastComma = k;
  }
  return lastComma;
}

let totalUseCallback = 0;
let totalUseMemo = 0;
let totalFiles = 0;
let skipped = [];

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const original = fs.readFileSync(file, "utf8");
    let src = original;
    let cursor = 0;
    let touched = false;
    let usCB = 0, usMM = 0;

    while (cursor < src.length) {
      const idxMemo = src.indexOf("useMemo(", cursor);
      const idxCb   = src.indexOf("useCallback(", cursor);
      let idx = -1;
      if (idxMemo === -1 && idxCb === -1) break;
      if (idxMemo === -1) idx = idxCb;
      else if (idxCb === -1) idx = idxMemo;
      else idx = Math.min(idxMemo, idxCb);

      // Make sure it's not a substring inside an identifier (e.g. useMemoized)
      const before = src[idx - 1];
      if (before && /[\w$.]/.test(before)) { cursor = idx + 1; continue; }

      const which = src.startsWith("useMemo(", idx) ? "useMemo" : "useCallback";
      const result = stripOne(src, idx);
      if (!result) {
        skipped.push({ file, idx, which });
        cursor = idx + which.length;
        continue;
      }
      src = result.edited;
      cursor = result.next;
      touched = true;
      if (which === "useMemo") usMM++; else usCB++;
    }

    if (touched) {
      totalFiles++;
      totalUseCallback += usCB;
      totalUseMemo += usMM;

      // Import cleanup: drop `useMemo` / `useCallback` from the React
      // import if no other reference remains in the file.
      src = cleanReactImport(src);

      if (apply) fs.writeFileSync(file, src, "utf8");
      console.log(`  ${file}  ${usCB} useCallback · ${usMM} useMemo`);
    }
  }
}

function cleanReactImport(src) {
  const importMatch = src.match(/^(\s*)import\s+\{([^}]+)\}\s+from\s+(["'])react\3;?/m);
  if (!importMatch) return src;
  const fullStart = importMatch.index;
  const fullLen = importMatch[0].length;
  const indent = importMatch[1];
  const namesRaw = importMatch[2];
  const quote = importMatch[3];
  const semi = importMatch[0].endsWith(";") ? ";" : "";

  const restOfFile = src.slice(fullStart + fullLen);
  const names = namesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const kept = names.filter((n) => {
    if (n !== "useMemo" && n !== "useCallback") return true;
    // Look for any other use of this identifier in the rest of the file.
    const re = new RegExp(`\\b${n}\\b`);
    return re.test(restOfFile);
  });

  if (kept.length === names.length) return src;
  if (kept.length === 0) {
    // Drop the import line entirely (preserve preceding indent).
    return src.slice(0, fullStart) + indent + src.slice(fullStart + fullLen + 1).replace(/^\n/, "");
  }
  const replacement = `${indent}import { ${kept.join(", ")} } from ${quote}react${quote}${semi}`;
  return src.slice(0, fullStart) + replacement + src.slice(fullStart + fullLen);
}

console.log("");
console.log(`Files touched:  ${totalFiles}`);
console.log(`useCallback:    ${totalUseCallback}`);
console.log(`useMemo:        ${totalUseMemo}`);
console.log(`Skipped:        ${skipped.length}`);
if (skipped.length) {
  console.log("Skipped sites (manual review):");
  for (const s of skipped.slice(0, 20)) {
    console.log(`  ${s.file}  @ index ${s.idx} (${s.which})`);
  }
  if (skipped.length > 20) console.log(`  …and ${skipped.length - 20} more`);
}
if (!apply) console.log("\n(dry-run) pass --apply to write changes.");
