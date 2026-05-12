"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

/**
 * Notifications settings — redesigned in session 21 to match the
 * actual fan-out categories from migration 029.
 *
 * Four categories instead of the old placeholder 3-section/2-row grid:
 *   • Activity      — things that happen TO your content
 *   • Friends       — things people you follow do
 *   • Discoveries   — smart picks (movies tonight, search matches…)
 *   • System        — weekly digest, announcements
 *
 * Plus two top-level controls:
 *   • Master pause  — silence everything (optional auto-resume date)
 *   • Quiet hours   — no push during the picked window
 *
 * Server gate `should_notify(user_id, category)` reads `users.preferences.notifications`
 * and checks the master + category state. Push delivery isn't wired yet
 * (no FCM/WebPush infra) — toggle controls in-app + future channels.
 */

type CategoryKey = "activity" | "friends" | "discoveries" | "system";

interface ChannelPrefs {
  push:  boolean;
  email: boolean;
}

interface MasterPrefs {
  paused:       boolean;
  paused_until: string | null;
}

interface QuietHoursPrefs {
  enabled: boolean;
  start:   string;  // "HH:MM"
  end:     string;
}

interface NotificationPreferences {
  _master:      MasterPrefs;
  _quiet_hours: QuietHoursPrefs;
  activity:     ChannelPrefs;
  friends:      ChannelPrefs;
  discoveries:  ChannelPrefs;
  system:       ChannelPrefs;
}

const DEFAULTS: NotificationPreferences = {
  _master:      { paused: false, paused_until: null },
  _quiet_hours: { enabled: true, start: "23:00", end: "09:00" },
  activity:     { push: true,  email: false },
  friends:      { push: true,  email: false },
  discoveries:  { push: true,  email: true  },
  system:       { push: false, email: true  },
};

interface CategoryRow {
  key:         CategoryKey;
  icon:        React.ReactNode;
  title:       string;
  description: string;
  examples:    string;  // one-line preview of what fires
}

const CATEGORIES: CategoryRow[] = [
  {
    key: "activity",
    icon: <PenIcon />,
    title: "Δραστηριότητα στις προτάσεις σου",
    description: "Όταν κάποιος αλληλεπιδρά με ό,τι έχεις προτείνει.",
    examples: "π.χ. βαθμολόγηση, follow, milestone bookmark",
  },
  {
    key: "friends",
    icon: <FriendsIcon />,
    title: "Δραστηριότητα φίλων",
    description: "Όταν κάποιος που ακολουθείς κάνει κάτι νέο στην πλατφόρμα.",
    examples: "π.χ. νέα πρόταση, νέο rating από φίλο",
  },
  {
    key: "discoveries",
    icon: <SparkleIcon />,
    title: "Έξυπνες υπενθυμίσεις",
    description: "Πράγματα που μπορεί να θες να ξέρεις την ώρα που συμβαίνουν.",
    examples: "π.χ. ταινία που έχεις bookmark παίζει σήμερα στην TV",
  },
  {
    key: "system",
    icon: <DigestIcon />,
    title: "Σύστημα & weekly digest",
    description: "Ενημερωτικά μηνύματα και εβδομαδιαία σύνοψη της δραστηριότητάς σου.",
    examples: "π.χ. \"5 νέες προτάσεις στις κατηγορίες σου αυτή την εβδομάδα\"",
  },
];

