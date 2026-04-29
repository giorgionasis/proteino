"use client";

import { cn } from "@/lib/utils/cn";
import { ProgressBar } from "./ProgressBar";
import type { SubmissionAnalysis } from "@/types";

interface ProteínoIntelligenceProps {
  analysis: SubmissionAnalysis | null;
  state: "idle" | "listening" | "matched" | "syncing";
  className?: string;
}

export function ProteínoIntelligence({ analysis, state, className }: ProteínoIntelligenceProps) {
  return (
    <div
      className={cn(
        "rounded-card border p-4 space-y-2.5",
        state === "idle"      && "border-gray-200 bg-gray-50",
        state === "listening" && "border-coral-500 bg-coral-50",
        state === "matched"   && "border-success bg-green-50",
        state === "syncing"   && "border-coral-500 bg-coral-50",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-widest uppercase text-gray-500">
          Proteíno Intelligence
        </span>
        {state === "listening" && (
          <span className="text-[10px] font-medium tracking-widest text-coral-600 animate-pulse">
            LISTENING LIVE
          </span>
        )}
        {state === "matched" && (
          <span className="text-[10px] font-medium tracking-widest text-success">
            LOCKED ✓
          </span>
        )}
      </div>

      {analysis && (
        <>
          <ProgressBar progress={analysis.progress} />
          <p className="text-sm text-gray-600">{analysis.message}</p>
          {analysis.matched && analysis.title && (
            <p className="text-sm font-medium text-gray-900">
              MATCH: {analysis.title}{" "}
              <span className="text-coral-600">({analysis.category})</span>
            </p>
          )}
        </>
      )}

      {!analysis && (
        <p className="text-sm text-gray-400">
          {state === "idle" ? "I'm listening..." : "Analyzing..."}
        </p>
      )}
    </div>
  );
}
