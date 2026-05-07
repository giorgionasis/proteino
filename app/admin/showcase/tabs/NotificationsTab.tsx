"use client";

import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";
import { NotificationCard } from "@/components/notifications/NotificationCard";

export function NotificationsTab() {
  return (
    <>
      <ShowcaseSection
        name="NotificationCard — by type"
        filePath="components/notifications/NotificationCard.tsx"
        description="In-app notifications list. 6 types: movie_airing / rating / comment / follow / achievement / suggestion_published. Coral tint + dot for unread."
        contextLinks={[{ label: "Live page", href: "/notifications" }]}
      >
        <Variant label="movie_airing — bookmarked movie tonight">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="movie_airing"
              date="μόλις τώρα"
              unread
              imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=120"
              content={
                <>
                  <strong className="font-bold">📺 Oppenheimer</strong> παίζει στο{" "}
                  <strong className="font-bold">Mega</strong> σήμερα στις 22:00.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="rating — someone rated my suggestion">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="rating"
              date="πριν 12 λεπτά"
              unread
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={
                <>
                  <strong className="font-bold">Maria K.</strong> αξιολόγησε με 5 αστέρια την πρότασή σου{" "}
                  <strong className="font-bold">Inception</strong>
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="comment — someone commented on my suggestion">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="comment"
              date="πριν 2 ώρες"
              unread
              imageUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
              content={
                <>
                  <strong className="font-bold">George Nasis</strong> σχολίασε στην πρότασή σου{" "}
                  <strong className="font-bold">Anora</strong>
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="follow — new follower">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="follow"
              date="χθες"
              imageUrl="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120"
              content={
                <>
                  <strong className="font-bold">Nikos P.</strong> σε ακολούθησε.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="achievement — earned a badge">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="achievement"
              date="πριν 3 μέρες"
              content={
                <>
                  🏆 Κέρδισες τη διάκριση{" "}
                  <strong className="font-bold">Επαληθευμένος χρήστης</strong>!
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="suggestion_published — own suggestion went live">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="suggestion_published"
              date="Φεβ 24"
              imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=120"
              content={
                <>
                  Η πρότασή σου <strong className="font-bold">Άγριες ανεμώνες</strong> έχει δημοσιευτεί.
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="Read state (no coral tint, no dot)">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200">
            <NotificationCard
              type="rating"
              date="πριν 1 εβδομάδα"
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={
                <>
                  <strong className="font-bold">Maria K.</strong> αξιολόγησε με 4 αστέρια την πρότασή σου
                </>
              }
            />
          </div>
        </Variant>
        <Variant label="Stack (mixed types, real list pattern)">
          <div className="w-[420px] bg-white rounded-[12px] overflow-hidden border border-zinc-200 divide-y divide-zinc-100">
            <NotificationCard
              type="rating"
              date="μόλις τώρα"
              unread
              imageUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
              content={<><strong className="font-bold">Maria K.</strong> αξιολόγησε με 5 αστέρια την πρότασή σου</>}
            />
            <NotificationCard
              type="comment"
              date="πριν 1 ώρα"
              unread
              content={<><strong className="font-bold">George N.</strong> σχολίασε στην πρότασή σου</>}
            />
            <NotificationCard
              type="follow"
              date="χθες"
              content={<><strong className="font-bold">Nikos P.</strong> σε ακολούθησε.</>}
            />
            <NotificationCard
              type="achievement"
              date="πριν 3 μέρες"
              content={<>🏆 Κέρδισες τη διάκριση <strong className="font-bold">Έμπειρος χρήστης</strong>!</>}
            />
          </div>
        </Variant>
      </ShowcaseSection>
    </>
  );
}
