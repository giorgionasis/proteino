"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { ProgressBar } from "@/components/ai/ProgressBar";
import { ProteínoIntelligence } from "@/components/ai/ProteínoIntelligence";
import { AchievementProgress } from "@/components/submission/AchievementProgress";
import { AchievementUnlockedModal } from "@/components/submission/AchievementUnlockedModal";
import type { AchievementData } from "@/hooks/useSubmission";
import type { SubmissionAnalysis } from "@/types";

const ANALYSIS_LISTENING: SubmissionAnalysis = {
  matched: false,
  title: null,
  category: null,
  confidence: 0.4,
  progress: 60,
  message: "Πες γιατί σου άρεσε για να βρω καλύτερη αντιστοίχιση...",
  matchData: null,
};

const ANALYSIS_MATCHED: SubmissionAnalysis = {
  matched: true,
  title: "Oppenheimer (2023)",
  category: "movies",
  confidence: 1,
  progress: 100,
  message: "Ταυτοποίησα το θέμα — γράψε γιατί σου άρεσε.",
  matchData: { tmdb_id: 872585 },
};

const ANALYSIS_SYNCING: SubmissionAnalysis = {
  matched: true,
  title: "Oppenheimer (2023)",
  category: "movies",
  confidence: 1,
  progress: 95,
  message: "Συγχρονίζω από TMDB...",
  matchData: { tmdb_id: 872585 },
};

export function SubmissionAITab() {
  return (
    <>
      <ProgressBarShowcase />
      <ProteinoIntelligenceShowcase />
      <AchievementProgressShowcase />
      <AchievementUnlockedModalShowcase />
      <ReviewMilestoneModalShowcase />
    </>
  );
}

// ── AchievementUnlockedModal ─────────────────────────────────────────
//
// One click per state — opens the actual modal portal-mounted to body
// so what you see here is byte-for-byte what users see post-submission.
// Synthetic data mirrors the moments-table seed (migration 027) so the
// showcase stays accurate when admins edit copy in /admin/moments — for
// the *live* current state, the admin should preview from there instead.

const TIER_ORDINAL: Record<string, string> = {
  verified: "πρώτο", gold: "δεύτερό", expert: "τρίτο", platinum: "τέταρτο",
};

function makeAchievementData(
  variant: "progress" | "tier_unlock",
  count:   number,
  target:  number,
  badge:   "verified" | "gold" | "expert" | "platinum",
): AchievementData {
  const remaining = Math.max(0, target - count);
  const ordinal   = TIER_ORDINAL[badge];

  let title: string;
  let subtitle: string;
  let body: string;

  if (variant === "tier_unlock") {
    title = "Τα κατάφερες!";
    subtitle = target === 3
      ? "Το πρώτο επίτευγμα είναι δικό σου"
      : `Απέκτησες και ${ordinal} επίτευγμα`;
    body = target === 3
      ? `Ολοκλήρωσες **${count}** προτάσεις και τώρα οι υπόλοιποι γνωρίζουν ότι συμβάλλεις πραγματικά στην κοινότητα του proteino`
      : `Ολοκλήρωσες **${count}** προτάσεις και τώρα οι υπόλοιποι αναγνωρίζουν την αξία σου και τη συνεισφορά σου στην κοινότητα του proteino`;
  } else {
    if (count === 1)                       title = "Μόλις έκανες την πρώτη σου πρόταση!";
    else if (target === 3 && remaining === 1) title = "Καταπληκτική αρχή!";
    else if (remaining === 1)              title = "Είσαι πολύ κοντά!";
    else                                   title = "Τα πας περίφημα!";

    if (remaining === 1) {
      subtitle = `Μένει ακόμη **1** πρόταση και αποκτάς το ${ordinal} σου επίτευγμα`;
    } else if (target === 3) {
      subtitle = `Με ακόμη **${remaining}** προτάσεις αποκτάς το ${ordinal} σου επίτευγμα`;
    } else {
      subtitle = `Με ακόμη **${remaining}** προτάσεις φτάνεις το ${ordinal} σου επίτευγμα`;
    }
    body = "Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα";
  }

  return {
    id:      `showcase-${badge}-${count}`,
    key:     `achievement.${badge}.preview_${count}`,
    surface: "achievement_modal",
    copy:    { title, subtitle, body },
    display: { variant, badge, target, count, delay_ms: 0 },
  };
}

