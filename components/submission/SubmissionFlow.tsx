"use client";

import { useSubmission } from "@/hooks/useSubmission";
import { ProteínoIntelligence } from "@/components/ai/ProteínoIntelligence";
import { Button } from "@/components/ui/Button";
import { Syncing } from "./Syncing";
import { Preview } from "./Preview";
import { Published } from "./Published";
import { Mic, Link2, List, Camera } from "lucide-react";

export function SubmissionFlow() {
  const { state, text, analysis, setText, verify, publish, reset } = useSubmission();

  if (state === "syncing")   return <Syncing />;
  if (state === "preview")   return <Preview analysis={analysis} onPublish={publish} onEdit={reset} />;
  if (state === "published") return <Published onDismiss={reset} />;

  const aiState =
    state === "empty"       ? "idle"
    : state === "typing"    ? "listening"
    : state === "match_found" ? "matched"
    : "idle";

  return (
    <div className="flex flex-col h-screen px-4 pt-6 pb-8 gap-4">
      <h1 className="text-lg font-medium text-gray-900">Nova Πρόταση</h1>

      {/* Main input */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={state === "match_found"}
        placeholder="Describe, scan, or paste a link..."
        rows={4}
        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-card text-sm placeholder:text-gray-400 outline-none focus:border-coral-600 focus:bg-white resize-none transition-all disabled:opacity-60"
      />

      {/* Input mode shortcuts */}
      <div className="flex gap-2">
        {[
          { Icon: Camera, label: "Scan" },
          { Icon: Link2,  label: "Link" },
          { Icon: List,   label: "List" },
          { Icon: Mic,    label: "Voice" },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 bg-gray-50 rounded-card border border-gray-200 text-gray-500"
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="text-[9px] tracking-wide uppercase">{label}</span>
          </button>
        ))}
      </div>

      {/* AI panel */}
      <ProteínoIntelligence analysis={analysis} state={aiState} />

      {/* CTA */}
      {state === "match_found" && (
        <Button onClick={verify} className="w-full mt-auto" size="lg">
          Επαλήθευσε →
        </Button>
      )}
    </div>
  );
}
