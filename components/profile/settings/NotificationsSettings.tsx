"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

type CheckState = { push: boolean; email: boolean };
type SectionKey = "suggestions_review" | "suggestions_publish" | "friends_review" | "friends_publish" | "personal_review" | "personal_publish";

/** Defaults applied to fresh accounts (and as fallback when migration
 *  022 isn't yet applied — so the page renders something usable
 *  instead of an empty grid). */
const DEFAULTS: Record<SectionKey, CheckState> = {
  suggestions_review:  { push: false, email: false },
  suggestions_publish: { push: true,  email: true  },
  friends_review:      { push: true,  email: false },
  friends_publish:     { push: true,  email: false },
  personal_review:     { push: false, email: false },
  personal_publish:    { push: false, email: false },
};

export function NotificationsSettings() {
  const router = useRouter();
  const [checks, setChecks] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // Fetch saved prefs on mount. Merge over defaults so any new section
  // added in code shows up immediately for users without that key yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/preferences");
        const data = await res.json();
        if (cancelled) return;
        const saved = data?.preferences?.notifications as Partial<Record<SectionKey, CheckState>> | undefined;
        if (saved) {
          setChecks((prev) => ({ ...prev, ...saved }));
        }
      } catch { /* swallow — defaults stand */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Debounced save so toggling multiple boxes in quick succession
  // results in a single PATCH. 600ms quiet period feels intentional —
  // the user sees the toggle flip immediately, the network round-trip
  // happens in the background.
  function scheduleSave(nextChecks: Record<SectionKey, CheckState>) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void fetch("/api/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: nextChecks }),
      });
    }, 600);
  }

  function toggle(key: SectionKey, type: "push" | "email") {
    setChecks((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [type]: !prev[key][type] } };
      if (loaded) scheduleSave(next);
      return next;
    });
  }

  return (
    <div className="pb-12">

      <InnerHeader title="Ειδοποιήσεις" onBack={() => router.back()} />

      <div className="px-5 pt-8 space-y-12">

        {/* Introduction */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <WaveIcon />
            <p className="text-[22px] font-bold text-zinc-800 leading-[130%]">Πως να σε ειδοποιούμε</p>
          </div>
          <p className="text-[16px] font-normal text-zinc-800 leading-[130%]">Θέλουμε να σε ενημερώνουμε για βασικές ενέργειες που σε αφορούν στην πλατφόρμα μας χωρίς να σε κουράζουμε</p>
        </div>

        <div className="h-px bg-zinc-200" />

        {/* Suggestions */}
        <NotifSection
          icon={<PenIcon />}
          title="Προτάσεις"
          description="Μάθε άμεσα την κατάσταση των προτάσεών σου. Ποιός τις αξιολόγησε και πως βαθμολογήθηκαν."
          rows={[
            { label: "Αξιολόγηση της πρότασης σου",       pushKey: "suggestions_review",  emailKey: "suggestions_review"  },
            { label: "Επιτυχής δημοσίευσή της πρότασής σου", pushKey: "suggestions_publish", emailKey: "suggestions_publish" },
          ]}
          checks={checks}
          toggle={toggle}
        />

        <div className="h-px bg-zinc-200" />

        {/* Friends */}
        <NotifSection
          icon={<FriendsIcon />}
          title="Δραστηριότητα Φίλων"
          description="Μάθε άμεσα την κατάσταση των προτάσεών σου. Ποιός τις αξιολόγησε και πως βαθμολογήθηκαν."
          rows={[
            { label: "Αξιολόγηση της πρότασης σου",         pushKey: "friends_review",  emailKey: "friends_review"  },
            { label: "Επιτυχής δημοσίευσή της πρότασής σου", pushKey: "friends_publish", emailKey: "friends_publish" },
          ]}
          checks={checks}
          toggle={toggle}
        />

        <div className="h-px bg-zinc-200" />

        {/* Personalized */}
        <NotifSection
          icon={<SparkleIcon />}
          title="Εξατομικευμένη Εμπειρία"
          description="Μάθε άμεσα την κατάσταση των προτάσεών σου. Ποιός τις αξιολόγησε και πως βαθμολογήθηκαν."
          rows={[
            { label: "Αξιολόγηση της πρότασης σου",         pushKey: "personal_review",  emailKey: "personal_review"  },
            { label: "Επιτυχής δημοσίευσή της πρότασής σου", pushKey: "personal_publish", emailKey: "personal_publish" },
          ]}
          checks={checks}
          toggle={toggle}
        />

      </div>
    </div>
  );
}

function NotifSection({ icon, title, description, rows, checks, toggle }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  rows: { label: string; pushKey: SectionKey; emailKey: SectionKey }[];
  checks: Record<SectionKey, CheckState>;
  toggle: (key: SectionKey, type: "push" | "email") => void;
}) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[22px] font-bold text-zinc-800 leading-[140%]">{title}</p>
        </div>
        <p className="text-[16px] font-normal text-zinc-800 leading-[130%]" style={{ maxWidth: 350 }}>{description}</p>
      </div>

      <div className="relative" style={{ height: 140 }}>
        {/* Column headers */}
        <div className="absolute flex items-center gap-0" style={{ top: 0, right: 0 }}>
          <div className="w-12 text-center">
            <p className="text-[16px] font-normal text-zinc-900 leading-[140%]">Ειδοποιήσεις</p>
          </div>
          <div className="w-12 text-center ml-6">
            <p className="text-[16px] font-normal text-zinc-900 leading-[140%]">Email</p>
          </div>
        </div>
        {/* Rows */}
        {rows.map((row, i) => (
          <div key={i} className="absolute flex items-center justify-between" style={{ top: 36 + i * 48, left: 0, right: 0, width: 350 }}>
            <p className="text-[16px] font-semibold text-zinc-800 leading-[130%]" style={{ maxWidth: 164 }}>{row.label}</p>
            <div className="flex items-center gap-6">
              <CheckboxItem checked={checks[row.pushKey].push}  onChange={() => toggle(row.pushKey,  "push")} />
              <CheckboxItem checked={checks[row.emailKey].email} onChange={() => toggle(row.emailKey, "email")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckboxItem({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="w-12 h-12 flex items-center justify-center active:opacity-70 transition-opacity" aria-pressed={checked}>
      <span className="w-6 h-6 rounded-[4px] flex items-center justify-center"
        style={{ backgroundColor: checked ? "#FE6F5E" : "white", border: checked ? "none" : "1.5px solid #49454F" }}>
        {checked && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
            <path d="M1 4.5L4.5 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function WaveIcon() {
  return <div className="w-8 h-8 flex items-center justify-center text-2xl" aria-hidden>👋</div>;
}

function PenIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden><path d="M13 2a1.8 1.8 0 012.5 2.5L6 14H3v-3L13 2Z" stroke="#FE6F5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function FriendsIcon() {
  return <svg width="21" height="20" viewBox="0 0 21 20" fill="none" aria-hidden><path d="M14 3c1.7 0 3 1.3 3 3s-1.3 3-3 3M17 17c1 0 3-.5 3-2.5S18 12 16 12" stroke="#16CAA1" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="6" r="3" stroke="#16CAA1" strokeWidth="1.5"/><path d="M2 17c0-3 2.7-5 6-5s6 2 6 5" stroke="#16CAA1" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function SparkleIcon() {
  return <svg width="23" height="20" viewBox="0 0 23 20" fill="none" aria-hidden><path d="M11.5 1l2.5 7H21l-5.6 4.1 2.1 6.9-6-4.3-6 4.3 2.1-6.9L2 8H9z" stroke="#FE6F5E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
