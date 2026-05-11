"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { ProfileCard } from "@/components/profile/ProfileCard";
import { BadgeDisplay } from "@/components/profile/BadgeDisplay";
import { Stats } from "@/components/profile/Stats";
import { CategoryStatCard } from "@/components/profile/CategoryStatCard";
import { ProfileScoreCard } from "@/components/profile/ProfileScoreCard";
import { ProfileVotesCard } from "@/components/profile/ProfileVotesCard";
import { RowMenu } from "@/components/profile/RowMenu";
import { FollowersPopupCentered } from "@/components/profile/FollowersPopupCentered";
import { ProfilePopup } from "@/components/profile/ProfilePopup";
import { BookmarkedCard } from "@/components/profile/bookmarks/BookmarkedCard";
import { OwnSuggestionCard } from "@/components/profile/suggestions/OwnSuggestionCard";
import type { User } from "@/types";

const SAMPLE_USER: User = {
  id: "u-1",
  email: "george@example.com",
  handle: "george",
  display_name: "George Nasis",
  bio: "Συστήνω ταινίες, σειρές και βιβλία. Συνήθως ξενυχτάω για ένα καλό sci-fi.",
  avatar_url: null,
  role: "user",
  gender: null,
  region: "Αθήνα",
  birthday: null,
  points: 1240,
  level: 12,
  suggestion_count: 47,
  rating_count: 213,
  avg_quality_score: 4.7,
  embedding: null,
  is_private: false,
  is_verified: true,
  created_at: "2025-01-01",
  last_login_at: null,
  last_suggestion_at: null,
  last_review_at: null,
};

const SAMPLE_USER_NEW: User = {
  ...SAMPLE_USER,
  id: "u-2",
  display_name: "Maria K.",
  handle: "mariak",
  bio: null,
  level: 1,
  suggestion_count: 1,
  rating_count: 3,
  avg_quality_score: null,
  is_verified: false,
  is_private: false,
};

export function ProfileTab() {
  return (
    <>
      <ProfileCardShowcase />
      <BadgeDisplayShowcase />
      <StatsShowcase />
      <ProfileScoreCardShowcase />
      <ProfileVotesCardShowcase />
      <CategoryStatCardShowcase />
      <RowMenuShowcase />
      <FollowersPopupShowcase />
      <ProfilePopupShowcase />
      <BookmarkedCardShowcase />
      <OwnSuggestionCardShowcase />
    </>
  );
}

