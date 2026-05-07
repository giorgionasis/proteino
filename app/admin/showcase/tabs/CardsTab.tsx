"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { ReviewCard } from "@/components/detail/ReviewCard";
import { Icon } from "@/components/ui/Icon";
import { SuggestionCardPortrait } from "@/components/suggestion/SuggestionCardPortrait";
import { SuggestionCardLandscape } from "@/components/suggestion/SuggestionCardLandscape";
import { CarouselSection } from "@/components/suggestion/CarouselSection";
import { RatingBox } from "@/components/detail/RatingBox";
import { SuggesterCard } from "@/components/detail/SuggesterCard";
import { BookmarkIcon } from "@/components/ui/BookmarkIcon";

const SAMPLE_USER = {
  id: "showcase-user",
  display_name: "George Nasis",
  handle: "george",
  avatar_url: null,
  level: 12,
};

const LONG_TEXT =
  "Όταν ξεκίνησα να διαβάζω το πρώτο της βιβλίο, ήδη από τις αρχικές σελίδες κατάλαβα ότι αυτό το κορίτσι έχει ένα λαμπρό μέλλον στη συγγραφή. Καθηλωτική γραφή, ζωντανοί χαρακτήρες, ατμοσφαιρική περιγραφή — αξίζει κάθε λεπτό.";
const SHORT_TEXT = "Τέλειο. Πρέπει να το δεις.";

