"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Link2, List, Mic, X } from "lucide-react";
import { OverlayHeader } from "@/components/layout/Header";
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────

type SuggestionState =
  | "idle"
  | "typing"
  | "locked"
  | "syncing"
  | "preview"
  | "published";

interface MatchResult {
  title:        string;
  category:     string;
  displayLabel: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ANALYZING_MESSAGES = [
  "Keep going, I'm analyzing context...",
  "Detecting category and title...",
  "Matching against community database...",
  "Calculating quality score...",
];

const MOCK_MATCH: MatchResult = {
  title:        "Dune: Part Two",
  category:     "MOVIE",
  displayLabel: "DUNE: PART TWO (MOVIE)",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function WaveformIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2"  y="8"  width="3" height="8"  rx="1.5" />
      <rect x="7"  y="4"  width="3" height="16" rx="1.5" />
      <rect x="12" y="6"  width="3" height="12" rx="1.5" />
      <rect x="17" y="9"  width="3" height="6"  rx="1.5" />
    </svg>
  );
}

// ── Input mode bar ────────────────────────────────────────────────────────────

const MODES = [
  { key: "scan",  label: "Scan",  Icon: Camera },
  { key: "link",  label: "Link",  Icon: Link2  },
  { key: "list",  label: "List",  Icon: List   },
  { key: "voice", label: "",      Icon: Mic    },
] as const;

function InputModes() {
  return (
    <div className="flex gap-2">
      {MODES.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={cn(
            "flex items-center gap-1.5 h-10 rounded-card bg-zinc-100",
            "text-sm font-medium text-zinc-600 transition-colors active:bg-zinc-200",
            key === "voice" ? "w-10 justify-center text-coral-600 bg-coral-50 active:bg-coral-100" : "px-3",
          )}
        >
          <Icon size={15} strokeWidth={2} />
          {label && <span>{label}</span>}
        </button>
      ))}
    </div>
  );
}

// ── Intelligence panel ────────────────────────────────────────────────────────

function IntelligencePanel({
  progress,
  message,
  match,
}: {
  progress: number;
  message:  string;
  match?:   MatchResult | null;
}) {
  return (
    <div className="bg-zinc-900 rounded-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-coral-600 tracking-[0.2em] uppercase">
          Proteino Intelligence
        </span>
        <span className="text-xs text-zinc-500 tabular-nums">{progress}%</span>
      </div>
      <p className="text-sm font-medium text-white leading-snug">{message}</p>
      {match && (
        <div className="flex items-center gap-2 bg-zinc-800 rounded-xs px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-success shrink-0" />
          <span className="text-[10px] font-bold text-white tracking-widest">
            MATCH: {match.displayLabel}
          </span>
        </div>
      )}
      <div className="h-[3px] bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, #FE6F5E, #FF9980)",
          }}
        />
      </div>
    </div>
  );
}

// ── Syncing screen (dark takeover) ────────────────────────────────────────────

function SyncingScreen() {
  const [step, setStep] = useState(0);

  const steps = [
    "Category identified",
    "Match confirmed",
    "Enriching metadata...",
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-8">
      {/* Spinning coral ring */}
      <svg className="w-20 h-20 animate-spin-slow" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="36" stroke="#27272a" strokeWidth="3" />
        <circle
          cx="40" cy="40" r="36"
          stroke="url(#sg)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="226"
          strokeDashoffset="170"
        />
        <defs>
          <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FE6F5E" />
            <stop offset="100%" stopColor="#FF9980" />
          </linearGradient>
        </defs>
      </svg>

      {/* Step checklist */}
      <div className="w-full space-y-3">
        {steps.map((label, i) => {
          const done    = i < step;
          const current = i === step;
          return (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 transition-opacity duration-500",
                i > step && "opacity-25",
              )}
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                  done    ? "bg-success"    :
                  current ? "bg-coral-600"  : "bg-zinc-700",
                )}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                )}
              </span>
              <span className="text-sm font-medium text-white">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Preview screen ────────────────────────────────────────────────────────────

