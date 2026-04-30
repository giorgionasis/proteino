"use client";

import { useState } from "react";
import {
  Button, Card, CardHeader, CardBody, CardFooter,
  Badge, Input, Modal, StarRating, FAB,
  Avatar, Spinner, Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard,
  Textarea,
} from "@/components/ui";
import {
  Search, Bell, Heart, ArrowRight, Plus, Bookmark, Share2, Star,
} from "lucide-react";

// ── Section wrapper ────────────────────────────────────────────
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-medium text-gray-900 uppercase tracking-[0.5px]">{title}</h2>
        <div className="flex-1 h-px bg-gray-100" />
      </div>
      {children}
    </section>
  );
}

// ── Row wrapper ────────────────────────────────────────────────
function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ── Color swatch ───────────────────────────────────────────────
function Swatch({ hex, name, textDark = false }: { hex: string; name: string; textDark?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-14 h-14 rounded-card border-[0.5px] border-gray-200"
        style={{ background: hex }}
      />
      <p className="text-2xs text-gray-500 text-center leading-tight">
        {name}<br />
        <span className="text-gray-400">{hex}</span>
      </p>
    </div>
  );
}

// ── Main showcase ──────────────────────────────────────────────
export default function ShowcasePage() {
  const [modalOpen,  setModalOpen]  = useState(false);
  const [modal2Open, setModal2Open] = useState(false);
  const [starValue,  setStarValue]  = useState(3);
  const [inputVal,   setInputVal]   = useState("");
  const [textVal,    setTextVal]    = useState("");

  const NAV_SECTIONS = [
    "colors", "typography", "buttons", "badges",
    "inputs", "cards", "modals", "ratings",
    "avatars", "spinners", "skeletons", "fab",
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top header ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-[0.5px] border-gray-200 shadow-card">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-coral-600 font-medium text-base">Proteino</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Design System</span>
          </div>
          <Badge variant="ai" dot>v0.1</Badge>
        </div>

        {/* Section nav */}
        <div className="flex overflow-x-auto no-scrollbar border-t border-[0.5px] border-gray-100">
          {NAV_SECTIONS.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className="shrink-0 px-4 py-2 text-2xs font-medium uppercase tracking-wide text-gray-400 hover:text-coral-600 transition-colors"
            >
              {s}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-12 pb-24">

        {/* ── 1. Colors ── */}
        <Section id="colors" title="Colors">
          <Row label="Coral scale">
            <Swatch hex="#FAECE7" name="coral-50" />
            <Swatch hex="#F5D8CF" name="coral-100" />
            <Swatch hex="#F5A882" name="coral-400" />
            <Swatch hex="#F0997B" name="coral-500" />
            <Swatch hex="#D85A30" name="coral-600" />
            <Swatch hex="#993C1D" name="coral-800" textDark />
          </Row>
          <Row label="Semantic">
            <Swatch hex="#1D9E75" name="success" />
            <Swatch hex="#E24B4A" name="danger" />
            <Swatch hex="#111111" name="foreground" />
            <Swatch hex="#6B7280" name="muted" />
            <Swatch hex="#F9FAFB" name="muted-bg" />
          </Row>
          <Row label="Gradient">
            <div className="h-14 w-48 rounded-card gradient-coral" />
            <div className="h-14 w-48 rounded-card bg-gray-950" />
          </Row>
        </Section>

        {/* ── 2. Typography ── */}
        <Section id="typography" title="Typography">
          <div className="bg-white rounded-card border-[0.5px] border-gray-200 p-5 space-y-4">
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">2xs — 10px</p>
              <p className="text-2xs">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">xs — 11px</p>
              <p className="text-xs">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">sm — 13px (body)</p>
              <p className="text-sm">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">base — 14px (body)</p>
              <p className="text-base">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">lg — 17px (h3)</p>
              <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">xl — 20px (h2)</p>
              <p className="text-xl">The quick brown fox</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-1">2xl — 24px (h1)</p>
              <p className="text-2xl">The quick brown fox</p>
            </div>
            <hr className="border-gray-100" />
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-2">Weights (400 + 500 only)</p>
              <p className="text-base font-normal text-gray-700">400 Regular — Proteino community</p>
              <p className="text-base font-medium text-gray-900">500 Medium — Proteino community</p>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-2">Label style</p>
              <label>Example label field</label>
            </div>
            <div>
              <p className="text-2xs text-gray-400 uppercase tracking-wide mb-2">Gradient text</p>
              <p className="text-xl font-medium text-gradient-coral">Proteino</p>
            </div>
          </div>
        </Section>

        {/* ── 3. Buttons ── */}
        <Section id="buttons" title="Buttons">
          <Row label="Variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <div className="bg-gray-900 p-2 rounded-card">
              <Button variant="dark">Dark</Button>
            </div>
          </Row>

          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>

          <Row label="With icons">
            <Button leftIcon={<Search size={15} />}>Search</Button>
            <Button rightIcon={<ArrowRight size={15} />}>Continue</Button>
            <Button variant="secondary" leftIcon={<Heart size={15} />}>Save</Button>
            <Button variant="ghost" leftIcon={<Bell size={15} />} size="sm">Notify</Button>
          </Row>

          <Row label="Loading + disabled">
            <Button loading>Publishing...</Button>
            <Button loading variant="secondary">Saving</Button>
            <Button disabled>Disabled</Button>
            <Button disabled variant="secondary">Disabled</Button>
          </Row>

          <Row label="Full width">
            <div className="w-full">
              <Button fullWidth size="lg">Δημοσίευση πρότασης</Button>
            </div>
          </Row>
        </Section>

        {/* ── 4. Badges ── */}
        <Section id="badges" title="Badges">
          <Row label="Variants">
            <Badge variant="default">Default</Badge>
            <Badge variant="coral">Ταινίες</Badge>
            <Badge variant="success">Match found</Badge>
            <Badge variant="danger">Error</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="ai">AI</Badge>
            <div className="bg-gray-900 px-3 py-2 rounded-card">
              <Badge variant="dark">Dark</Badge>
            </div>
          </Row>

          <Row label="With dot">
            <Badge variant="default" dot>Default</Badge>
            <Badge variant="coral"   dot>Βιβλία</Badge>
            <Badge variant="success" dot>Published</Badge>
            <Badge variant="danger"  dot>Failed</Badge>
            <Badge variant="ai"      dot>Analyzing</Badge>
          </Row>

          <Row label="In context">
            <Badge variant="coral">Movies</Badge>
            <Badge variant="coral">Series</Badge>
            <Badge variant="coral">Books</Badge>
            <Badge variant="coral">Food</Badge>
            <Badge variant="coral">Bars</Badge>
            <Badge variant="coral">Hotels</Badge>
            <Badge variant="coral">Events</Badge>
            <Badge variant="coral">Theater</Badge>
          </Row>
        </Section>

        {/* ── 5. Inputs ── */}
        <Section id="inputs" title="Inputs">
          <div className="grid gap-4">
            <Input
              label="Default input"
              placeholder="Type something..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <Input
              label="With left icon"
              placeholder="Search..."
              leftIcon={<Search size={16} strokeWidth={1.5} />}
            />
            <Input
              label="With hint"
              placeholder="@username"
              hint="Only letters, numbers and underscores"
            />
            <Input
              label="Error state"
              placeholder="Email address"
              defaultValue="not-an-email"
              error="Please enter a valid email address"
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              hint="At least 8 characters, one uppercase, one number"
            />
            <Input
              label="Disabled"
              placeholder="Cannot edit"
              defaultValue="Read only value"
              disabled
            />
            <Textarea
              label="Textarea — default"
              placeholder="Describe your recommendation..."
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              rows={3}
            />
            <Textarea
              label="Textarea — with character count"
              placeholder="Write your reflection..."
              maxLength={280}
              showCount
              rows={3}
            />
          </div>
        </Section>

        {/* ── 6. Cards ── */}
        <Section id="cards" title="Cards">
          <Row label="Variants">
            <Card className="p-4 w-40">
              <p className="text-sm font-medium">Default</p>
              <p className="text-xs text-gray-400 mt-1">0.5px border</p>
            </Card>
            <Card variant="elevated" className="p-4 w-40">
              <p className="text-sm font-medium">Elevated</p>
              <p className="text-xs text-gray-400 mt-1">Shadow card</p>
            </Card>
            <Card variant="flat" className="p-4 w-40">
              <p className="text-sm font-medium">Flat</p>
              <p className="text-xs text-gray-400 mt-1">Gray-50 bg</p>
            </Card>
            <Card variant="outlined" className="p-4 w-40">
              <p className="text-sm font-medium text-coral-600">Outlined</p>
              <p className="text-xs text-gray-400 mt-1">Coral border</p>
            </Card>
          </Row>

          <Row label="Pressable">
            <Card pressable className="p-4 w-48" onClick={() => {}}>
              <p className="text-sm font-medium">Tap me</p>
              <p className="text-xs text-gray-400 mt-1">active:scale-[0.98]</p>
            </Card>
          </Row>

          <Row label="With sub-components">
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Card title</p>
                  <Badge variant="coral">Movies</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600">
                  Καταπληκτική ταινία με εκπληκτικές ερμηνείες και σκηνοθεσία που σε αφήνει άφωνο.
                </p>
              </CardBody>
              <CardFooter>
                <div className="flex items-center justify-between">
                  <StarRating value={4} readOnly size="sm" showValue />
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </CardFooter>
            </Card>
          </Row>
        </Section>

        {/* ── 7. Modals ── */}
        <Section id="modals" title="Modals">
          <Row label="Sizes">
            <Button onClick={() => setModalOpen(true)}>Open Modal (md)</Button>
            <Button variant="secondary" onClick={() => setModal2Open(true)}>Open Modal (lg)</Button>
          </Row>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Rate this item"
            size="md"
          >
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Πόσο σου άρεσε η ταινία; Δώσε βαθμολογία και μοιράσου τη σκέψη σου.
              </p>
              <div className="flex justify-center py-2">
                <StarRating value={starValue} onChange={setStarValue} size="lg" />
              </div>
              <Textarea placeholder="Η σκέψη σου (προαιρετικά)..." rows={3} />
              <Button fullWidth onClick={() => setModalOpen(false)}>
                Αποθήκευση βαθμολογίας
              </Button>
            </div>
          </Modal>

          <Modal
            open={modal2Open}
            onClose={() => setModal2Open(false)}
            title="Share suggestion"
            size="lg"
          >
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Μοιράσου αυτή την πρόταση με τους φίλους σου.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Copy link", "Instagram", "WhatsApp", "Twitter"].map((s) => (
                  <Button key={s} variant="secondary" leftIcon={<Share2 size={14} />} size="sm">
                    {s}
                  </Button>
                ))}
              </div>
              <Button fullWidth variant="ghost" onClick={() => setModal2Open(false)}>
                Cancel
              </Button>
            </div>
          </Modal>
        </Section>

        {/* ── 8. Star ratings ── */}
        <Section id="ratings" title="Star Rating">
          <Row label="Interactive">
            <div className="space-y-2">
              <StarRating value={starValue} onChange={setStarValue} size="lg" showValue />
              <p className="text-xs text-gray-400">Selected: {starValue}/5 — click to change</p>
            </div>
          </Row>

          <Row label="Sizes (read-only)">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StarRating value={4.5} readOnly size="sm" showValue />
                <Badge variant="default">sm</Badge>
              </div>
              <div className="flex items-center gap-3">
                <StarRating value={3.5} readOnly size="md" showValue />
                <Badge variant="default">md</Badge>
              </div>
              <div className="flex items-center gap-3">
                <StarRating value={5} readOnly size="lg" showValue />
                <Badge variant="default">lg</Badge>
              </div>
            </div>
          </Row>
        </Section>

        {/* ── 9. Avatars ── */}
        <Section id="avatars" title="Avatars">
          <Row label="Sizes">
            <Avatar name="George Nasis" size="xs" />
            <Avatar name="George Nasis" size="sm" />
            <Avatar name="George Nasis" size="md" />
            <Avatar name="George Nasis" size="lg" />
            <Avatar name="George Nasis" size="xl" />
          </Row>

          <Row label="With image (simulated)">
            <Avatar
              src="https://i.pravatar.cc/80?img=1"
              name="User One"
              size="md"
            />
            <Avatar
              src="https://i.pravatar.cc/80?img=2"
              name="User Two"
              size="md"
            />
            <Avatar
              src="https://i.pravatar.cc/80?img=5"
              name="User Five"
              size="lg"
            />
          </Row>

          <Row label="Verified badge">
            <Avatar name="George Nasis" size="sm" verified />
            <Avatar name="Maria Papadaki" size="md" verified />
            <Avatar
              src="https://i.pravatar.cc/80?img=3"
              name="Verified User"
              size="lg"
              verified
            />
          </Row>

          <Row label="Initials fallback">
            <Avatar name="George Nasis"  size="md" />
            <Avatar name="Maria P"       size="md" />
            <Avatar name="Nick"          size="md" />
            <Avatar name=""              size="md" />
          </Row>
        </Section>

        {/* ── 10. Spinners ── */}
        <Section id="spinners" title="Spinners">
          <Row label="Variants">
            <Spinner variant="coral" />
            <Spinner variant="gray" />
            <div className="bg-gray-900 p-3 rounded-card">
              <Spinner variant="white" />
            </div>
          </Row>

          <Row label="Sizes">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Row>

          <Row label="Centered (fills container)">
            <div className="w-full bg-white rounded-card border-[0.5px] border-gray-200">
              <Spinner centered />
            </div>
          </Row>
        </Section>

        {/* ── 11. Skeletons ── */}
        <Section id="skeletons" title="Skeletons">
          <Row label="Primitives">
            <div className="w-full space-y-3">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-10 w-full rounded-input" />
              <Skeleton className="h-14 w-full rounded-card" />
            </div>
          </Row>

          <Row label="Text block">
            <div className="w-full">
              <SkeletonText lines={3} />
            </div>
          </Row>

          <Row label="Avatar sizes">
            <SkeletonAvatar size="sm" />
            <SkeletonAvatar size="md" />
            <SkeletonAvatar size="lg" />
          </Row>

          <Row label="Card preset">
            <div className="grid grid-cols-2 gap-3 w-full">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </Row>

          <Row label="List item preset">
            <div className="w-full space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-3 p-3 bg-white rounded-card border-[0.5px] border-gray-200">
                  <SkeletonAvatar size="lg" />
                  <div className="flex-1 py-1">
                    <SkeletonText lines={2} />
                  </div>
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── 12. FAB ── */}
        <Section id="fab" title="FAB">
          <Row label="Static preview (not fixed position)">
            <div className="relative bg-gray-100 rounded-card h-32 w-full flex items-end justify-end p-4">
              <div className="w-14 h-14 rounded-full gradient-coral text-white shadow-fab flex items-center justify-center">
                <Plus size={24} strokeWidth={2} />
              </div>
              <p className="absolute top-4 left-4 text-xs text-gray-400">
                FAB sits above bottom nav in the live app
              </p>
            </div>
          </Row>

          <Row label="Icon variants">
            <div className="flex gap-3">
              {[Plus, Search, Bookmark, Star].map((Icon, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full gradient-coral text-white shadow-fab flex items-center justify-center"
                >
                  <Icon size={20} strokeWidth={2} />
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── Shadows reference ── */}
        <Section id="shadows" title="Shadows">
          <Row>
            {(["card", "elevated", "fab", "modal"] as const).map((s) => (
              <div
                key={s}
                className={`bg-white rounded-card p-4 w-28 text-center shadow-${s}`}
              >
                <p className="text-xs text-gray-500">{s}</p>
              </div>
            ))}
          </Row>
        </Section>

        {/* ── Animations reference ── */}
        <Section id="animations" title="Animations">
          <div className="bg-white rounded-card border-[0.5px] border-gray-200 p-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">All keyframes defined</p>
            {[
              "slide-up / slide-down",
              "fade-in",
              "shimmer (skeleton)",
              "spin-slow (spinner/loading)",
              "pulse (live indicator)",
              "pop-in (achievement unlock)",
              "star-fill (rating select)",
            ].map((a) => (
              <div key={a} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-coral-600 shrink-0" />
                <p className="text-sm text-gray-600 font-medium">{a}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-4 border-t border-[0.5px] border-gray-200">
          <p className="text-xs text-gray-400">Proteino Design System · All components verified</p>
        </div>

      </div>

      {/* Live FAB — as it appears in the real app */}
      <FAB />

    </div>
  );
}
