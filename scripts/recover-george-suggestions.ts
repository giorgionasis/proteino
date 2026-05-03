/**
 * Recovery script: restore suggestions for George Nasis (MySQL user 898)
 * that were lost when the "george-n" migration account was deleted.
 *
 * Run:
 *   npx tsx scripts/recover-george-suggestions.ts
 *   npx tsx scripts/recover-george-suggestions.ts --dry-run
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────

const GEORGE_K2_ID   = 898;
const GNASIS_UUID    = "fc88da76-a1bb-4bc5-8b8f-8138a9661592";
const DUMP_PATH      = resolve("docs/giorgion856960_proteino_dataproteino.sql");
const DRY_RUN        = process.argv.includes("--dry-run");

function loadEnv() {
  const p = resolve(".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 0 || line.startsWith("#")) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[key] = val;
  }
}
loadEnv();

// ── SQL parser (from migrate-mysql.ts) ────────────────────────────────────

type SqlValue = string | number | null;

function parseString(sql: string, from: number): { value: string; next: number } {
  let i = from + 1, out = "";
  while (i < sql.length) {
    const c = sql[i];
    if (c === "\\") {
      const n = sql[i + 1];
      out += n === "n" ? "\n" : n === "r" ? "\r" : n === "t" ? "\t" : n;
      i += 2; continue;
    }
    if (c === "'") return { value: out, next: i + 1 };
    out += c; i++;
  }
  throw new Error("Unterminated string");
}

function parseValuesRows(sql: string, from: number, to: number): SqlValue[][] {
  const rows: SqlValue[][] = [];
  let i = from;
  while (i < to) {
    while (i < to && /[\s,;]/.test(sql[i])) i++;
    if (i >= to || sql[i] !== "(") break;
    i++;
    const row: SqlValue[] = [];
    while (i < to) {
      while (i < to && /\s/.test(sql[i])) i++;
      if (sql[i] === ")") { i++; break; }
      if (sql[i] === "'") {
        const { value, next } = parseString(sql, i);
        row.push(value); i = next;
      } else {
        let j = i;
        while (j < to && !/[,)\s]/.test(sql[j])) j++;
        const tok = sql.slice(i, j).trim();
        row.push(tok === "NULL" ? null : /^-?\d+(\.\d+)?$/.test(tok) ? Number(tok) : tok);
        i = j;
      }
      while (i < to && /\s/.test(sql[i])) i++;
      if (sql[i] === ",") { i++; continue; }
      if (sql[i] === ")") { i++; break; }
    }
    rows.push(row);
  }
  return rows;
}

function extractTable(sql: string, tableName: string): SqlValue[][] {
  const pat = new RegExp(`INSERT INTO \`${tableName}\`[^V]+VALUES\\s*`, "g");
  const all: SqlValue[][] = [];
  let m: RegExpExecArray | null;
  while ((m = pat.exec(sql)) !== null) {
    const start = m.index + m[0].length;
    let end = start, depth = 0, inStr = false;
    for (let i = start; i < sql.length; i++) {
      const c = sql[i];
      if (inStr) { if (c === "\\") { i++; continue; } if (c === "'") inStr = false; continue; }
      if (c === "'") { inStr = true; continue; }
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (c === ";" && depth === 0) { end = i; break; }
    }
    all.push(...parseValuesRows(sql, start, end));
  }
  return all;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function contentHash(parts: (string | null)[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no writes" : "🚀 Recovering George's suggestions...");

  const sql = readFileSync(DUMP_PATH, "utf8");

  // Parse K2 items where created_by = 898
  const itemRows = extractTable(sql, "e4q1j_k2_items");
  const georgeItems = itemRows
    .filter(r => r[12] === GEORGE_K2_ID && r[4] === 1) // created_by=898, published=1
    .map(r => ({
      k2_id:     r[0] as number,
      title:     (r[1] as string)?.trim() ?? "",
      alias:     (r[2] as string) ?? "",
      introtext: (r[5] as string) ?? "",
      fulltext:  (r[6] as string) ?? "",
      created:   r[11] as string | null,
    }))
    .filter(r => r.title);

  console.log(`Found ${georgeItems.length} published K2 items by George (id=898)`);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // For each item, find its Supabase UUID via metadata->legacy_alias
  let matched = 0, skipped = 0, inserted = 0, errors = 0;

  for (const item of georgeItems) {
    // Look up by legacy_alias stored during migration
    const { data: found } = await sb
      .from("items")
      .select("id, title, slug")
      .eq("metadata->>legacy_alias", item.alias || item.title)
      .maybeSingle() as { data: { id: string; title: string; slug: string } | null };

    if (!found) {
      console.log(`  ⚠ No Supabase item for alias="${item.alias}" title="${item.title.slice(0, 40)}"`);
      skipped++;
      continue;
    }

    matched++;
    const reflection = stripHtml(item.introtext) || stripHtml(item.fulltext) || null;
    const hash = contentHash([GNASIS_UUID, found.id, reflection, item.created]);

    // Check if suggestion already exists
    const { data: existing } = await sb
      .from("suggestions")
      .select("id")
      .eq("user_id", GNASIS_UUID)
      .eq("item_id", found.id)
      .maybeSingle();

    if (existing) {
      console.log(`  ↩ Already exists: ${found.title.slice(0, 40)}`);
      skipped++;
      continue;
    }

    console.log(`  ✓ ${found.slug} — "${reflection?.slice(0, 60) ?? "(no text)"}"`);

    if (DRY_RUN) { inserted++; continue; }

    const { error } = await sb.from("suggestions").insert({
      user_id:      GNASIS_UUID,
      item_id:      found.id,
      reflection,
      rating:       null,
      content_hash: hash,
      is_published: true,
      created_at:   item.created ? new Date(item.created).toISOString() : new Date().toISOString(),
      published_at: item.created ? new Date(item.created).toISOString() : new Date().toISOString(),
      modified_at:  item.created ? new Date(item.created).toISOString() : new Date().toISOString(),
    });

    if (error) {
      console.error(`  ✖ ${found.slug}: ${error.message}`);
      errors++;
    } else {
      inserted++;
    }
  }

  // Update suggestion_count on gnasis user
  if (!DRY_RUN && inserted > 0) {
    await sb.from("users").update({ suggestion_count: inserted }).eq("id", GNASIS_UUID);
  }

  console.log(`\n📊 Results: ${matched} matched, ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
}

main().catch(console.error);