function PreviewScreen({
  query,
  match,
  onShare,
  onEdit,
  onClose,
}: {
  query:   string;
  match:   MatchResult;
  onShare: () => void;
  onEdit:  () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="flex items-center justify-end h-14 px-5 border-b border-zinc-200">
        <button
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors"
        >
          <X size={16} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">Preview Recommendation</h2>
          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
            This is how your suggestion will appear to the community.
          </p>
        </div>

        {/* Preview card */}
        <div className="rounded-2xl border border-zinc-200 overflow-hidden shadow-card">
          {/* Cover */}
          <div className="relative h-44 bg-zinc-100">
            <span className="absolute bottom-3 left-3 bg-coral-600 text-white text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-xs">
              Enriched Match
            </span>
          </div>
          {/* Content */}
          <div className="p-4 space-y-4 bg-white">
            <h3 className="text-xl font-bold text-zinc-800">{match.title}</h3>
            <div className="flex gap-3 items-start">
              <div className="w-9 h-9 rounded-full bg-zinc-100 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-1">
                  Your Reflection
                </p>
                <p className="text-sm text-zinc-600 italic leading-relaxed">
                  &ldquo;{query.length > 80 ? query.slice(0, 80) + "…" : query}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-8 pt-4 border-t border-zinc-100 space-y-3">
        <button
          onClick={onShare}
          className="w-full h-13 rounded-card bg-zinc-900 text-white text-sm font-bold tracking-widest uppercase active:bg-zinc-800 transition-colors"
        >
          Share
        </button>
        <button
          onClick={onEdit}
          className="w-full h-11 text-sm font-semibold text-zinc-400 tracking-widest uppercase active:text-zinc-600 transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Published screen (dark celebration) ───────────────────────────────────────

function PublishedScreen({
  match,
  onDismiss,
  onShareLink,
}: {
  match:       MatchResult;
  onDismiss:   () => void;
  onShareLink: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-zinc-950">
      <div className="flex items-center justify-end h-14 px-5">
        <button
          onClick={onDismiss}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-800 active:bg-zinc-700 transition-colors"
        >
          <X size={16} strokeWidth={2.5} className="text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-8">
        {/* Checkmark circle */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center animate-scale-in shadow-[0_0_60px_rgba(254,111,94,0.4)]"
          style={{ background: "linear-gradient(135deg, #FE6F5E, #FF9980)" }}
        >
          <svg
            width="36" height="36"
            viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black text-white italic tracking-tight">
            PUBLISHED
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Your recommendation for{" "}
            <span className="font-bold text-white">{match.title}</span>
            {" "}is now live in the ecosystem.
          </p>
        </div>
      </div>

      <div className="px-5 pb-10 pt-4 flex gap-3">
        <button
          onClick={onDismiss}
          className="flex-1 h-13 rounded-card bg-zinc-800 text-white text-sm font-bold tracking-widest uppercase active:bg-zinc-700 transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={onShareLink}
          className="flex-1 h-13 rounded-card bg-white text-zinc-900 text-sm font-bold tracking-widest uppercase active:bg-zinc-100 transition-colors"
        >
          Share Link
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SuggestionOverlayProps {
  onClose: () => void;
}

export function SuggestionOverlay({ onClose }: SuggestionOverlayProps) {
  const [state,    setState]    = useState<SuggestionState>("idle");
  const [query,    setQuery]    = useState("");
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [match,    setMatch]    = useState<MatchResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus when overlay opens
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  useEffect(() => () => stopTicker(), [stopTicker]);

  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  // Simulate AI analysis: progress 0→100%, lock at 100%
  const runAnalysis = useCallback((q: string) => {
    stopTicker();
    let p = 0;
    let m = 0;

    setState("typing");
    setProgress(0);
    setMsgIndex(0);
    setMatch(null);

    tickerRef.current = setInterval(() => {
      p += Math.random() * 18 + 6;
      m  = (m + 1) % ANALYZING_MESSAGES.length;

      if (p >= 100) {
        p = 100;
        stopTicker();
        setProgress(100);
        setMatch(MOCK_MATCH);
        setState("locked");
        return;
      }

      setProgress(Math.round(p));
      setMsgIndex(m);
    }, 400);
  }, [stopTicker]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const q = e.target.value;
    setQuery(q);
    setTimeout(resizeTextarea, 0);

    if (!q.trim()) {
      stopTicker();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setState("idle");
      setProgress(0);
      setMatch(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runAnalysis(q), 600);
  };

  const handleVerify = () => {
    if (state !== "locked") return;
    setState("syncing");
    setTimeout(() => setState("preview"), 2600);
  };

  const handleShare     = () => setState("published");
  const handleEdit      = () => { setState("idle"); setMatch(null); setProgress(0); };
  const handleDismiss   = () => onClose();
  const handleShareLink = () => onClose();

  // ── Full-screen takeover states ────────────────────────────────────────────

  if (state === "syncing") {
    return (
      <div className="flex flex-col h-full min-h-screen bg-zinc-950">
        <SyncingScreen />
      </div>
    );
  }

  if (state === "preview") {
    return (
      <PreviewScreen
        query={query}
        match={MOCK_MATCH}
        onShare={handleShare}
        onEdit={handleEdit}
        onClose={onClose}
      />
    );
  }

  if (state === "published") {
    return (
      <PublishedScreen
        match={MOCK_MATCH}
        onDismiss={handleDismiss}
        onShareLink={handleShareLink}
      />
    );
  }

  // ── Input phase: idle / typing / locked ───────────────────────────────────

  const isLocked   = state === "locked";
  const canVerify  = isLocked && match !== null;

  const panelMessage =
    state === "idle"   ? "I'm listening. Tell me what you experienced." :
    state === "locked" ? "Description quality is excellent. Metadata found." :
    ANALYZING_MESSAGES[msgIndex];

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      {/* Header */}
      {isLocked ? (
        <div className="flex items-center justify-between h-14 px-5 border-b border-zinc-200 bg-white">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-coral-600 text-coral-600 text-xs font-bold tracking-widest uppercase">
            Locked
          </span>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors"
          >
            <X size={16} strokeWidth={2.5} className="text-zinc-700" />
          </button>
        </div>
      ) : (
        <OverlayHeader
          label="Listening Live"
          icon={<WaveformIcon />}
          onClose={onClose}
        />
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">
        {/* Query textarea */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={handleChange}
          disabled={isLocked}
          placeholder="Describe, scan, or paste..."
          rows={4}
          className={cn(
            "w-full resize-none overflow-hidden",
            "bg-zinc-50 border border-zinc-200 rounded-card",
            "px-4 py-3.5 text-base font-medium text-zinc-800 placeholder:text-zinc-400",
            "focus:outline-none focus:border-zinc-400 transition-colors",
            "leading-relaxed",
            isLocked && "opacity-60 pointer-events-none",
          )}
        />

        {/* Input modes — idle state only */}
        {state === "idle" && <InputModes />}

        {/* Intelligence panel — always visible in input phase */}
        <IntelligencePanel
          progress={progress}
          message={panelMessage}
          match={match}
        />
      </div>

      {/* VERIFY button — sticky at bottom */}
      <div className="px-5 pb-8 pt-4 border-t border-zinc-100">
        <button
          onClick={handleVerify}
          disabled={!canVerify}
          className={cn(
            "w-full h-13 rounded-card",
            "text-sm font-bold tracking-widest uppercase",
            "transition-all duration-300",
            canVerify
              ? "text-white active:opacity-90"
              : "bg-zinc-100 text-zinc-400 pointer-events-none",
          )}
          style={canVerify
            ? { background: "linear-gradient(to right, #FE6F5E, #FF9980)" }
            : {}
          }
        >
          Verify with AI ›
        </button>
      </div>
    </div>
  );
}