const ACH_STATES: { label: string; data: AchievementData }[] = [
  { label: "#1 — Πρώτη πρόταση",      data: makeAchievementData("progress",    1,  3,  "verified") },
  { label: "#2 — Καταπληκτική αρχή",  data: makeAchievementData("progress",    2,  3,  "verified") },
  { label: "#3 — Verified UNLOCKED",  data: makeAchievementData("tier_unlock", 3,  3,  "verified") },
  { label: "#7 — Τα πας περίφημα",    data: makeAchievementData("progress",    7,  10, "gold"    ) },
  { label: "#9 — Είσαι πολύ κοντά",   data: makeAchievementData("progress",    9,  10, "gold"    ) },
  { label: "#10 — Έμπειρος UNLOCKED", data: makeAchievementData("tier_unlock", 10, 10, "gold"    ) },
  { label: "#22 — Approach Expert",   data: makeAchievementData("progress",    22, 25, "expert"  ) },
  { label: "#25 — Expert UNLOCKED",   data: makeAchievementData("tier_unlock", 25, 25, "expert"  ) },
  { label: "#49 — Πολύ κοντά (Plat.)",data: makeAchievementData("progress",    49, 50, "platinum") },
  { label: "#50 — Platinum UNLOCKED", data: makeAchievementData("tier_unlock", 50, 50, "platinum") },
];

