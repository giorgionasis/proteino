"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { ReportLink } from "@/components/report/ReportLink";

export function LayoutTab() {
  return (
    <>
      <HeaderShowcase />
      <BottomNavShowcase />
      <FABShowcase />
      <MaintenanceBannerShowcase />
      <FullScreenOverlayShowcase />
      <ReportLinkShowcase />
    </>
  );
}

function HeaderShowcase() {
  return (
    <ShowcaseSection
      name="Header"
      filePath="components/layout/Header.tsx"
      description="App-wide sticky header — Proteino• logo (left) + bell icon with optional notification badge for registered users (right). Guest variant has logo only. Shadow under for separation. Sticky top-0 z-30."
      contextLinks={[
        { label: "Live (registered)", href: "/" },
        { label: "Live (guest)", href: "/login" },
      ]}
    >
      <Variant
        label="Sticky chrome — see live"
        note="Renders fixed-position via ClientAwareHeader; can't preview standalone."
      >
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Pinned at top of every (main) layout page. Tap the live link →
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function BottomNavShowcase() {
  return (
    <ShowcaseSection
      name="BottomNav"
      filePath="components/layout/BottomNav.tsx"
      description="Bottom 3-tab nav (HOME · SEARCH · YOU). Fixed bottom-0 z-40, max-w-[390px] centered. SEARCH is a button that opens the search overlay (not a route); YOU shows the user avatar (with initials fallback) when logged in."
      contextLinks={[{ label: "Live (any /main page)", href: "/" }]}
    >
      <Variant
        label="Sticky chrome — see live"
        note="Renders fixed-bottom and reads usePathname / useOverlay. Can't preview standalone."
      >
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Always visible on every (main) layout page. Tap the live link →
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FABShowcase() {
  return (
    <ShowcaseSection
      name="FAB"
      filePath="components/ui/FAB.tsx"
      description="Floating action button — coral gradient 56px circle, fixed bottom-right, opens the suggestion overlay. Auto-hides when any overlay is already open. Uses useOverlay() so can't render standalone outside an OverlayManager context."
      contextLinks={[{ label: "Live (Home / category / detail / profile)", href: "/" }]}
    >
      <Variant
        label="Static visual approximation"
        note="The real FAB depends on useOverlay() and bottom-nav offsets — see the live page for actual behavior."
      >
        <div className="relative w-[260px] h-[140px] bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden">
          <div className="absolute right-4 bottom-4 w-14 h-14 rounded-full gradient-coral text-white shadow-fab flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div className="absolute left-3 bottom-3 text-[11px] text-zinc-400">simulated · not interactive</div>
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function MaintenanceBannerShowcase() {
  return (
    <ShowcaseSection
      name="MaintenanceBanner"
      filePath="components/layout/MaintenanceBanner.tsx"
      description="Site-wide amber banner shown above the header when admin sets `maintenance_mode = true` in app_settings. Returns null when message is empty (never an empty banner)."
      contextLinks={[{ label: "Toggle in admin settings", href: "/admin/settings" }]}
    >
      <Variant label="With message">
        <div className="w-[400px]">
          <MaintenanceBanner message="Συντήρηση: η αναζήτηση μπορεί να αργεί τα επόμενα 30 λεπτά." />
        </div>
      </Variant>
      <Variant label="Long message">
        <div className="w-[400px]">
          <MaintenanceBanner message="Πραγματοποιούμε προγραμματισμένη αναβάθμιση του recommendation engine. Δοκίμασε ξανά σε 1 ώρα." />
        </div>
      </Variant>
      <Variant label="Empty message (no render)">
        <div className="text-xs text-zinc-400 italic text-center">
          (message=&apos;&apos; → no render)
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FullScreenOverlayShowcase() {
  return (
    <ShowcaseSection
      name="FullScreenOverlay"
      filePath="components/layout/FullScreenOverlay.tsx"
      description="Generic fixed inset-0 z-50 overlay primitive — slide-up animation, body-scroll lock while open, Esc to close. Used as the base for SearchOverlay + SuggestionOverlay (which add their own headers + state machines on top)."
      contextLinks={[
        { label: "Live (search overlay — SEARCH tab)", href: "/" },
        { label: "Live (suggestion overlay — FAB)", href: "/" },
      ]}
    >
      <Variant
        label="Used by Search + Suggestion overlays — see live"
        note="The bare primitive is rarely embedded directly; the two real consumers are full UX flows worth seeing in context."
      >
        <div className="text-xs text-zinc-400 italic text-center max-w-[300px]">
          Tap the SEARCH tab or the coral FAB on any (main) page →
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ReportLinkShowcase() {
  const [reported, setReported] = useState(0);
  return (
    <ShowcaseSection
      name="ReportLink"
      filePath="components/report/ReportLink.tsx"
      description="Inline 'αναφορά' link that opens the ReportFlowModal — wraps the modal state for easy embedding on review cards / comment threads. Wired across all 9 detail pages on every review-card footer."
      contextLinks={[{ label: "Live (any review-card footer)", href: "/books/agries-anemones" }]}
    >
      <Variant label="Default αναφορά link">
        <ReportLink targetType="suggestion" targetId="demo-suggestion" />
      </Variant>
      <Variant label="Comment target">
        <ReportLink targetType="comment" targetId="demo-comment" />
      </Variant>
      <Variant label="Custom label + onReported callback">
        <div className="flex flex-col items-center gap-2">
          <ReportLink
            targetType="suggestion"
            targetId="demo-2"
            label="Αναφορά περιεχομένου"
            className="text-[12px] font-semibold text-coral-600 underline"
            onReported={() => setReported((n) => n + 1)}
          />
          {reported > 0 && (
            <span className="text-[11px] text-zinc-500">Reported {reported}× this session</span>
          )}
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