export function NotificationsSettings() {
  const router = useRouter();
  const [prefs, setPrefs]     = useState<NotificationPreferences>(DEFAULTS);
  const [loaded, setLoaded]   = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer        = useRef<number | null>(null);
  const savedHideTimer   = useRef<number | null>(null);

  // Fetch saved prefs on mount. Merge over defaults so partial /
  // legacy shapes degrade gracefully.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/preferences");
        const data = await res.json();
        if (cancelled) return;
        const saved = data?.preferences?.notifications as Partial<NotificationPreferences> | undefined;
        if (saved) {
          setPrefs((prev) => mergePrefs(prev, saved));
        }
      } catch { /* fall through to defaults */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced save (600ms quiet). Surfaces tri-state save indicator.
  function scheduleSave(next: NotificationPreferences) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (savedHideTimer.current) window.clearTimeout(savedHideTimer.current);
    setSaveState("saving");
    saveTimer.current = window.setTimeout(async () => {
      try {
        await fetch("/api/profile/preferences", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ notifications: next }),
        });
        setSaveState("saved");
        savedHideTimer.current = window.setTimeout(() => setSaveState("idle"), 1800);
      } catch {
        setSaveState("idle");
      }
    }, 600);
  }

  function updateCategory(cat: CategoryKey, channel: keyof ChannelPrefs) {
    setPrefs((prev) => {
      const next = { ...prev, [cat]: { ...prev[cat], [channel]: !prev[cat][channel] } };
      if (loaded) scheduleSave(next);
      return next;
    });
  }

  function updateMasterPaused(paused: boolean) {
    setPrefs((prev) => {
      const next: NotificationPreferences = {
        ...prev,
        _master: {
          paused,
          // Clear auto-resume date when un-pausing; keep when pausing.
          paused_until: paused ? prev._master.paused_until : null,
        },
      };
      if (loaded) scheduleSave(next);
      return next;
    });
  }

  function updatePausedUntil(value: string) {
    setPrefs((prev) => {
      const next: NotificationPreferences = {
        ...prev,
        _master: { paused: true, paused_until: value || null },
      };
      if (loaded) scheduleSave(next);
      return next;
    });
  }

  function updateQuietHours(patch: Partial<QuietHoursPrefs>) {
    setPrefs((prev) => {
      const next: NotificationPreferences = {
        ...prev,
        _quiet_hours: { ...prev._quiet_hours, ...patch },
      };
      if (loaded) scheduleSave(next);
      return next;
    });
  }

  return (
    <div className="pb-12">
      <InnerHeader title="Ειδοποιήσεις" onBack={() => router.back()} />

      <div className="px-5 pt-8 space-y-10">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <WaveIcon />
              <p className="text-[22px] font-bold text-zinc-800 leading-[130%] truncate">Πως να σε ειδοποιούμε</p>
            </div>
            <SaveIndicator state={saveState} />
          </div>
          <p className="text-[15px] text-zinc-600 leading-[150%]">
            Διάλεξε ποιες ειδοποιήσεις θες και πώς. Αλλάζουν δυναμικά — θα δεις τα νέα ρυθμίσεις άμεσα.
          </p>
        </div>

        {/* Master pause */}
        <MasterMutePanel
          master={prefs._master}
          onTogglePaused={updateMasterPaused}
          onSetPausedUntil={updatePausedUntil}
        />

        {/* Quiet hours */}
        <QuietHoursPanel
          quietHours={prefs._quiet_hours}
          onChange={updateQuietHours}
        />

        {/* Category toggles */}
        <div className="space-y-4">
          <p className="text-[16px] font-bold text-zinc-800">Κατηγορίες</p>
          <div className="space-y-3">
            {CATEGORIES.map((c) => (
              <CategoryCard
                key={c.key}
                row={c}
                prefs={prefs[c.key]}
                disabled={prefs._master.paused}
                onToggle={(channel) => updateCategory(c.key, channel)}
              />
            ))}
          </div>
        </div>

        {/* Channel legend */}
        <p className="text-[12px] text-zinc-400 leading-snug">
          Push: εμφανίζεται μέσα στην εφαρμογή (καμπανάκι). Email: αποστολή στο email σου όταν το επιτρέπεις — η αποστολή ενεργοποιείται με την ολοκλήρωση του δικτύου mailing (η ρύθμιση σώζεται από τώρα).
        </p>
      </div>
    </div>
  );
}

// ── Panels ────────────────────────────────────────────────────────────

function MasterMutePanel({
  master, onTogglePaused, onSetPausedUntil,
}: {
  master: MasterPrefs;
  onTogglePaused: (paused: boolean) => void;
  onSetPausedUntil: (iso: string) => void;
}) {
  const isAutoResume = master.paused && master.paused_until;
  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[15px] font-semibold text-zinc-800">Παύση όλων</p>
          <p className="text-[12px] text-zinc-500">
            {master.paused
              ? (isAutoResume
                  ? `Σε παύση μέχρι ${formatPausedUntil(master.paused_until)}`
                  : "Σε παύση — δεν λαμβάνεις τίποτα")
              : "Όλες οι κατηγορίες αποθηκεύονται κανονικά"}
          </p>
        </div>
        <Switch checked={master.paused} onChange={onTogglePaused} />
      </div>
      {master.paused && (
        <label className="block">
          <span className="block text-[12px] font-medium text-zinc-600 mb-1.5">
            Επανέναρξη αυτόματα την (προαιρετικά)
          </span>
          <input
            type="datetime-local"
            value={(master.paused_until ?? "").slice(0, 16)}
            onChange={(e) => onSetPausedUntil(e.target.value)}
            className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-[14px] focus:outline-none focus:border-coral-600 transition-colors"
          />
        </label>
      )}
    </section>
  );
}

