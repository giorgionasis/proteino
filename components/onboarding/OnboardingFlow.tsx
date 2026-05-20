"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HookScreen }       from "./HookScreen";
import { InterestsScreen }  from "./InterestsScreen";
import { RewardScreen }     from "./RewardScreen";
import { PeopleScreen }     from "./PeopleScreen";
import { OnboardingSyncing } from "./OnboardingSyncing";

interface Numbers {
  suggestionsInScope: number;
  strongMatches:      number;
  peopleInScope:      number;
  totalSuggestions:   number;
}

/**
 * Step copy is templated — `{N}` placeholders are replaced with live
 * numbers from /api/onboarding/numbers when available. When the fetch
 * is still in flight or fails we fall back to neutral copy (the
 * placeholder is stripped cleanly by OnboardingSyncing).
 */
function buildFinishSteps(n: Numbers | null) {
  return [
    {
      label: n ? "Διαβάσαμε {N} προτάσεις στις κατηγορίες σου"
                : "Διαβάσαμε τις προτάσεις στις κατηγορίες σου",
      n:     n?.suggestionsInScope ?? null,
      ms:    1100,
    },
    {
      label: n ? "Φιλτράραμε {N} με ★ 4+ για σένα"
                : "Φιλτράραμε τις πιο δυνατές για σένα",
      n:     n?.strongMatches ?? null,
      ms:    1200,
    },
    {
      label: n ? "Συνδέουμε σε με {N} χρήστες σαν εσένα"
                : "Συνδέουμε σε με την κοινότητα",
      n:     n?.peopleInScope ?? null,
      ms:    1100,
    },
  ];
}

function buildSkipSteps(n: Numbers | null): SyncStep[] {
  return [
    {
      label: n ? "{N} προτάσεις από την κοινότητα"
                : "Προτάσεις από την κοινότητα",
      n:     n?.totalSuggestions ?? null,
      ms:    900,
    },
    {
      label: "Σε στέλνουμε στην αρχική",
      n:     null,
      ms:    900,
    },
  ];
}

interface SyncStep {
  label: string;
  n:     number | null;
  ms:    number;
}

type Step = "hook" | "interests" | "reward" | "people";

interface Props {
  initialInterests: string[];
  displayName:      string | null;
}

/**
 * OnboardingFlow — 4-step state machine.
 *
 *   hook → interests → reward → people → done (redirect /)
 *
 * `onboarded_at` is stamped only on the FINAL call (skip from hook or
 * finish from people). The intermediate write on step 2 → 3 saves
 * interests only — otherwise a stray re-render hitting /onboarding's
 * server entry would redirect the user out of the flow.
 */
export function OnboardingFlow({ initialInterests, displayName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("hook");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [finishing, setFinishing] = useState<null | "finish" | "skip">(null);
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  // Lock the step list at the moment the syncing screen mounts so the
  // animation doesn't reset mid-sequence when numbers arrive late.
  // We hot-swap individual labels via the `numbers` state but the
  // syncing component reads its steps from a stable ref.
  const lockedStepsRef = useRef<ReturnType<typeof buildFinishSteps> | null>(null);

  const complete = async (payload: { interests?: string[]; final?: boolean; skipped?: boolean }) => {
      try {
        await fetch("/api/onboarding/complete", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
      } catch {
        // Soft-fail — onboarding has already done its job in-session.
      }
    };

  // Fetch the live numbers whenever we enter the syncing state. The
  // fetch races the first step's timer; whichever wins, the UI handles
  // both (neutral copy → swapped to numbered copy as data arrives).
  useEffect(() => {
    if (!finishing) return;
    let cancelled = false;
    const qs = encodeURIComponent(interests.join(","));
    fetch(`/api/onboarding/numbers?categories=${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setNumbers({
          suggestionsInScope: Number(data?.suggestionsInScope) || 0,
          strongMatches:      Number(data?.strongMatches)      || 0,
          peopleInScope:      Number(data?.peopleInScope)      || 0,
          totalSuggestions:   Number(data?.totalSuggestions)   || 0,
        });
      })
      .catch(() => { /* keep neutral copy */ });
    return () => { cancelled = true; };
  }, [finishing, interests]);

  // Step 1 — Hook.
  const handleHookContinue = () => setStep("interests");
  const handleHookSkip = async () => {
    setFinishing("skip");
    void complete({ skipped: true, final: true });
  };

  // Step 2 — Interests.
  const handleInterestsContinue = async (picked: string[]) => {
    setInterests(picked);
    await complete({ interests: picked });
    setStep("reward");
  };
  const handleInterestsBack = () => setStep("hook");

  // Step 3 — Reward.
  const handleRewardContinue = () => setStep("people");
  const handleRewardBack = () => setStep("interests");

  // Step 4 — People.
  const handlePeopleFinish = async () => {
    setFinishing("finish");
    void complete({ interests, final: true });
  };
  const handlePeopleBack = () => setStep("reward");

  if (finishing) {
    const headline = finishing === "finish"
      ? "Ετοιμάζουμε το feed σου"
      : "Είσαι έτοιμος";
    // Build steps each render so numbers hot-swap in as they arrive.
    // OnboardingSyncing locks its sequence timing on mount, so changing
    // labels mid-flight just updates copy without restarting timers.
    const steps = finishing === "finish"
      ? buildFinishSteps(numbers)
      : buildSkipSteps(numbers);
    if (!lockedStepsRef.current) lockedStepsRef.current = steps;
    return (
      <OnboardingSyncing
        headline={headline}
        steps={steps}
        onDone={() => router.replace("/")}
      />
    );
  }

  switch (step) {
    case "hook":
      return (
        <HookScreen
          displayName={displayName}
          onContinue={handleHookContinue}
          onSkip={handleHookSkip}
        />
      );
    case "interests":
      return (
        <InterestsScreen
          initial={interests}
          onContinue={handleInterestsContinue}
          onBack={handleInterestsBack}
        />
      );
    case "reward":
      return (
        <RewardScreen
          interests={interests}
          onContinue={handleRewardContinue}
          onBack={handleRewardBack}
        />
      );
    case "people":
      return (
        <PeopleScreen
          interests={interests}
          onFinish={handlePeopleFinish}
          onBack={handlePeopleBack}
        />
      );
  }
}
