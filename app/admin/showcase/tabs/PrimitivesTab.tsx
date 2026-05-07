"use client";

import { useState } from "react";
import { Search, Heart, Bell, ArrowRight } from "lucide-react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Badge, ReviewBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { StarRating } from "@/components/ui/StarRating";
import { IconButton } from "@/components/ui/IconButton";
import { FilterChip, FilterChipRow } from "@/components/ui/FilterChip";
import { SortPills } from "@/components/ui/SortPills";
import { Spinner } from "@/components/ui/Spinner";
import { StatCard, InlineStat } from "@/components/ui/StatCard";
import { FollowButton } from "@/components/ui/FollowButton";
import { WantToSeeButton } from "@/components/ui/WantToSeeButton";
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonSuggestion } from "@/components/ui/Skeleton";

export function PrimitivesTab() {
  return (
    <>
      <ButtonShowcase />
      <InputShowcase />
      <TextareaShowcase />
      <CardShowcase />
      <BadgeShowcase />
      <AvatarShowcase />
      <AvatarImageShowcase />
      <StarRatingShowcase />
      <IconButtonShowcase />
      <FilterChipShowcase />
      <SortPillsShowcase />
      <SpinnerShowcase />
      <StatCardShowcase />
      <FollowButtonShowcase />
      <WantToSeeButtonShowcase />
      <SkeletonShowcase />
    </>
  );
}

