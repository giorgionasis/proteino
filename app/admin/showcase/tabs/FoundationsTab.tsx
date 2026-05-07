"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { AllReviewsButton } from "@/components/detail/AllReviewsButton";
import { UserBadge } from "@/components/ui/UserBadge";
import { OutlinedPill } from "@/components/ui/OutlinedPill";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icons";

export function FoundationsTab() {
  return (
    <>
      <ShowcaseSection
        name="UserBadge"
        filePath="components/ui/UserBadge.tsx"
        description="Tier badge for users — derived from level OR explicit kind. Used in review cards, profiles, suggester block."
      >
        <Variant label="Verified (level 1–9)">
          <UserBadge kind="Verified" />
        </Variant>
        <Variant label="Expert (level 10–24)">
          <UserBadge kind="Expert" />
        </Variant>
        <Variant label="Gold (level 25–49)">
          <UserBadge kind="Gold" />
        </Variant>
        <Variant label="Platinum (level 50+)">
          <UserBadge kind="Platinum" />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="OutlinedPill"
        filePath="components/ui/OutlinedPill.tsx"
        description="White-fill pill with outline + arrow. Used for delivery, availability, theater ticket, Public ad CTAs."
      >
        <Variant label="Default">
          <OutlinedPill href="#">Δες το →</OutlinedPill>
        </Variant>
        <Variant label="Long label">
          <OutlinedPill href="#">Παρήγγειλε από το efood</OutlinedPill>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="Icon"
        filePath="components/ui/Icon.tsx"
        description="62 SVGs in 8 categories. Single rendering primitive — explicit width/height."
      >
        <Variant label="Brands (16 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["netflix", "imdb", "rotten-tomatoes", "metacritic", "google", "booking", "efood", "youtube"] as const).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Amenities (19 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["amenity-wifi", "amenity-parking", "amenity-pool", "amenity-breakfast", "amenity-sea-view", "amenity-pet", "amenity-hotel"] as IconName[]).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Awards & badges">
          <div className="flex flex-wrap items-center gap-3">
            {(["oscar-best-picture", "oscar-best-actor", "badge-verified", "badge-gold", "badge-platinum"] as const).map(
              (n) => (
                <Icon key={n} name={n} size={28} />
              )
            )}
          </div>
        </Variant>
        <Variant label="Nutrition (5 total)">
          <div className="flex flex-wrap items-center gap-3">
            {(["vegan", "no-milk", "sugar-free", "ingredients", "steps"] as const).map((n) => (
              <Icon key={n} name={n} size={28} />
            ))}
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="AllReviewsButton"
        filePath="components/detail/AllReviewsButton.tsx"
        description="Outlined CTA below the review carousel — links to /<category>/<id>/reviews."
      >
        <Variant label="0 reviews — hidden">
          <div className="text-xs text-zinc-400 italic">(no render)</div>
        </Variant>
        <Variant label="1 review">
          <div className="w-full max-w-[342px]">
            <AllReviewsButton itemSlug="books/agries-anemones" count={1} />
          </div>
        </Variant>
        <Variant label="Many">
          <div className="w-full max-w-[342px]">
            <AllReviewsButton itemSlug="books/agries-anemones" count={67} />
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}