export function CardsTab() {
  return (
    <>
      <ShowcaseSection
        name="ReviewCard"
        filePath="components/detail/ReviewCard.tsx"
        description="Single review. Used in the detail-page carousel (variant=carousel) and the /reviews list (variant=list). Truncates at 4 lines + Περισσότερα expand. Hides the text block when reflection is empty (rating-only)."
        contextLinks={[
          { label: "Detail page (after a review exists)", href: "/books/agries-anemones" },
          { label: "All reviews list", href: "/books/agries-anemones/reviews" },
        ]}
      >
        <Variant label="Carousel · with text">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v1"
              rating={5}
              text={SHORT_TEXT}
              date="χθες"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Expert"
              likes={17}
              dislikes={3}
            />
          </div>
        </Variant>
        <Variant label="Carousel · long text + Περισσότερα">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v2"
              rating={4}
              text={LONG_TEXT}
              date="2 ημέρες πριν"
              name="Kassi"
              userData={{ display_name: "Kassi", avatar_url: null }}
              badge="Verified"
              likes={5}
              dislikes={0}
            />
          </div>
        </Variant>
        <Variant label="Carousel · rating-only (no text)">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v3"
              rating={3}
              text=""
              date="πριν 1 εβδομάδα"
              name="Anny T."
              userData={{ display_name: "Anny T.", avatar_url: null }}
              badge="Gold"
              likes={0}
              dislikes={0}
            />
          </div>
        </Variant>
        <Variant label="List variant (full width)">
          <div className="w-full max-w-[600px]">
            <ReviewCard
              variant="list"
              id="v4"
              rating={5}
              text={LONG_TEXT}
              date="σήμερα"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Platinum"
              likes={42}
              dislikes={1}
            />
          </div>
        </Variant>
        <Variant label="With user-vote active (👍 coral)" note="myVote=1 → like icon filled & coral">
          <div className="w-[310px]">
            <ReviewCard
              variant="carousel"
              id="v5"
              rating={5}
              text={SHORT_TEXT}
              date="πριν 1 ώρα"
              name={SAMPLE_USER.display_name}
              userData={SAMPLE_USER}
              badge="Expert"
              likes={1}
              dislikes={0}
              myVote={1}
            />
          </div>
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="SuggestionCardPortrait"
        filePath="components/suggestion/SuggestionCardPortrait.tsx"
        description="2:3 cover. Used for movies, series, books. Bottom info area is composed — header / title / subtitle / rating — so each category passes its own vocabulary."
        contextLinks={[
          { label: "Live (movie)", href: "/movies/inception" },
          { label: "Live (series)", href: "/series/californication" },
          { label: "Live (book)", href: "/books/agries-anemones" },
        ]}
      >
        <Variant label="Movie · genre subtitle">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            href="#"
            title="Oppenheimer"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Series · NETFLIX header + seasons">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400"
            href="#"
            header={
              <span className="inline-flex items-center gap-2">
                <Icon name="netflix-wordmark" width={56} height={14} alt="Netflix" />
                <span className="text-[14px] font-medium text-zinc-500">3 Σεζόν</span>
              </span>
            }
            title="Ozark"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Book · year subtitle (no header)">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"
            href="#"
            title="Ακοή"
            subtitle="2023"
            rating={{ score: 4.74, count: 123 }}
          />
        </Variant>
        <Variant label="Top rated overlay">
          <SuggestionCardPortrait
            imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
            href="#"
            title="Oppenheimer"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
            topRated
          />
        </Variant>
        <Variant label="Long title (clamps to 2 lines)">
          <SuggestionCardPortrait
            imageUrl={null}
            href="#"
            title="Ένας πολύ μεγάλος τίτλος βιβλίου που πρέπει να κόψει σε δύο γραμμές"
            subtitle="2023"
            rating={{ score: 4.5, count: 8 }}
          />
        </Variant>
        <Variant label="No image (placeholder bg)">
          <SuggestionCardPortrait imageUrl={null} href="#" title="Χωρίς εικόνα" subtitle="Δράμα" rating={{ score: 4.0, count: 12 }} />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="SuggestionCardLandscape"
        filePath="components/suggestion/SuggestionCardLandscape.tsx"
        description="16:10 image. Used for food, bars, hotels, theater, events, recipes. Image can carry Top rated badge + suggester avatar overlapping bottom-left. Below: optional byline (recipe chef), title, subtitle, rating."
        contextLinks={[
          { label: "Live (hotel)", href: "/hotels" },
          { label: "Live (recipe)", href: "/recipes" },
          { label: "Live (theater)", href: "/theater" },
        ]}
      >
        <Variant label="Hotel · Top rated + suggester avatar">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"
            href="#"
            title="Ξενώνας Καλλίνικος"
            subtitle="Ξενοδοχείο • Λουτρά Πόζαρ"
            rating={{ score: 4.74, count: 123 }}
            topRated
            suggesterAvatarUrl="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
          />
        </Variant>
        <Variant label="Theater · same pattern">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1503095396549-807759245b35?w=600"
            href="#"
            title="Ο τυχαίος θάνατος ενός αναρχικού"
            subtitle="Δράμα"
            rating={{ score: 4.74, count: 123 }}
            topRated
            suggesterAvatarUrl="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120"
          />
        </Variant>
        <Variant label="Recipe · chef byline (no image overlay)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600"
            href="#"
            byline={
              <span className="inline-flex items-center gap-2 text-[14px] font-medium text-zinc-700">
                <span className="w-7 h-7 rounded-full overflow-hidden bg-zinc-300 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=80" alt="" className="w-full h-full object-cover" />
                </span>
                του Πετρετζίκη
              </span>
            }
            title="Red Velvet"
            subtitle="Γλυκά • Κέικ"
            rating={{ score: 4.74, count: 123 }}
            topRated
          />
        </Variant>
        <Variant label="Plain (no overlays, no byline)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
            href="#"
            title="Momo"
            subtitle="Ασιατική • Παγκράτι"
            rating={{ score: 4.5, count: 42 }}
          />
        </Variant>
        <Variant label="Top rated only (no suggester)">
          <SuggestionCardLandscape
            imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
            href="#"
            title="Buena Vista"
            subtitle="Cocktail Bar • Πετράλωνα"
            rating={{ score: 4.81, count: 16 }}
            topRated
          />
        </Variant>
        <Variant label="No image">
          <SuggestionCardLandscape
            imageUrl={null}
            href="#"
            title="Χωρίς εικόνα"
            subtitle="Subtitle line"
            rating={{ score: 3.5, count: 4 }}
          />
        </Variant>
      </ShowcaseSection>

      <ShowcaseSection
        name="CarouselSection"
        filePath="components/suggestion/CarouselSection.tsx"
        description="Section wrapper for a horizontal-scroll carousel: bullet · UPPERCASE title · hairline filler. Used to group portrait OR landscape suggestion cards under a heading."
        contextLinks={[{ label: "Live (home)", href: "/" }]}
      >
        <Variant label="Portrait carousel (3 cards)">
          <div className="-mx-4 w-[640px]">
            <CarouselSection title="Ολοκληρωμένες σειρές">
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400"
                href="#"
                header={
                  <span className="inline-flex items-center gap-2">
                    <Icon name="netflix-wordmark" width={48} height={12} alt="Netflix" />
                    <span className="text-[13px] font-medium text-zinc-500">3 Σεζόν</span>
                  </span>
                }
                title="Ozark"
                subtitle="Δράμα"
                rating={{ score: 4.74, count: 123 }}
              />
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400"
                href="#"
                title="Oppenheimer"
                subtitle="Δράμα"
                rating={{ score: 4.74, count: 123 }}
              />
              <SuggestionCardPortrait
                imageUrl="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"
                href="#"
                title="Ακοή"
                subtitle="2023"
                rating={{ score: 4.5, count: 8 }}
              />
            </CarouselSection>
          </div>
        </Variant>
        <Variant label="Landscape carousel (2 cards)">
          <div className="-mx-4 w-[640px]">
            <CarouselSection title="Νέες συνταγές">
              <SuggestionCardLandscape
                imageUrl="https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600"
                href="#"
                byline={<span className="text-[13px] font-medium text-zinc-700">του Πετρετζίκη</span>}
                title="Red Velvet"
                subtitle="Γλυκά • Κέικ"
                rating={{ score: 4.74, count: 123 }}
                topRated
              />
              <SuggestionCardLandscape
                imageUrl="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600"
                href="#"
                title="Momo"
                subtitle="Ασιατική"
                rating={{ score: 4.5, count: 42 }}
              />
            </CarouselSection>
          </div>
        </Variant>
      </ShowcaseSection>
      <RatingBoxShowcase />
      <SuggesterCardShowcase />
      <BookmarkIconShowcase />
    </>
  );
}