function ProfileCardShowcase() {
  return (
    <ShowcaseSection
      name="ProfileCard"
      filePath="components/profile/ProfileCard.tsx"
      description="Hero block at the top of profile pages: avatar + name + handle + bio + 3 inline stats (Προτάσεις / Level / Points) + Follow button (if not own)."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="Own profile (no follow button)">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <ProfileCard user={SAMPLE_USER} isOwn />
        </div>
      </Variant>
      <Variant label="Other user — not following">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <ProfileCard user={SAMPLE_USER} isFollowing={false} onFollow={() => {}} />
        </div>
      </Variant>
      <Variant label="Other user — already following">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <ProfileCard user={SAMPLE_USER} isFollowing onFollow={() => {}} />
        </div>
      </Variant>
      <Variant label="No bio · new user">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <ProfileCard user={SAMPLE_USER_NEW} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function BadgeDisplayShowcase() {
  return (
    <ShowcaseSection
      name="BadgeDisplay"
      filePath="components/profile/BadgeDisplay.tsx"
      description="Badges row on profile — 4 tier badges (Verified / Expert / Gold / Platinum) with gradient fills. Earned badges full-color, unearned faded to 30%."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="All earned">
        <div className="w-[420px] p-6 bg-white rounded-lg border border-zinc-200">
          <BadgeDisplay
            badges={[
              { type: "verified", earned: true },
              { type: "expert", earned: true },
              { type: "gold", earned: true },
              { type: "platinum", earned: true },
            ]}
          />
        </div>
      </Variant>
      <Variant label="Mixed — verified + expert earned">
        <div className="w-[420px] p-6 bg-white rounded-lg border border-zinc-200">
          <BadgeDisplay
            badges={[
              { type: "verified", earned: true },
              { type: "expert", earned: true },
              { type: "gold", earned: false },
              { type: "platinum", earned: false },
            ]}
          />
        </div>
      </Variant>
      <Variant label="None earned (all faded)">
        <div className="w-[420px] p-6 bg-white rounded-lg border border-zinc-200">
          <BadgeDisplay
            badges={[
              { type: "verified", earned: false },
              { type: "expert", earned: false },
              { type: "gold", earned: false },
              { type: "platinum", earned: false },
            ]}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function StatsShowcase() {
  return (
    <ShowcaseSection
      name="Stats"
      filePath="components/profile/Stats.tsx"
      description="Profile stats card — next-badge progress bar + 3-cell strip (Quality / Ratings / Level)."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="Mid-progress (47 suggestions)">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <Stats user={SAMPLE_USER} />
        </div>
      </Variant>
      <Variant label="New user (1 suggestion)">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <Stats user={SAMPLE_USER_NEW} />
        </div>
      </Variant>
      <Variant label="Past all milestones (no progress bar)">
        <div className="w-[360px] bg-white rounded-lg border border-zinc-200">
          <Stats user={{ ...SAMPLE_USER, suggestion_count: 1000, level: 99 }} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ProfileScoreCardShowcase() {
  return (
    <ShowcaseSection
      name="ProfileScoreCard"
      filePath="components/profile/ProfileScoreCard.tsx"
      description="'Συνολική Βαθμολογία' card in the horizontal stats scroller on a user's profile. Big score + leaves icon + underlined link to the full reviews list. Info icon opens a tooltip explaining how the score is computed."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="Healthy score · 213 ratings">
        <div className="bg-white p-4">
          <ProfileScoreCard score={4.56} count={213} href="#" />
        </div>
      </Variant>
      <Variant label="New user — no ratings yet">
        <div className="bg-white p-4">
          <ProfileScoreCard score={0} count={0} href="#" />
        </div>
      </Variant>
      <Variant label="Perfect score" note="5.00 is uncommon — design test">
        <div className="bg-white p-4">
          <ProfileScoreCard score={5} count={3} href="#" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function ProfileVotesCardShowcase() {
  return (
    <ShowcaseSection
      name="ProfileVotesCard"
      filePath="components/profile/ProfileVotesCard.tsx"
      description="'Θετικές ψήφοι' card in the horizontal stats scroller on a user's profile. Sum of vote_up across the user's reviews + thumbs-up icon + underlined link to the reviews list."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="27 positive votes">
        <div className="bg-white p-4">
          <ProfileVotesCard votes={27} href="#" />
        </div>
      </Variant>
      <Variant label="New user · zero votes">
        <div className="bg-white p-4">
          <ProfileVotesCard votes={0} href="#" />
        </div>
      </Variant>
      <Variant label="High-volume user · 1.2k votes">
        <div className="bg-white p-4">
          <ProfileVotesCard votes={1247} href="#" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function CategoryStatCardShowcase() {
  return (
    <ShowcaseSection
      name="CategoryStatCard"
      filePath="components/profile/CategoryStatCard.tsx"
      description="Compact tile shown on the per-category index of own profile suggestions. Big colored circle (or cover thumbnail) + count of suggestions in that category."
      contextLinks={[{ label: "Live (profile suggestions index)", href: "/profile" }]}
    >
      <Variant label="With image">
        <CategoryStatCard
          label="Ταινίες"
          count={12}
          imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=160"
        />
      </Variant>
      <Variant label="With color (no image)">
        <CategoryStatCard label="Σειρές" count={5} bgColor="#1e3a8a" />
      </Variant>
      <Variant label="Long label">
        <CategoryStatCard label="Εστιατόρια" count={23} bgColor="#9a3412" />
      </Variant>
      <Variant label="Single (1)">
        <CategoryStatCard label="Bars" count={1} bgColor="#78350f" />
      </Variant>
    </ShowcaseSection>
  );
}

function RowMenuShowcase() {
  const [log, setLog] = useState<string>("");
  return (
    <ShowcaseSection
      name="RowMenu"
      filePath="components/profile/RowMenu.tsx"
      description="Kebab-menu (⋯) used on every own-content row in profile (suggestions / reviews / bookmarks). Click opens a small popover; Esc or outside-click closes."
      contextLinks={[{ label: "Live (own suggestions row)", href: "/profile" }]}
    >
      <Variant label="View / Edit / Delete">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-zinc-200">
            <span className="text-sm">Inception</span>
            <RowMenu
              items={[
                { label: "Δες την", onClick: () => setLog("View") },
                { label: "Επεξεργασία", onClick: () => setLog("Edit") },
                { label: "Διαγραφή", onClick: () => setLog("Delete"), danger: true },
              ]}
            />
          </div>
          {log && <p className="text-[11px] text-zinc-500">Last action: {log}</p>}
        </div>
      </Variant>
      <Variant label="Single action">
        <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-zinc-200">
          <span className="text-sm">Bookmark item</span>
          <RowMenu items={[{ label: "Αφαίρεση", onClick: () => {}, danger: true }]} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function FollowersPopupShowcase() {
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  return (
    <ShowcaseSection
      name="FollowersPopupCentered"
      filePath="components/profile/FollowersPopupCentered.tsx"
      description="Bottom-sheet modal with Followers / Following tabs, search, and per-row Follow / Αφαίρεση buttons. Currently uses mock data inside the component."
      contextLinks={[{ label: "Live (any profile · click follower count)", href: "/profile" }]}
    >
      <Variant label="Open at Followers tab">
        <button
          onClick={() => setFollowersOpen(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open Followers
        </button>
        {followersOpen && (
          <FollowersPopupCentered initialTab="followers" onClose={() => setFollowersOpen(false)} />
        )}
      </Variant>
      <Variant label="Open at Following tab">
        <button
          onClick={() => setFollowingOpen(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open Following
        </button>
        {followingOpen && (
          <FollowersPopupCentered initialTab="following" onClose={() => setFollowingOpen(false)} />
        )}
      </Variant>
    </ShowcaseSection>
  );
}

function ProfilePopupShowcase() {
  const [openA, setOpenA] = useState(false);
  const [openB, setOpenB] = useState(false);
  const [openC, setOpenC] = useState(false);
  return (
    <ShowcaseSection
      name="ProfilePopup"
      filePath="components/profile/ProfilePopup.tsx"
      description="Quick-look user card opened from review-card avatars / leaderboard rows. Bottom-sheet style with avatar, badge, stats column, and a Follow CTA."
      contextLinks={[{ label: "Live (any review-card avatar)", href: "/books/agries-anemones" }]}
    >
      <Variant label="With badge + category breakdown">
        <button
          onClick={() => setOpenA(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open popup
        </button>
        <ProfilePopup
          open={openA}
          onClose={() => setOpenA(false)}
          user={{
            id: "1",
            handle: "george",
            display_name: "George Nasis",
            avatar_url: null,
            suggestion_count: 47,
            avg_rating: 4.71,
            badge: "Expert",
            category_count: 12,
            category_label: "ΤΑΙΝΙΕΣ",
          }}
        />
      </Variant>
      <Variant label="No badge (new user)">
        <button
          onClick={() => setOpenB(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open popup
        </button>
        <ProfilePopup
          open={openB}
          onClose={() => setOpenB(false)}
          user={{
            id: "2",
            handle: "mariak",
            display_name: "Maria K.",
            avatar_url: null,
            suggestion_count: 3,
            avg_rating: 4.0,
          }}
        />
      </Variant>
      <Variant label="Gold badge">
        <button
          onClick={() => setOpenC(true)}
          className="px-4 h-10 rounded-full bg-zinc-900 text-white text-sm font-semibold"
        >
          Open popup
        </button>
        <ProfilePopup
          open={openC}
          onClose={() => setOpenC(false)}
          user={{
            id: "3",
            handle: "kassi",
            display_name: "Kassi",
            avatar_url: null,
            suggestion_count: 152,
            avg_rating: 4.92,
            badge: "Gold",
          }}
        />
      </Variant>
    </ShowcaseSection>
  );
}

function BookmarkedCardShowcase() {
  return (
    <ShowcaseSection
      name="BookmarkedCard"
      filePath="components/profile/bookmarks/BookmarkedCard.tsx"
      description="Card shown in the profile Bookmarks list. 3 internal states: front (default) → confirming (red trash sheet) → removed (unmounts). Uses its own state machine; click Αφαίρεση to walk through it."
      contextLinks={[{ label: "Live (profile bookmarks page)", href: "/profile" }]}
    >
      <Variant label="Default — click Αφαίρεση to confirm">
        <div className="w-[300px]">
          <BookmarkedCard
            id="b1"
            title="Inception"
            rating={4.74}
            reviewCount={123}
            imageSrc="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            avatarSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
          />
        </div>
      </Variant>
      <Variant label="Different item">
        <div className="w-[300px]">
          <BookmarkedCard
            id="b2"
            title="Anora"
            rating={4.5}
            reviewCount={42}
            imageSrc="https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=400"
            avatarSrc="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200"
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function OwnSuggestionCardShowcase() {
  return (
    <ShowcaseSection
      name="OwnSuggestionCard"
      filePath="components/profile/suggestions/OwnSuggestionCard.tsx"
      description="Big own-suggestion card on the profile suggestions index. Click διαγραφή to walk through 3 states: front → confirming → success. Επεξεργασία calls onEdit."
      contextLinks={[{ label: "Live (profile suggestions per-category)", href: "/profile" }]}
    >
      <Variant label="Default state">
        <div className="w-[320px]">
          <OwnSuggestionCard
            imageSrc="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            title="Inception"
            rating={4.7}
            reviewCount={123}
            onEdit={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Top rated badge">
        <div className="w-[320px]">
          <OwnSuggestionCard
            imageSrc="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            title="Oppenheimer"
            rating={4.92}
            reviewCount={203}
            isTopRated
            onEdit={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Processing edit (banner visible)">
        <div className="w-[320px]">
          <OwnSuggestionCard
            imageSrc="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400"
            title="Ozark"
            rating={4.5}
            reviewCount={67}
            isProcessing
            onEdit={() => {}}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
