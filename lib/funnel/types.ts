/**
 * Submission funnel event types. Mirrored on both client (tracker) +
 * server (API + SQL ingest function).
 */

export type FunnelEventName =
  // State machine transitions
  | "flow_started"
  | "state_enter"
  | "flow_closed"
  | "flow_reset"
  // Decision points
  | "match_locked"
  | "match_rejected"
  | "alternative_chosen"
  | "rating_set"
  | "publish_attempted"
  | "publish_succeeded"
  | "publish_failed"
  | "duplicate_action"
  // AI heartbeat
  | "ai_call_started"
  | "ai_call_finished"
  | "quality_recomputed";

/** State machine states mirrored from useSubmission.ts:SubmissionState
 *  plus our analytics-only synthetic states. */
export type FunnelState =
  | "empty"
  | "typing"
  | "match_found"
  | "syncing"
  | "preview"
  | "published"
  | "duplicate"
  | "error"
  | "abandoned_idle";

export interface FunnelEvent {
  event_name:     FunnelEventName;
  state?:         FunnelState | null;
  fired_at?:      string;                 // ISO; tracker fills in
  payload?:       Record<string, unknown>;
  ai_latency_ms?: number;
}

export interface FunnelSessionInit {
  id:                string;       // uuid generated client-side
  started_at:        string;
  device_kind:       "mobile" | "tablet" | "desktop";
  viewport_width:    number;
  referrer_path:     string;
  user_agent:        string;
  first_submission:  boolean;
}

export interface FunnelTextSnapshot {
  text_sanitized:   string;
  text_length_full: number;
  state_at_capture: string;
}

/** Counters merged into submission_sessions on each batch. Server
 *  takes GREATEST(existing, incoming) for numeric fields and OR for
 *  booleans so re-sent batches can't roll backward. */
export interface FunnelCounters {
  category?:        string;
  text_length_max?: number;
  ai_call_count?:   number;
  match_locked?:    boolean;
  published?:       boolean;
  duplicate_hit?:   boolean;
  error_delta?:     number;   // increment, not max — accumulates
}

export interface FunnelBatchBody {
  session:  FunnelSessionInit;
  events:   FunnelEvent[];
  snapshot?: FunnelTextSnapshot | null;
  counters?: FunnelCounters;
}

export interface FunnelCloseBody {
  final_state: FunnelState;
}