function RatingBoxShowcase() {
  const [r1, setR1] = useState(0);
  const [t1, setT1] = useState("");
  const [r2, setR2] = useState(0);
  const [t2, setT2] = useState("");
  const [r3, setR3] = useState(0);
  const [t3, setT3] = useState("");
  return (
    <ShowcaseSection
      name="RatingBox"
      filePath="components/detail/RatingBox.tsx"
      description="Detail-page rating block: gradient backdrop, big avg, optional Top Rated copy + 3-gold-stars header, 5-bar histogram, and the inline rate-this-item form (stars + optional reflection + save). Pure UI — caller owns state."
      contextLinks={[
        { label: "Live (book detail)", href: "/books/agries-anemones" },
        { label: "Live (food detail with Top Rated)", href: "/food/menta" },
      ]}
    >
      <Variant label="Top Rated · full distribution + form">
        <div className="w-[342px]">
          <RatingBox
            avgRating={4.71}
            ratingDistribution={[
              { stars: 5, pct: 80 },
              { stars: 4, pct: 10 },
              { stars: 3, pct: 0 },
              { stars: 2, pct: 6 },
              { stars: 1, pct: 4 },
            ]}
            isTopRated
            topRatedNoun="Η ταινία"
            question="Με πόσα αστέρια θα βαθμολογούσες τη ταινία;"
            userRating={r1}
            onChangeRating={setR1}
            userText={t1}
            onChangeText={setT1}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Below Top Rated threshold · histogram still visible">
        <div className="w-[342px]">
          <RatingBox
            avgRating={3.97}
            ratingDistribution={[
              { stars: 5, pct: 20 },
              { stars: 4, pct: 50 },
              { stars: 3, pct: 20 },
              { stars: 2, pct: 7 },
              { stars: 1, pct: 3 },
            ]}
            isTopRated={false}
            topRatedNoun="Το βιβλίο"
            question="Με πόσα αστέρια θα βαθμολογούσες το βιβλίο;"
            userRating={r2}
            onChangeRating={setR2}
            userText={t2}
            onChangeText={setT2}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="No reviews yet · histogram hidden, only avg + form">
        <div className="w-[342px]">
          <RatingBox
            avgRating={0}
            ratingDistribution={[
              { stars: 5, pct: 0 },
              { stars: 4, pct: 0 },
              { stars: 3, pct: 0 },
              { stars: 2, pct: 0 },
              { stars: 1, pct: 0 },
            ]}
            isTopRated={false}
            topRatedNoun="Το εστιατόριο"
            question="Με πόσα αστέρια θα βαθμολογούσες το εστιατόριο;"
            userRating={r3}
            onChangeRating={setR3}
            userText={t3}
            onChangeText={setT3}
            onSave={() => {}}
          />
        </div>
      </Variant>
      <Variant label="Display only · form hidden (user has own suggestion shown elsewhere)">
        <div className="w-[342px]">
          <RatingBox
            avgRating={4.5}
            ratingDistribution={[
              { stars: 5, pct: 60 },
              { stars: 4, pct: 30 },
              { stars: 3, pct: 7 },
              { stars: 2, pct: 2 },
              { stars: 1, pct: 1 },
            ]}
            isTopRated
            topRatedNoun="Η συνταγή"
            hideForm
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function SuggesterCardShowcase() {
  return (
    <ShowcaseSection
      name="SuggesterCard"
      filePath="components/detail/SuggesterCard.tsx"
      description="Featured suggester block above the rating box — the original submitter's reflection. NOT a review (no stars, no thumbs, no αναφορά). Truncates around 240 chars + Περισσότερα expand."
      contextLinks={[{ label: "Live above rating box", href: "/books/agries-anemones" }]}
    >
      <Variant label="With long reflection · Περισσότερα expand">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ id: "g", display_name: "George Nasis", handle: "george", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200", level: 12 }}
            badge="Verified"
            date="Φεβ 24"
            reflection="Όταν ξεκίνησα να διαβάζω το πρώτο της βιβλίο, ήδη από τις αρχικές σελίδες κατάλαβα ότι αυτό το κορίτσι έχει ένα λαμπρό μέλλον στη συγγραφή. Δε διαψεύστηκα. Η νέα της ιστορία είναι εξίσου καθηλωτική με την προηγούμενη και αξίζει να τη διαβάσετε."
          />
        </div>
      </Variant>
      <Variant label="Short reflection (no Περισσότερα)">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Anny T.", avatar_url: null }}
            badge="Verified"
            date="πριν 1 εβδομάδα"
            reflection="Καταπληκτικό βιβλίο. Δε σταμάτησα να το διαβάζω από την πρώτη σελίδα μέχρι την τελευταία."
          />
        </div>
      </Variant>
      <Variant label="Expert badge">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Kassi", avatar_url: null }}
            badge="Expert"
            date="πριν 2 μήνες"
            reflection="Έρχεται μια στιγμή που κλείνεις το βιβλίο που κρατάς στα χέρια σου, μένεις ν' αναρωτιέσαι τι ακριβώς διάβασες. Καταπληκτική γραφή."
          />
        </div>
      </Variant>
      <Variant label="No avatar (initial fallback)">
        <div className="w-[420px]">
          <SuggesterCard
            user={{ display_name: "Νίκος Π.", avatar_url: null }}
            badge="Gold"
            date="χθες"
            reflection="Πραγματικά εξαιρετική πρόταση."
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function BookmarkIconShowcase() {
  return (
    <ShowcaseSection
      name="BookmarkIcon"
      filePath="components/ui/BookmarkIcon.tsx"
      description="Outlined bookmark ribbon with optional + sign for the unsaved state. Used in the detail-page header bookmark button."
      contextLinks={[{ label: "Live (detail header)", href: "/books/agries-anemones" }]}
    >
      <Variant label="Unsaved (default — with + sign)">
        <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700">
          <BookmarkIcon />
        </div>
      </Variant>
      <Variant label="Saved (filled, no +)">
        <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-white">
          <BookmarkIcon filled />
        </div>
      </Variant>
      <Variant label="Bigger size override">
        <div className="text-zinc-700">
          <BookmarkIcon size={36} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