// ─── Button ───────────────────────────────────────────────────────
function ButtonShowcase() {
  return (
    <ShowcaseSection
      name="Button"
      filePath="components/ui/Button.tsx"
      description="The primary action primitive. 6 variants × 3 sizes + loading + leftIcon/rightIcon + fullWidth."
    >
      <Variant label="Variants — primary / secondary / ghost / danger / black">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="black">Black</Button>
        </div>
      </Variant>
      <Variant label="Dark variant — on dark bg" dark>
        <Button variant="dark">Dark</Button>
      </Variant>
      <Variant label="Sizes — sm / md / lg">
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Variant>
      <Variant label="Loading state">
        <Button loading>Saving</Button>
      </Variant>
      <Variant label="Disabled">
        <Button disabled>Disabled</Button>
      </Variant>
      <Variant label="With icons">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button leftIcon={<Heart size={16} />}>Με icon</Button>
          <Button variant="secondary" rightIcon={<ArrowRight size={16} />}>
            Συνέχεια
          </Button>
        </div>
      </Variant>
      <Variant label="Full width">
        <div className="w-[280px]">
          <Button fullWidth>Συνέχεια</Button>
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Input ────────────────────────────────────────────────────────
function InputShowcase() {
  const [val, setVal] = useState("george@");
  const [searchVal, setSearchVal] = useState("");
  return (
    <ShowcaseSection
      name="Input"
      filePath="components/ui/Input.tsx"
      description="Text input. Default = auth-style (h-14, large). Search variant = h-11 ios-gray. Supports label / hint / error / success / leftIcon / loading / password reveal."
    >
      <Variant label="Default with label">
        <div className="w-[280px]">
          <Input label="Email" placeholder="email@example.com" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
      </Variant>
      <Variant label="Password (eye toggle)">
        <div className="w-[280px]">
          <Input label="Password" type="password" defaultValue="hunter2" />
        </div>
      </Variant>
      <Variant label="Error state">
        <div className="w-[280px]">
          <Input label="Email" defaultValue="not-an-email" error="Δεν είναι έγκυρο email" />
        </div>
      </Variant>
      <Variant label="Success state">
        <div className="w-[280px]">
          <Input label="Username" defaultValue="george" success="Είναι διαθέσιμο" />
        </div>
      </Variant>
      <Variant label="With hint">
        <div className="w-[280px]">
          <Input label="Password" type="password" hint="Τουλάχιστον 8 χαρακτήρες, 1 κεφαλαίο, 1 αριθμός" />
        </div>
      </Variant>
      <Variant label="Search variant (ios-gray)">
        <div className="w-[280px]">
          <Input
            variant="search"
            placeholder="Αναζήτηση..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
      </Variant>
      <Variant label="Loading">
        <div className="w-[280px]">
          <Input label="Username" defaultValue="checking..." loading />
        </div>
      </Variant>
      <Variant label="Disabled">
        <div className="w-[280px]">
          <Input label="Email" defaultValue="locked@example.com" disabled />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────
function TextareaShowcase() {
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("Αυτό μου άρεσε επειδή είχε δυνατούς χαρακτήρες και ωραία ατμόσφαιρα.");
  return (
    <ShowcaseSection
      name="Textarea"
      filePath="components/ui/Textarea.tsx"
      description="Multi-line text. Auto-resize, char counter, error/hint, optional maxLength enforcement."
    >
      <Variant label="Default + placeholder">
        <div className="w-[320px]">
          <Textarea
            placeholder="Πες γιατί σου άρεσε..."
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            rows={3}
          />
        </div>
      </Variant>
      <Variant label="With label + char count + maxLength">
        <div className="w-[320px]">
          <Textarea
            label="Γιατί το προτείνεις;"
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            maxLength={280}
            showCount
            rows={3}
          />
        </div>
      </Variant>
      <Variant label="Error state">
        <div className="w-[320px]">
          <Textarea
            label="Reflection"
            defaultValue="μη"
            error="Πρέπει να είναι τουλάχιστον 10 χαρακτήρες"
            rows={3}
          />
        </div>
      </Variant>
      <Variant label="Auto-resize">
        <div className="w-[320px]">
          <Textarea
            placeholder="Γράψε όσο θέλεις — μεγαλώνει με το κείμενο"
            autoResize
            rows={2}
          />
        </div>
      </Variant>
      <Variant label="Disabled">
        <div className="w-[320px]">
          <Textarea defaultValue="Locked content" disabled rows={3} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Card ─────────────────────────────────────────────────────────
function CardShowcase() {
  return (
    <ShowcaseSection
      name="Card"
      filePath="components/ui/Card.tsx"
      description="Generic card primitive. 4 variants (default outlined, elevated shadow, flat zinc-50, outlined coral). Optional pressable for tap feedback. Composable with CardHeader / CardBody / CardFooter."
    >
      <Variant label="Default (outlined)">
        <Card className="w-[260px]">
          <CardBody>
            <p className="text-sm text-zinc-700">Default card with outline.</p>
          </CardBody>
        </Card>
      </Variant>
      <Variant label="Elevated (shadow)">
        <Card variant="elevated" className="w-[260px]">
          <CardBody>
            <p className="text-sm text-zinc-700">Elevated card with shadow.</p>
          </CardBody>
        </Card>
      </Variant>
      <Variant label="Flat (zinc-50)">
        <Card variant="flat" className="w-[260px]">
          <CardBody>
            <p className="text-sm text-zinc-700">Flat card on zinc-50 fill.</p>
          </CardBody>
        </Card>
      </Variant>
      <Variant label="Outlined (coral)">
        <Card variant="outlined" className="w-[260px]">
          <CardBody>
            <p className="text-sm text-zinc-700">Coral-outlined card — for AI / featured content.</p>
          </CardBody>
        </Card>
      </Variant>
      <Variant label="Pressable (tap to scale)">
        <Card pressable className="w-[260px]">
          <CardBody>
            <p className="text-sm text-zinc-700">Tap me — active:scale-[0.98]</p>
          </CardBody>
        </Card>
      </Variant>
      <Variant label="With Header / Body / Footer">
        <Card className="w-[260px]">
          <CardHeader>
            <p className="text-xs uppercase tracking-wider font-bold text-zinc-500">Header</p>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-700">Body content lives here.</p>
          </CardBody>
          <CardFooter>
            <p className="text-xs text-zinc-500">Footer</p>
          </CardFooter>
        </Card>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Badge ────────────────────────────────────────────────────────
function BadgeShowcase() {
  return (
    <ShowcaseSection
      name="Badge"
      filePath="components/ui/Badge.tsx"
      description="Small status pill. 9 variants × 2 sizes. Optional dot. Plus ReviewBadge (Verified / Expert / Gold) for legacy review-card use."
    >
      <Variant label="Variants (sm)">
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="default">Default</Badge>
          <Badge variant="coral">Coral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="ai">AI</Badge>
          <Badge variant="gold">Gold</Badge>
        </div>
      </Variant>
      <Variant label="Dark variant" dark>
        <Badge variant="dark">Dark</Badge>
      </Variant>
      <Variant label="Size md">
        <Badge variant="coral" size="md">Larger badge</Badge>
      </Variant>
      <Variant label="With status dot">
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="success" dot>Online</Badge>
          <Badge variant="danger" dot>Offline</Badge>
          <Badge variant="warning" dot>Idle</Badge>
        </div>
      </Variant>
      <Variant label="ReviewBadge (legacy review-card style)">
        <div className="flex flex-wrap gap-2 justify-center">
          <ReviewBadge type="verified" />
          <ReviewBadge type="expert" />
          <ReviewBadge type="gold" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────
function AvatarShowcase() {
  return (
    <ShowcaseSection
      name="Avatar"
      filePath="components/ui/Avatar.tsx"
      description="next/image-based avatar. 5 sizes, optional verified badge. Initials fallback when src missing."
    >
      <Variant label="Sizes — xs / sm / md / lg / xl">
        <div className="flex items-end gap-2">
          <Avatar name="George Nasis" size="xs" />
          <Avatar name="George Nasis" size="sm" />
          <Avatar name="George Nasis" size="md" />
          <Avatar name="George Nasis" size="lg" />
          <Avatar name="George Nasis" size="xl" />
        </div>
      </Variant>
      <Variant label="With image">
        <Avatar
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
          name="George"
          size="lg"
        />
      </Variant>
      <Variant label="Verified badge">
        <Avatar name="George Nasis" size="lg" verified />
      </Variant>
      <Variant label="No name (?)">
        <Avatar size="md" />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── AvatarImage ──────────────────────────────────────────────────
function AvatarImageShowcase() {
  return (
    <ShowcaseSection
      name="AvatarImage"
      filePath="components/ui/AvatarImage.tsx"
      description="Plain <img> avatar with deterministic colored-initials fallback (10-color palette, hashed by name). Used in BottomNav and the YOU tab where Google profile pics may fail to load."
      contextLinks={[{ label: "Live (BottomNav YOU tab)", href: "/" }]}
    >
      <Variant label="With URL">
        <AvatarImage url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" name="George" size={64} className="rounded-full" />
      </Variant>
      <Variant label="Initials fallback (no URL)">
        <div className="flex gap-2">
          <AvatarImage name="George Nasis" size={48} className="rounded-full" />
          <AvatarImage name="Maria K." size={48} className="rounded-full" />
          <AvatarImage name="Nikos P." size={48} className="rounded-full" />
          <AvatarImage name="Anny T." size={48} className="rounded-full" />
        </div>
      </Variant>
      <Variant label="Different sizes">
        <div className="flex items-end gap-2">
          <AvatarImage name="George" size={24} className="rounded-full" />
          <AvatarImage name="George" size={40} className="rounded-full" />
          <AvatarImage name="George" size={64} className="rounded-full" />
          <AvatarImage name="George" size={96} className="rounded-full" />
        </div>
      </Variant>
      <Variant label="No name (? placeholder)">
        <AvatarImage size={48} className="rounded-full" />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── StarRating ───────────────────────────────────────────────────
function StarRatingShowcase() {
  const [v1, setV1] = useState(4);
  const [v2, setV2] = useState(0);
  return (
    <ShowcaseSection
      name="StarRating"
      filePath="components/ui/StarRating.tsx"
      description="5-star rating. Used in the rate-this-item form, review carousel cards, and read-only displays everywhere. Hover preview when not readOnly."
      contextLinks={[{ label: "Live (any detail page rating box)", href: "/books/agries-anemones" }]}
    >
      <Variant label="Read-only · 4 stars">
        <StarRating value={4} readOnly />
      </Variant>
      <Variant label="Read-only · 3.5 (half star)">
        <StarRating value={3.5} readOnly />
      </Variant>
      <Variant label="Interactive (click to set)">
        <div className="flex flex-col items-center gap-2">
          <StarRating value={v1} onChange={setV1} />
          <span className="text-xs text-zinc-500">{v1} / 5</span>
        </div>
      </Variant>
      <Variant label="Empty / pending">
        <StarRating value={v2} onChange={setV2} />
      </Variant>
      <Variant label="Sizes — sm / md / lg">
        <div className="flex flex-col gap-2 items-center">
          <StarRating value={4} readOnly size="sm" />
          <StarRating value={4} readOnly size="md" />
          <StarRating value={4} readOnly size="lg" />
        </div>
      </Variant>
      <Variant label="With value display">
        <StarRating value={4.7} readOnly showValue />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── IconButton ───────────────────────────────────────────────────
function IconButtonShowcase() {
  return (
    <ShowcaseSection
      name="IconButton"
      filePath="components/ui/IconButton.tsx"
      description="Round icon-only button. 3 sizes × 3 variants. Supports notification badge (boolean for dot, number for count)."
    >
      <Variant label="Variants — default / ghost / coral">
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <IconButton variant="default">
            <Heart size={18} />
          </IconButton>
          <IconButton variant="ghost">
            <Heart size={18} />
          </IconButton>
          <IconButton variant="coral">
            <Heart size={18} />
          </IconButton>
        </div>
      </Variant>
      <Variant label="Sizes — sm / md / lg">
        <div className="flex items-center gap-2">
          <IconButton size="sm">
            <Heart size={14} />
          </IconButton>
          <IconButton size="md">
            <Heart size={18} />
          </IconButton>
          <IconButton size="lg">
            <Heart size={22} />
          </IconButton>
        </div>
      </Variant>
      <Variant label="With badge dot">
        <IconButton badge>
          <Bell size={18} />
        </IconButton>
      </Variant>
      <Variant label="With badge count">
        <IconButton badge={3}>
          <Bell size={18} />
        </IconButton>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────
function FilterChipShowcase() {
  const [active, setActive] = useState("all");
  const opts = [
    { id: "all", label: "Όλα" },
    { id: "drama", label: "Δράμα" },
    { id: "comedy", label: "Κωμωδία" },
    { id: "thriller", label: "Θρίλερ" },
    { id: "scifi", label: "Sci-Fi" },
  ];
  return (
    <ShowcaseSection
      name="FilterChip · FilterChipRow"
      filePath="components/ui/FilterChip.tsx"
      description="Pill toggle chip. Active = coral fill. FilterChipRow wraps in a horizontal scroll container. Used in category filter rows and elsewhere."
      contextLinks={[{ label: "Live (any category page)", href: "/movies" }]}
    >
      <Variant label="Inactive / active">
        <div className="flex gap-2">
          <FilterChip label="Inactive" />
          <FilterChip label="Active" active />
        </div>
      </Variant>
      <Variant label="Interactive group (click)">
        <div className="flex flex-wrap gap-2 justify-center">
          {opts.map((o) => (
            <FilterChip key={o.id} label={o.label} active={active === o.id} onPress={() => setActive(o.id)} />
          ))}
        </div>
      </Variant>
      <Variant label="In FilterChipRow (scrolls horizontally)">
        <div className="w-[320px] -mx-4">
          <FilterChipRow>
            {opts.concat([
              { id: "rom", label: "Ρομαντική" },
              { id: "ani", label: "Animation" },
              { id: "doc", label: "Ντοκιμαντέρ" },
            ]).map((o) => (
              <FilterChip key={o.id} label={o.label} active={o.id === "drama"} />
            ))}
          </FilterChipRow>
        </div>
      </Variant>
      <Variant label="With leading icon">
        <FilterChip label="Κοντά μου" icon={<span aria-hidden>📍</span>} />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── SortPills ────────────────────────────────────────────────────
function SortPillsShowcase() {
  const [sort, setSort] = useState("popular");
  return (
    <ShowcaseSection
      name="SortPills"
      filePath="components/ui/SortPills.tsx"
      description="Larger pill row with header label. Used inside filter bottom sheets for sort options. Active = dark fill."
    >
      <Variant label="Default (3 options)">
        <div className="w-[420px] -mx-6">
          <SortPills
            options={[
              { key: "popular", label: "Δημοφιλέστερα" },
              { key: "recent", label: "Πιο πρόσφατα" },
              { key: "rating", label: "Υψηλότερη βαθμολογία" },
            ]}
            active={sort}
            onChange={setSort}
          />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────
function SpinnerShowcase() {
  return (
    <ShowcaseSection
      name="Spinner"
      filePath="components/ui/Spinner.tsx"
      description="Rotating circle. 3 sizes × 3 colors. Optional centered wrapper for full-width loading slots."
    >
      <Variant label="Sizes — sm / md / lg">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </Variant>
      <Variant label="Coral (default)">
        <Spinner />
      </Variant>
      <Variant label="Gray">
        <Spinner variant="gray" />
      </Variant>
      <Variant label="White (on dark)" dark>
        <Spinner variant="white" />
      </Variant>
      <Variant label="Centered (full-width)">
        <div className="w-[260px]">
          <Spinner centered />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────
function StatCardShowcase() {
  return (
    <ShowcaseSection
      name="StatCard · InlineStat"
      filePath="components/ui/StatCard.tsx"
      description="Profile stat tiles. StatCard = full bordered tile with big number. InlineStat = compact value/label pair for tight rows (ΠΡΟΤΑΣΕΙΣ / ΑΞΙΟΛΟΓΗΣΕΙΣ etc.)."
      contextLinks={[{ label: "Live (own profile)", href: "/profile" }]}
    >
      <Variant label="StatCard (single)">
        <div className="w-[200px]">
          <StatCard label="Συνολικές προτάσεις" value={47} sub="από τη συμμετοχή σου" />
        </div>
      </Variant>
      <Variant label="StatCard (no sub)">
        <div className="w-[200px]">
          <StatCard label="Δημοτικότητα" value="#84" />
        </div>
      </Variant>
      <Variant label="StatCard with icon">
        <div className="w-[200px]">
          <StatCard label="Ακόλουθοι" value={203} icon={<span aria-hidden>👥</span>} />
        </div>
      </Variant>
      <Variant label="InlineStat row (3-cell)">
        <div className="w-[320px] flex items-center justify-around bg-white rounded-lg border border-zinc-200 py-3">
          <InlineStat label="Προτάσεις" value={47} />
          <InlineStat label="Αξιολογήσεις" value={213} />
          <InlineStat label="Αγαπημένα" value={28} />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

// ─── FollowButton ─────────────────────────────────────────────────
function FollowButtonShowcase() {
  return (
    <ShowcaseSection
      name="FollowButton"
      filePath="components/ui/FollowButton.tsx"
      description="Toggleable follow button with built-in icon swap (follow → followed). Active state = mint fill. Two visual variants (default zinc-pill, dark high-emphasis)."
      contextLinks={[{ label: "Live (any user profile)", href: "/profile" }]}
    >
      <Variant label="Default (sm / md / lg)">
        <div className="flex flex-col items-center gap-2">
          <FollowButton size="sm" />
          <FollowButton size="md" />
          <FollowButton size="lg" />
        </div>
      </Variant>
      <Variant label="Already following (default)">
        <FollowButton following />
      </Variant>
      <Variant label="Dark variant — not following">
        <FollowButton variant="dark" />
      </Variant>
      <Variant label="Dark variant — already following">
        <FollowButton variant="dark" following />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── WantToSeeButton ──────────────────────────────────────────────
function WantToSeeButtonShowcase() {
  return (
    <ShowcaseSection
      name="WantToSeeButton"
      filePath="components/ui/WantToSeeButton.tsx"
      description={`Vertical "want-to-see" toggle (50px circle + label). Active state = soft blue circle + dark navy bookmark fill. Independent from the standard bookmark — used as a soft signal for movies/series the user wants to watch.`}
      contextLinks={[{ label: "Currently no live wiring", href: "/movies" }]}
    >
      <Variant label="Inactive (default)">
        <WantToSeeButton />
      </Variant>
      <Variant label="Active">
        <WantToSeeButton active />
      </Variant>
      <Variant label="Custom label">
        <WantToSeeButton label="Στη λίστα μου" />
      </Variant>
    </ShowcaseSection>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────
function SkeletonShowcase() {
  return (
    <ShowcaseSection
      name="Skeleton (+ helpers)"
      filePath="components/ui/Skeleton.tsx"
      description="Shimmer placeholder. Plus pre-built shapes: SkeletonText (multi-line), SkeletonAvatar (round), SkeletonCard (item-card layout), SkeletonSuggestion (suggestion-row layout)."
    >
      <Variant label="Base — bare rectangle">
        <Skeleton className="w-[200px] h-6" />
      </Variant>
      <Variant label="SkeletonText (3 lines, last shorter)">
        <div className="w-[260px]">
          <SkeletonText lines={3} />
        </div>
      </Variant>
      <Variant label="SkeletonAvatar — sizes">
        <div className="flex items-end gap-2">
          <SkeletonAvatar size="sm" />
          <SkeletonAvatar size="md" />
          <SkeletonAvatar size="lg" />
        </div>
      </Variant>
      <Variant label="SkeletonCard">
        <div className="w-[180px]">
          <SkeletonCard />
        </div>
      </Variant>
      <Variant label="SkeletonSuggestion (row)">
        <div className="w-[320px]">
          <SkeletonSuggestion />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}
