"use client";

import { Button } from "@/components/ui/Button";
import { Share2 } from "lucide-react";
import { AchievementProgress } from "./AchievementProgress";

interface PublishedProps {
  onDismiss: () => void;
  /** User's suggestion_count after this publish. Drives the achievement block. */
  newSuggestionCount?: number;
}

export function Published({ onDismiss, newSuggestionCount }: PublishedProps) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 py-10">
      {/* Animated checkmark */}
      <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
        <span className="text-4xl animate-bounce">✓</span>
      </div>

      <div className="text-center space-y-2">
        <p className="text-[11px] text-gray-500 tracking-widest uppercase">Δημοσιεύτηκε</p>
        <h1 className="text-2xl font-medium text-white">PUBLISHED</h1>
        <p className="text-sm text-gray-400">Η πρότασή σου είναι ζωντανή!</p>
      </div>

      {typeof newSuggestionCount === "number" && newSuggestionCount > 0 && (
        <AchievementProgress suggestionCount={newSuggestionCount} />
      )}

      <div className="flex gap-3 w-full max-w-xs">
        <Button variant="secondary" className="flex-1 gap-2">
          <Share2 size={16} />
          Κοινοποίηση
        </Button>
        <Button onClick={onDismiss} className="flex-1">
          Κλείσιμο
        </Button>
      </div>
    </div>
  );
}
