#!/usr/bin/env node
/**
 * Fails (exit 1) if any exported HTTP handler under app/api/admin does not
 * open with the requireAdmin() gate. Admin routes write with the
 * service-role client, so a missing gate = a public admin endpoint.
 *
 *   node scripts/check-admin-gates.mjs
 *
 * `--fix` inserts the gate (+ imports) into every handler missing it.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ADMIN_API = path.join(ROOT, "app/api/admin");
const FIX = process.argv.includes("--fix");

const HANDLER_RE = /^export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/;
const GATE_1 = "  const gate = await requireAdmin();";
const GATE_2 = "  if (gate instanceof NextResponse) return gate;";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name === "route.ts" ? [p] : [];
  });
}

function nextNonBlank(lines, i) {
  while (i < lines.length && lines[i].trim() === "") i++;
  return i;
}

const missing = [];
let handlers = 0;

for (const file of walk(ADMIN_API).sort()) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const inserts = [];

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HANDLER_RE);
    if (!m) continue;
    handlers++;
    // Signature may span lines — the body opens on the first line ending in "{".
    let open = i;
    while (open < lines.length && !lines[open].trimEnd().endsWith("{")) open++;
    const a = nextNonBlank(lines, open + 1);
    const b = nextNonBlank(lines, a + 1);
    if (lines[a] === GATE_1 && lines[b] === GATE_2) continue;
    missing.push(`${path.relative(ROOT, file)}:${i + 1} ${m[1]}`);
    inserts.push(open);
  }

  if (FIX && inserts.length) {
    for (const open of inserts.reverse()) lines.splice(open + 1, 0, GATE_1, GATE_2, "");
    let src = lines.join("\n");
    if (!src.includes('from "@/lib/admin/require-admin"')) {
      src = `import { requireAdmin } from "@/lib/admin/require-admin";\n` + src;
    }
    if (!/import\s*\{[^}]*\bNextResponse\b[^}]*\}\s*from\s*"next\/server"/.test(src)) {
      src = `import { NextResponse } from "next/server";\n` + src;
    }
    fs.writeFileSync(file, src);
  }
}

if (missing.length) {
  console.error(`${FIX ? "Gated" : "Missing requireAdmin() gate in"} ${missing.length}/${handlers} admin handlers:`);
  for (const m of missing) console.error("  " + m);
  process.exit(FIX ? 0 : 1);
}
console.log(`OK — all ${handlers} admin handlers gated.`);
