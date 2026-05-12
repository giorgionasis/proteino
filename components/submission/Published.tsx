"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Share2 } from "lucide-react";
import { AchievementProgress } from "./AchievementProgress";
import { AchievementUnlockedModal } from "./AchievementUnlockedModal";
import type { AchievementData } from "@/hooks/useSubmission";

interface PublishedProps {
  onDismiss: () => void;
  /** User's suggestion_count after this publish. Drives the achievement block. */
  newSuggestionCount?: number;
  /** Milestone crossing for this publish (null when not crossed). Layered
   *  modal celebration above the Published screen. */
  achievement?: AchievementData | null;
  /** Public URL of the new item — drives the Share CTA inside the
   *  achievement modal. */
  shareUrl?:    string;
}

export function Published({ onDismiss, newSuggestionCount, achievement, shareUrl }: PublishedProps) {
  // Open the achievement modal on mount when a milestone was crossed.
  // We don't open it instantly via the `open` prop because the
  // Published screen is itself sliding in — letting the user see the
  // ✓ for a beat before the modal pops makes the celebration land
  // better than stacking the two animations on top of each other.
  const [achOpen, setAchOpen] = useState(false);
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(() => setAchOpen(true), 350);
    return () => clearTimeout(t);
  }, [achievement]);

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Proteino",
          text: "Δες την πρότασή μου στο Proteino",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      /* user dismissed the share sheet — no-op */
    }
  };

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
        <Button variant="secondary" className="flex-1 gap-2" onClick={handleShare}>
          <Share2 size={16} />
          Κοινοποίηση
        </Button>
        <Button onClick={onDismiss} className="flex-1">
          Κλείσιμο
        </Button>
      </div>

      {/* Achievement modal — slides up on top of the Published screen
       *  when a milestone was crossed. Closing returns the user here;
       *  they can hit Κλείσιμο at their leisure. The Share button on
       *  the Published screen above already covers the share action,
       *  so the modal stays focused on the celebration itself. */}
      <AchievementUnlockedModal
        open={achOpen}
        achievement={achievement ?? null}
        onClose={() => setAchOpen(false)}
      />
    </div>
  );
}
