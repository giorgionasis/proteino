"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { ProgressBar } from "@/components/ai/ProgressBar";
import { ProteínoIntelligence } from "@/components/ai/ProteínoIntelligence";
import { AchievementProgress } from "@/components/submission/AchievementProgress";
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
    </>
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
