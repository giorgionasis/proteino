/**
 * Quick raw-dump helper — calls one endpoint and prints untouched JSON.
 *
 *   npx tsx scripts/test-biblionet-raw.ts <method> [k=v ...]
 *   npx tsx scripts/test-biblionet-raw.ts get_contributors title=307727
 *   npx tsx scripts/test-biblionet-raw.ts get_title_subject title=307727
 *
 * Reads .env.local for credentials.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rawCall } from "../lib/enrichment/biblionet";

function loadEnvLocal(): void {
  const envPath = resolve(".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const [method, ...rest] = process.argv.slice(2);
if (!method) {
  console.error("usage: tsx scripts/test-biblionet-raw.ts <method> [k=v ...]");
  process.exit(1);
}

const params: Record<string, string> = {};
for (const kv of rest) {
  const eq = kv.indexOf("=");
  if (eq < 0) continue;
  params[kv.slice(0, eq)] = kv.slice(eq + 1);
}

rawCall(method, params)
  .then((data) => console.log(JSON.stringify(data, null, 2)))
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exit(1);
  });
