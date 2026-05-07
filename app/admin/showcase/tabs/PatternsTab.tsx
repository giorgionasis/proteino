"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

export function PatternsTab() {
  return (
    <>
      <PlaceholderSection
        name="Empty state"
        filePath="multiple (inline)"
        note="Used on /reviews when no reviews exist, on profile bookmarks page, on category list when filters return 0. Needs a single shared primitive."
      />
      <PlaceholderSection
        name="Skeleton loader"
        filePath="components/ui/Skeleton.tsx"
        note="Shimmer placeholder. Currently used only on item gallery — needs broader rollout."
      />
    </>
  );
}

function PlaceholderSection({ name, filePath, note }: { name: string; filePath?: string; note?: string }) {
  return (
    <ShowcaseSection name={name} filePath={filePath} description={note}>
      <Variant label="Pending — Phase 3">
        <div className="text-xs text-zinc-400 italic text-center">
          Στείλε screenshot και κάνω extract σε reusable component
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
