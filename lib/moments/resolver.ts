import { createAdminClient } from "@/lib/supabase/admin";
import { runPredicate } from "./registry";
import { renderTemplate } from "./render";
import type {
  MomentContext,
  MomentRow,
  MomentTrigger,
  ResolvedMoment,
} from "./types";

/**
 * Resolve moments for an event.
 *
 * Server-only. Pulls active moments matching the trigger, evaluates
 * each row's predicate against the context, picks one per
 * variant_group, sorts by priority DESC, and returns them with copy
 * already interpolated. Caller decides what to do with the result
 * (typically: return the first match to the client, or stream all of
 * them for surfaces that stack).
 *
 * Returns `[]` on any DB error so a misconfigured DB never blocks the
 * underlying user action (publishing a suggestion, saving a bookmark).
 *
 * @param trigger - the event name (must match the CHECK constraint on
 *                  moments.trigger_event).
 * @param ctx     - event context. Caller pre-computes payload + user +
 *                  vars (see buildVars in ./render).
 * @param opts    - { recordEvent: false } skips writing to moment_events
 *                  (useful when previewing in admin).
 */
export async function resolveMoments(
  trigger: MomentTrigger,
  ctx:     MomentContext,
  opts:    { recordEvent?: boolean } = { recordEvent: true },
): Promise<ResolvedMoment[]> {
  const admin = createAdminClient();
  const now   = new Date().toISOString();

  const { data, error } = await admin
    .from("moments")
    .select("*")
    .eq("trigger_event", trigger)
    .eq("is_active", true)
    .or(`valid_from.is.null,valid_from.lte.${now}`)
    .or(`valid_until.is.null,valid_until.gte.${now}`);

  if (error) {
    console.error(`[moments] load failed for trigger="${trigger}":`, error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as MomentRow[];

  // Evaluate predicates in parallel — most are pure CPU, the rest hit
  // the DB independently so contention is fine.
  const matched: MomentRow[] = [];
  await Promise.all(
    rows.map(async (row) => {
      const ok = await runPredicate(row.predicate_key, ctx, row.predicate_args ?? {});
      if (ok) matched.push(row);
    }),
  );

  if (matched.length === 0) return [];

  // Group by variant_group → pick one per group weighted by priority.
  // null/empty variant_group = its own group (every row passes through).
  const groups = new Map<string, MomentRow[]>();
  for (const m of matched) {
    const key = m.variant_group || `__solo__${m.id}`;
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }

  const picked: MomentRow[] = [];
  const groupArrays: MomentRow[][] = Array.from(groups.values());
  for (const arr of groupArrays) {
    if (arr.length === 1) {
      picked.push(arr[0]);
      continue;
    }
    // Weighted random by priority. Priorities are integer (default 100);
    // a row with priority 200 fires twice as often as a sibling with 100.
    const totalWeight = arr.reduce(
      (sum: number, r: MomentRow) => sum + Math.max(1, r.priority),
      0,
    );
    let n = Math.random() * totalWeight;
    let chosen = arr[arr.length - 1];
    for (const r of arr) {
      n -= Math.max(1, r.priority);
      if (n <= 0) { chosen = r; break; }
    }
    picked.push(chosen);
  }

  // Sort by priority DESC so the caller can take [0] for single-surface
  // moments without thinking.
  picked.sort((a, b) => b.priority - a.priority);

  // Interpolate copy + shape the result.
  const resolved: ResolvedMoment[] = picked.map((row) => ({
    id:      row.id,
    key:     row.key,
    surface: row.surface,
    copy: {
      title:      renderTemplate(row.copy?.title    ?? "", ctx),
      subtitle:   renderTemplate(row.copy?.subtitle ?? "", ctx),
      body:       renderTemplate(row.copy?.body     ?? "", ctx),
      cta_label:  row.copy?.cta_label ? renderTemplate(row.copy.cta_label, ctx) : undefined,
      cta_href:   row.copy?.cta_href  ? renderTemplate(row.copy.cta_href,  ctx) : undefined,
    },
    display: row.display ?? {},
  }));

  // Fire-and-forget event audit (won't block the response).
  if (opts.recordEvent !== false && resolved.length > 0) {
    const rows = resolved.map((r) => ({
      moment_id: r.id,
      user_id:   ctx.user.id,
      payload:   ctx.payload,
    }));
    admin.from("moment_events").insert(rows as any).then(({ error }) => {
      if (error) console.error("[moments] event audit insert failed:", error.message);
    });
  }

  return resolved;
}

/**
 * Convenience for the common case: caller wants the single
 * highest-priority moment for one surface.
 */
export async function resolveOneMoment(
  trigger: MomentTrigger,
  surface: ResolvedMoment["surface"],
  ctx:     MomentContext,
  opts?:   { recordEvent?: boolean },
): Promise<ResolvedMoment | null> {
  const list = await resolveMoments(trigger, ctx, opts);
  return list.find((m) => m.surface === surface) ?? null;
}