function AchievementUnlockedModalShowcase() {
  const [active, setActive] = useState<AchievementData | null>(null);
  return (
    <ShowcaseSection
      name="AchievementUnlockedModal"
      filePath="components/submission/AchievementUnlockedModal.tsx"
      description="Celebration modal layered over the Published screen on milestone crossings. Click any state to preview the real modal. Server fires at counts 1/2/3 (Verified run), 7/9/10 (Gold), 22/24/25 (Expert), 47/49/50 (Platinum)."
      contextLinks={[
        { label: "/api/suggestions POST", href: "/api/suggestions" },
        { label: "Trigger after a real publish", href: "/" },
      ]}
    >
      <Variant label="All states (interactive)">
        <div className="flex flex-wrap gap-2 max-w-[640px]">
          {ACH_STATES.map((s) => (
            <button
              key={s.label}
              onClick={() => setActive(s.data)}
              className="h-9 px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[12px] font-semibold text-zinc-700 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </Variant>
      <AchievementUnlockedModal
        open={active !== null}
        achievement={active}
        onClose={() => setActive(null)}
      />
    </ShowcaseSection>
  );
}

// ── Review-milestone celebration ──────────────────────────────────────
//
// Same AchievementUnlockedModal, fired from /api/reviews on first-time
// review counts 1/5/10/25/50. Distinct from suggestion milestones —
// the label_line1 / label_line2 overrides on the moment's display
// (admin-editable via /admin/moments) hide the suggestion-tier label
// ("Επαληθευμένος χρήστης") and surface a review-specific label
// instead ("Πρώτη / αξιολόγηση", "Trusted / Reviewer", etc.).
//
// Synthetic data here mirrors migration 036's seed so what you see in
// the showcase matches what users see on the detail page out of the
// box. Admins can edit the live copy via /admin/moments — for the
// current production state, preview from there instead.

function makeReviewMilestoneData(
  count: number,
  badge: "verified" | "gold" | "expert" | "platinum",
  labelLine1: string,
  labelLine2: string,
  title: string,
  subtitle: string,
  body: string,
): AchievementData {
  return {
    id:      `showcase-review-${count}`,
    key:     `achievement.review.preview_${count}`,
    surface: "achievement_modal",
    copy:    { title, subtitle, body },
    display: {
      variant:     "tier_unlock",
      badge,
      target:      count,
      count,
      delay_ms:    0,
      label_line1: labelLine1,
      label_line2: labelLine2,
    },
  };
}

const REVIEW_STATES: { label: string; data: AchievementData }[] = [
  {
    label: "#1 — Πρώτη αξιολόγηση",
    data: makeReviewMilestoneData(
      1, "verified", "Πρώτη", "αξιολόγηση",
      "Πρώτη σου αξιολόγηση!",
      "Καλωσόρισες στους reviewers του proteino",
      "Με τις αξιολογήσεις σου βοηθάς **άλλους χρήστες** να ανακαλύψουν αυτό που αξίζει",
    ),
  },
  {
    label: "#5 — Πέντε αξιολογήσεις",
    data: makeReviewMilestoneData(
      5, "verified", "5", "αξιολογήσεις",
      "Πέντε αξιολογήσεις!",
      "Παίρνεις φόρα — η φωνή σου μετράει",
      "Ολοκλήρωσες **5** αξιολογήσεις και τα μέλη της κοινότητας ξέρουν τη γνώμη σου",
    ),
  },
  {
    label: "#10 — Trusted Reviewer",
    data: makeReviewMilestoneData(
      10, "gold", "Trusted", "Reviewer",
      "Δέκα αξιολογήσεις!",
      "Είσαι πλέον **Trusted Reviewer** στο proteino",
      "Ολοκλήρωσες **10** αξιολογήσεις και οι υπόλοιποι αναγνωρίζουν την κρίση σου",
    ),
  },
  {
    label: "#25 — Expert Reviewer",
    data: makeReviewMilestoneData(
      25, "expert", "Expert", "Reviewer",
      "25 αξιολογήσεις — εντυπωσιακό!",
      "Είσαι από τις δυνατές φωνές της κοινότητας",
      "Με **25** αξιολογήσεις διαμορφώνεις πραγματικά την εμπειρία των άλλων χρηστών",
    ),
  },
  {
    label: "#50 — Top Reviewer",
    data: makeReviewMilestoneData(
      50, "platinum", "Top", "Reviewer",
      "50 αξιολογήσεις!",
      "Είσαι **Top Reviewer** — από τους πιο ενεργούς στο proteino",
      "Με **50** αξιολογήσεις είσαι σταθερή και αξιόπιστη παρουσία στην κοινότητα",
    ),
  },
];

function ReviewMilestoneModalShowcase() {
  const [active, setActive] = useState<AchievementData | null>(null);
  return (
    <ShowcaseSection
      name="AchievementUnlockedModal · Review milestones"
      filePath="components/submission/AchievementUnlockedModal.tsx"
      description="Same modal, fired from /api/reviews after the user's 1st / 5th / 10th / 25th / 50th first-time review. Re-rating an existing item does NOT trigger. Driven by 5 rows in `moments` with trigger_event='review_published' (migration 036) — admins can edit copy + timing in /admin/moments."
      contextLinks={[
        { label: "/admin/moments", href: "/admin/moments" },
        { label: "/api/reviews POST", href: "/api/reviews" },
      ]}
    >
      <Variant label="All review milestones (interactive)">
        <div className="flex flex-wrap gap-2 max-w-[640px]">
          {REVIEW_STATES.map((s) => (
            <button
              key={s.label}
              onClick={() => setActive(s.data)}
              className="h-9 px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-[12px] font-semibold text-zinc-700 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </Variant>
      <AchievementUnlockedModal
        open={active !== null}
        achievement={active}
        onClose={() => setActive(null)}
      />
    </ShowcaseSection>
  );
}

function ProgressBarShowcase() {
  const [v, setV] = useState(45);
  return (
    <ShowcaseSection
      name="ai/ProgressBar"
      filePath="components/ai/ProgressBar.tsx"
      description="Coral-gradient progress bar (0–100). Used by ProteínoIntelligence panel + Stats next-badge bar. Smoothly animates by default."
    >
      <Variant label="0%">
        <div className="w-[300px]">
          <ProgressBar progress={0} />
        </div>
      </Variant>
      <Variant label="45%">
        <div className="w-[300px]">
          <ProgressBar progress={45} />
        </div>
      </Variant>
      <Variant label="100%">
        <div className="w-[300px]">
          <ProgressBar progress={100} />
        </div>
      </Variant>
      <Variant label="Interactive (drag)">
        <div className="w-[300px] flex flex-col gap-3">
          <ProgressBar progress={v} />
          <input
            type="range"
            min={0}
            max={100}
            value={v}
            onChange={(e) => setV(Number(e.target.value))}
            className="w-full"
          />
          <span className="text-[11px] text-zinc-500 text-center">{v}%</span>
        </div>
      </Variant>
      <Variant label="No animation (snaps)">
        <div className="w-[300px]">
          <ProgressBar progress={70} animated={false} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ProteinoIntelligenceShowcase() {
  return (
    <ShowcaseSection
      name="ProteínoIntelligence"
      filePath="components/ai/ProteínoIntelligence.tsx"
      description="The 'Proteíno Intelligence' panel inside the suggestion overlay. Tinted bg + LIVE / LOCKED ✓ status indicator + progress bar + coaching message + match summary. State drives the color: idle (gray) / listening (coral) / matched (green) / syncing (coral)."
      contextLinks={[{ label: "Live (suggestion overlay)", href: "/" }]}
    >
      <Variant label="Idle (no analysis yet)">
        <div className="w-[340px]">
          <ProteínoIntelligence analysis={null} state="idle" />
        </div>
      </Variant>
      <Variant label="Listening (live coaching)">
        <div className="w-[340px]">
          <ProteínoIntelligence analysis={ANALYSIS_LISTENING} state="listening" />
        </div>
      </Variant>
      <Variant label="Matched (LOCKED ✓)">
        <div className="w-[340px]">
          <ProteínoIntelligence analysis={ANALYSIS_MATCHED} state="matched" />
        </div>
      </Variant>
      <Variant label="Syncing (after lock)">
        <div className="w-[340px]">
          <ProteínoIntelligence analysis={ANALYSIS_SYNCING} state="syncing" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function AchievementProgressShowcase() {
  return (
    <ShowcaseSection
      name="AchievementProgress"
      filePath="components/submission/AchievementProgress.tsx"
      description="Card shown on the Published screen after a successful suggestion. Shows progress toward next badge (Verified→Expert→Gold→Platinum) — or a celebratory unlock state when the count hits a milestone exactly. Pure UI, dark-bg adapted."
      contextLinks={[{ label: "Live (after publishing)", href: "/" }]}
    >
      <Variant label="1st suggestion — first taste" dark>
        <AchievementProgress suggestionCount={1} />
      </Variant>
      <Variant label="2nd suggestion — 'Καταπληκτική αρχή!'" dark>
        <AchievementProgress suggestionCount={2} />
      </Variant>
      <Variant label="3rd — UNLOCK Verified 🛡️" dark>
        <AchievementProgress suggestionCount={3} />
      </Variant>
      <Variant label="7th — partway to Expert" dark>
        <AchievementProgress suggestionCount={7} />
      </Variant>
      <Variant label="9th — 'Είσαι πολύ κοντά!'" dark>
        <AchievementProgress suggestionCount={9} />
      </Variant>
      <Variant label="10th — UNLOCK Expert ⭐" dark>
        <AchievementProgress suggestionCount={10} />
      </Variant>
      <Variant label="25th — UNLOCK Gold 🏆" dark>
        <AchievementProgress suggestionCount={25} />
      </Variant>
      <Variant label="50th — UNLOCK Platinum 💎" dark>
        <AchievementProgress suggestionCount={50} />
      </Variant>
    </ShowcaseSection>
  );
}
