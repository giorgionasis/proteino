import { createAdminClient } from "@/lib/supabase/admin";

// Gemini Flash-Lite per-token pricing (USD per 1M tokens)
const PRICE_INPUT_PER_M  = 0.04;
const PRICE_OUTPUT_PER_M = 0.16;

interface UsageRow {
  task: string;
  model: string;
  query_text: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  cache_hit: boolean;
  created_at: string;
}

interface Aggregate {
  totalCalls: number;
  cacheHits: number;
  apiCalls: number; // = totalCalls - cacheHits
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

function aggregate(rows: UsageRow[]): Aggregate {
  const totalCalls = rows.length;
  const cacheHits = rows.filter((r) => r.cache_hit).length;
  const apiCalls = totalCalls - cacheHits;
  const inputTokens = rows.reduce((s, r) => s + (r.input_tokens ?? 0), 0);
  const outputTokens = rows.reduce((s, r) => s + (r.output_tokens ?? 0), 0);
  const costUsd =
    (inputTokens * PRICE_INPUT_PER_M) / 1_000_000 +
    (outputTokens * PRICE_OUTPUT_PER_M) / 1_000_000;
  const lats = rows.filter((r) => r.latency_ms != null).map((r) => r.latency_ms as number);
  const avgLatencyMs = lats.length > 0 ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
  return { totalCalls, cacheHits, apiCalls, inputTokens, outputTokens, costUsd, avgLatencyMs };
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function AIUsagePage() {
  const sb = createAdminClient();
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Try fetching usage rows. If the table doesn't exist (migration 019
  // not applied), show a friendly setup message instead of an error.
  let tableExists = true;
  let dayRows: UsageRow[] = [];
  let weekRows: UsageRow[] = [];
  let monthRows: UsageRow[] = [];
  let recentRows: UsageRow[] = [];
  let topQueries: { query_text: string; calls: number; tokens: number; cost: number }[] = [];

  try {
    const [day, week, month, recent] = await Promise.all([
      sb.from("ai_usage_log").select("*").gte("created_at", dayAgo).order("created_at", { ascending: false }),
      sb.from("ai_usage_log").select("*").gte("created_at", weekAgo),
      sb.from("ai_usage_log").select("*").gte("created_at", monthAgo),
      sb.from("ai_usage_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if ((day.error as any)?.code === "42P01" || (day.error as any)?.code === "PGRST205") {
      tableExists = false;
    } else {
      dayRows = (day.data ?? []) as unknown as UsageRow[];
      weekRows = (week.data ?? []) as unknown as UsageRow[];
      monthRows = (month.data ?? []) as unknown as UsageRow[];
      recentRows = (recent.data ?? []) as unknown as UsageRow[];

      // Top queries by total cost (month window)
      const map = new Map<string, { calls: number; tokens: number; cost: number }>();
      for (const r of monthRows) {
        const key = r.query_text ?? "(no text)";
        const tok = (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
        const cost =
          ((r.input_tokens ?? 0) * PRICE_INPUT_PER_M) / 1_000_000 +
          ((r.output_tokens ?? 0) * PRICE_OUTPUT_PER_M) / 1_000_000;
        const entry = map.get(key) ?? { calls: 0, tokens: 0, cost: 0 };
        entry.calls += 1;
        entry.tokens += tok;
        entry.cost += cost;
        map.set(key, entry);
      }
      topQueries = Array.from(map.entries())
        .map(([query_text, v]) => ({ query_text, ...v }))
        .sort((a, b) => b.cost - a.cost || b.calls - a.calls)
        .slice(0, 10);
    }
  } catch {
    tableExists = false;
  }

  if (!tableExists) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-zinc-900">AI Usage</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Costs, latency and cache hit rate for the Gemini integration.
        </p>
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="text-sm font-bold text-amber-900">Migration 019 not yet applied</div>
          <div className="mt-1.5 text-sm text-amber-800">
            The <code className="text-xs bg-white px-1.5 py-0.5 rounded">ai_query_cache</code> and <code className="text-xs bg-white px-1.5 py-0.5 rounded">ai_usage_log</code> tables don&apos;t exist yet. Open Supabase SQL Editor and paste the contents of <code className="text-xs bg-white px-1.5 py-0.5 rounded">scripts/sql/019-ai-cache-and-usage.sql</code> to create them. Refresh after running.
          </div>
          <p className="mt-3 text-xs text-amber-700">
            The Gemini integration still works without these tables — they only enable caching and this dashboard. Calls go straight to the LLM (no cache, no usage tracking).
          </p>
        </div>
      </div>
    );
  }

  const day = aggregate(dayRows);
  const week = aggregate(weekRows);
  const month = aggregate(monthRows);

  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">AI Usage</h1>
          <p className="mt-1 text-sm text-zinc-600">Gemini Flash-Lite — search + submission extraction</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Last 24h" agg={day} />
        <StatCard label="Last 7 days" agg={week} highlight />
        <StatCard label="Last 30 days" agg={month} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-bold text-zinc-900">Top queries (30d)</h2>
          <p className="text-xs text-zinc-500 mt-0.5">By cumulative cost · top 10</p>
          <table className="w-full text-xs mt-3">
            <thead className="text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="text-left font-medium py-1.5">Query</th>
                <th className="text-right font-medium py-1.5 w-12">Calls</th>
                <th className="text-right font-medium py-1.5 w-16">Tokens</th>
                <th className="text-right font-medium py-1.5 w-16">Cost</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-zinc-400">No data yet</td></tr>
              )}
              {topQueries.map((q) => (
                <tr key={q.query_text} className="border-b border-zinc-50">
                  <td className="py-1.5 truncate max-w-[200px] font-mono text-[11px]" title={q.query_text}>
                    {q.query_text}
                  </td>
                  <td className="text-right py-1.5">{q.calls}</td>
                  <td className="text-right py-1.5">{formatNumber(q.tokens)}</td>
                  <td className="text-right py-1.5">{formatCost(q.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-bold text-zinc-900">Recent calls</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Last 50 · live order</p>
          <div className="mt-3 max-h-[440px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 border-b border-zinc-100 sticky top-0 bg-white">
                <tr>
                  <th className="text-left font-medium py-1.5">Query</th>
                  <th className="text-left font-medium py-1.5 w-12">Task</th>
                  <th className="text-right font-medium py-1.5 w-12">ms</th>
                  <th className="text-right font-medium py-1.5 w-12">Cache</th>
                  <th className="text-right font-medium py-1.5 w-14">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-zinc-400">No data yet</td></tr>
                )}
                {recentRows.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-50">
                    <td className="py-1.5 truncate max-w-[160px] font-mono text-[11px]" title={r.query_text ?? ""}>
                      {r.query_text ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="py-1.5 text-zinc-600">{r.task}</td>
                    <td className="text-right py-1.5">{r.latency_ms ?? "—"}</td>
                    <td className="text-right py-1.5">
                      {r.cache_hit ? (
                        <span className="inline-block px-1.5 py-0 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">HIT</span>
                      ) : (
                        <span className="inline-block px-1.5 py-0 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600">miss</span>
                      )}
                    </td>
                    <td className="text-right py-1.5 text-zinc-500">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, agg, highlight }: { label: string; agg: Aggregate; highlight?: boolean }) {
  const cacheRate = agg.totalCalls === 0 ? 0 : Math.round((agg.cacheHits / agg.totalCalls) * 100);
  return (
    <div className={`rounded-lg border ${highlight ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"} p-5`}>
      <div className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-zinc-300" : "text-zinc-500"}`}>{label}</div>
      <div className="text-3xl font-extrabold mt-1.5">{formatCost(agg.costUsd)}</div>
      <div className={`text-xs mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 ${highlight ? "text-zinc-300" : "text-zinc-600"}`}>
        <div>Calls<br /><span className={`text-sm font-bold ${highlight ? "text-white" : "text-zinc-900"}`}>{formatNumber(agg.totalCalls)}</span></div>
        <div>Cache hit<br /><span className={`text-sm font-bold ${highlight ? "text-white" : "text-zinc-900"}`}>{cacheRate}%</span></div>
        <div>Tokens in<br /><span className={`text-sm font-bold ${highlight ? "text-white" : "text-zinc-900"}`}>{formatNumber(agg.inputTokens)}</span></div>
        <div>Tokens out<br /><span className={`text-sm font-bold ${highlight ? "text-white" : "text-zinc-900"}`}>{formatNumber(agg.outputTokens)}</span></div>
        <div className="col-span-2">Avg latency<br /><span className={`text-sm font-bold ${highlight ? "text-white" : "text-zinc-900"}`}>{agg.avgLatencyMs}ms</span></div>
      </div>
    </div>
  );
}
