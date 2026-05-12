"use client";

import { sanitizeFunnelText } from "./sanitize";
import type {
  FunnelEvent, FunnelEventName, FunnelState,
  FunnelSessionInit, FunnelTextSnapshot, FunnelCounters,
} from "./types";

/**
 * Client-side singleton tracker for the submission funnel.
 *
 * Lifecycle:
 *   - useSubmission.tsx calls `funnel.start()` when the overlay opens
 *   - calls `funnel.track(eventName, …)` from state-machine transitions
 *   - calls `funnel.close(finalState)` when the overlay dismisses
 *
 * The tracker:
 *   - Generates a fresh session_id at start
 *   - Buffers events in memory (no per-event network)
 *   - Flushes every 2s OR on next event after a state change
 *   - Persists pending events in localStorage so a tab-close-mid-buffer
 *     doesn't lose data (replayed on next start)
 *   - Uses navigator.sendBeacon on close — survives tab close
 *   - Silently no-ops when no session is open (defensive)
 *
 * Storage cost: one fetch every 2s while flow is active, ≤200B/event.
 */

const FLUSH_MS = 2000;
const RETRY_KEY = "funnel:retry-v1";

interface Session {
  init:      FunnelSessionInit;
  events:    FunnelEvent[];
  counters:  FunnelCounters;
  snapshot:  FunnelTextSnapshot | null;
  flushTimer: ReturnType<typeof setTimeout> | null;
  closed:    boolean;
}

let active: Session | null = null;

function uuid(): string {
  // Crypto-secure when available; cheap fallback otherwise.
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640)  return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** Open a new funnel session. Caller's responsibility: only call once
 *  per overlay open. Returns the session id (useful for logs). */
export function start(opts: { firstSubmission?: boolean } = {}): string {
  if (typeof window === "undefined") return "";
  // Defensive: if there's already an open session (consecutive start
  // calls without a close), force-close it.
  if (active && !active.closed) {
    void close("abandoned_idle");
  }

  const id   = uuid();
  const init: FunnelSessionInit = {
    id,
    started_at:       new Date().toISOString(),
    device_kind:      detectDevice(),
    viewport_width:   window.innerWidth,
    referrer_path:    typeof document !== "undefined" ? document.referrer || window.location.pathname : "",
    user_agent:       navigator.userAgent.slice(0, 250),
    first_submission: !!opts.firstSubmission,
  };

  active = {
    init,
    events:    [],
    counters:  {},
    snapshot:  null,
    flushTimer: null,
    closed:    false,
  };

  track("flow_started", { state: "empty" });
  void replayRetryQueue();
  return id;
}

/** Append an event. Auto-flushes after FLUSH_MS, sooner if the buffer
 *  exceeds 25 events. */
export function track(
  eventName: FunnelEventName,
  args: {
    state?:         FunnelState | null;
    payload?:       Record<string, unknown>;
    ai_latency_ms?: number;
    counters?:      FunnelCounters;
  } = {},
): void {
  if (!active || active.closed) return;
  active.events.push({
    event_name:    eventName,
    state:         args.state ?? null,
    fired_at:      new Date().toISOString(),
    payload:       args.payload ?? {},
    ai_latency_ms: args.ai_latency_ms,
  });
  if (args.counters) {
    mergeCounters(active.counters, args.counters);
  }
  scheduleFlush();
}

/** Capture a sanitised text snapshot. Called at most once per state
 *  transition (caller's responsibility — we don't dedupe). */
export function snapshot(text: string, state: FunnelState): void {
  if (!active || active.closed) return;
  active.snapshot = {
    text_sanitized:   sanitizeFunnelText(text),
    text_length_full: text.length,
    state_at_capture: state,
  };
  // Snapshot piggybacks on the next flush — no separate timer.
}

/** Close the session. Uses sendBeacon so it survives a tab close. */
export async function close(finalState: FunnelState): Promise<void> {
  if (!active || active.closed) return;
  const session = active;
  session.closed = true;

  // Send any pending buffered events first (regular fetch).
  await flushNow();

  // Final close beacon — separate endpoint, separate payload.
  const url = "/api/submission-funnel/close";
  const body = JSON.stringify({
    session_id:  session.init.id,
    final_state: finalState,
  });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    } else {
      await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch { /* fail soft — sweep cron will catch it */ }

  active = null;
}

// ─────────────────────────────────────────────────────────────────────

function mergeCounters(into: FunnelCounters, from: FunnelCounters): void {
  if (from.category) into.category = from.category;
  if (from.text_length_max != null) {
    into.text_length_max = Math.max(into.text_length_max ?? 0, from.text_length_max);
  }
  if (from.ai_call_count != null) {
    into.ai_call_count = Math.max(into.ai_call_count ?? 0, from.ai_call_count);
  }
  if (from.match_locked)  into.match_locked  = true;
  if (from.published)     into.published     = true;
  if (from.duplicate_hit) into.duplicate_hit = true;
  if (from.error_delta) {
    into.error_delta = (into.error_delta ?? 0) + from.error_delta;
  }
}

function scheduleFlush(): void {
  if (!active || active.closed) return;
  if (active.flushTimer) return;
  active.flushTimer = setTimeout(() => {
    void flushNow();
  }, FLUSH_MS);

  // Hard cap: 25 buffered events triggers immediate flush.
  if (active.events.length >= 25) {
    void flushNow();
  }
}

async function flushNow(): Promise<void> {
  if (!active) return;
  if (active.flushTimer) {
    clearTimeout(active.flushTimer);
    active.flushTimer = null;
  }
  if (active.events.length === 0 && !active.snapshot && Object.keys(active.counters).length === 0) {
    return;
  }

  const body = JSON.stringify({
    session:  active.init,
    events:   active.events.splice(0),
    snapshot: active.snapshot,
    counters: active.counters,
  });
  // Reset incremental error counter after sending — server treats
  // `error_delta` as an increment.
  active.snapshot = null;
  if (active.counters.error_delta) active.counters.error_delta = 0;

  try {
    const res = await fetch("/api/submission-funnel", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    pushToRetryQueue(body);
  }
}

function pushToRetryQueue(body: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(RETRY_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    arr.push(body);
    // Cap the queue at 20 — if we're failing chronically, no point in
    // hoarding gigabytes.
    while (arr.length > 20) arr.shift();
    localStorage.setItem(RETRY_KEY, JSON.stringify(arr));
  } catch { /* quota / parse errors → drop silently */ }
}

async function replayRetryQueue(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  let arr: string[] = [];
  try {
    const raw = localStorage.getItem(RETRY_KEY);
    arr = raw ? JSON.parse(raw) : [];
  } catch { return; }
  if (arr.length === 0) return;
  localStorage.removeItem(RETRY_KEY);
  for (const body of arr) {
    try {
      await fetch("/api/submission-funnel", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch { pushToRetryQueue(body); }
  }
}