function QuietHoursPanel({
  quietHours, onChange,
}: {
  quietHours: QuietHoursPrefs;
  onChange: (patch: Partial<QuietHoursPrefs>) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[15px] font-semibold text-zinc-800">Ώρες ησυχίας</p>
          <p className="text-[12px] text-zinc-500">
            {quietHours.enabled
              ? `Δεν λαμβάνεις push από ${quietHours.start} έως ${quietHours.end}`
              : "Όλες οι ώρες ενεργές"}
          </p>
        </div>
        <Switch checked={quietHours.enabled} onChange={(v) => onChange({ enabled: v })} />
      </div>
      {quietHours.enabled && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[12px] font-medium text-zinc-600 mb-1">Από</span>
            <input
              type="time"
              value={quietHours.start}
              onChange={(e) => onChange({ start: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-[14px] focus:outline-none focus:border-coral-600 transition-colors"
            />
          </label>
          <label className="block">
            <span className="block text-[12px] font-medium text-zinc-600 mb-1">Έως</span>
            <input
              type="time"
              value={quietHours.end}
              onChange={(e) => onChange({ end: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border border-zinc-200 bg-white text-[14px] focus:outline-none focus:border-coral-600 transition-colors"
            />
          </label>
        </div>
      )}
    </section>
  );
}

function CategoryCard({
  row, prefs, disabled, onToggle,
}: {
  row: CategoryRow;
  prefs: ChannelPrefs;
  disabled: boolean;
  onToggle: (channel: keyof ChannelPrefs) => void;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-4 transition-opacity ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{row.icon}</div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[16px] font-bold text-zinc-800">{row.title}</p>
          <p className="text-[13px] text-zinc-600 leading-[150%]">{row.description}</p>
          <p className="text-[12px] text-zinc-400 italic">{row.examples}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ChannelToggle label="Push"  checked={prefs.push}  onChange={() => onToggle("push")}  />
        <ChannelToggle label="Email" checked={prefs.email} onChange={() => onToggle("email")} />
      </div>
    </div>
  );
}

function ChannelToggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center justify-between gap-2 h-11 px-3 rounded-lg border transition-colors active:opacity-70 ${
        checked
          ? "bg-coral-50 border-coral-600 text-coral-700"
          : "bg-white border-zinc-200 text-zinc-600"
      }`}
      aria-pressed={checked}
    >
      <span className="text-[14px] font-semibold">{label}</span>
      <span
        className={`w-5 h-5 rounded flex items-center justify-center ${
          checked ? "bg-coral-600" : "border-1.5 border-zinc-400 bg-white"
        }`}
        style={!checked ? { border: "1.5px solid #A1A1AA" } : undefined}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
            <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
        checked ? "bg-coral-600" : "bg-zinc-300"
      }`}
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return <span className="w-[100px]" aria-hidden />;
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 text-[12px] font-medium transition-opacity duration-200 ${
        state === "saved" ? "text-emerald-600 opacity-100" : "text-zinc-400 opacity-100"
      }`}
      aria-live="polite"
    >
      {state === "saved" ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Αποθηκεύτηκε
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
            <path d="M3 12a9 9 0 019-9" strokeLinecap="round" />
          </svg>
          Αποθήκευση...
        </>
      )}
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function mergePrefs(base: NotificationPreferences, saved: any): NotificationPreferences {
  const out: NotificationPreferences = JSON.parse(JSON.stringify(base));
  if (!saved || typeof saved !== "object") return out;
  if (saved._master)      out._master      = { ...out._master, ...saved._master };
  if (saved._quiet_hours) out._quiet_hours = { ...out._quiet_hours, ...saved._quiet_hours };
  for (const k of ["activity", "friends", "discoveries", "system"] as CategoryKey[]) {
    if (saved[k]) out[k] = { ...out[k], ...saved[k] };
  }
  return out;
}

function formatPausedUntil(iso: string | null): string {
  if (!iso) return "αόριστα";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "αόριστα";
  return d.toLocaleString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Icons ─────────────────────────────────────────────────────────────

function WaveIcon() {
  return <div className="w-8 h-8 flex items-center justify-center text-2xl" aria-hidden>👋</div>;
}

function PenIcon() {
  return <div className="w-9 h-9 rounded-full bg-coral-50 flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M13 2a1.8 1.8 0 012.5 2.5L6 14H3v-3L13 2Z" stroke="#FE6F5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
}

function FriendsIcon() {
  return <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center"><svg width="20" height="18" viewBox="0 0 21 20" fill="none" aria-hidden><path d="M14 3c1.7 0 3 1.3 3 3s-1.3 3-3 3M17 17c1 0 3-.5 3-2.5S18 12 16 12" stroke="#16CAA1" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="6" r="3" stroke="#16CAA1" strokeWidth="1.5"/><path d="M2 17c0-3 2.7-5 6-5s6 2 6 5" stroke="#16CAA1" strokeWidth="1.5" strokeLinecap="round"/></svg></div>;
}

function SparkleIcon() {
  return <div className="w-9 h-9 rounded-full bg-coral-50 flex items-center justify-center"><svg width="20" height="18" viewBox="0 0 23 20" fill="none" aria-hidden><path d="M11.5 1l2.5 7H21l-5.6 4.1 2.1 6.9-6-4.3-6 4.3 2.1-6.9L2 8H9z" stroke="#FE6F5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>;
}

function DigestIcon() {
  return <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 4h16v16H4z"/><path d="M4 9h16"/><path d="M9 4v16"/></svg></div>;
}
