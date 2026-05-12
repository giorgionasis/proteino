# Proteino — Engagement & Hook Mechanics

This file documents all hook patterns, notification triggers, and engagement mechanics.
Every new feature should be evaluated against these patterns.
Place this file in the project root alongside CLAUDE.md.

**Last meaningful update:** 2026-05-12 (session 20 — backfilled current state + 10s achievement timing)

---

## 0. Implementation Status (read first when expanding)

Quick map of what's live in code vs. spec'd here. When you want to add a new variant, find the moment below and check its row.

| Moment | Status | Trigger | Where it lives in code | Timing |
|---|---|---|---|---|
| **Achievement modal — progress** | ✅ Live | suggestion published, count ∈ {1,2,7,9,22,24,47,49} | server-side `TRIGGERS` in `app/api/suggestions/route.ts`; UI in `components/submission/AchievementUnlockedModal.tsx` | **10s** after Published mounts |
| **Achievement modal — tier unlock** | ✅ Live | suggestion published, count ∈ {3,10,25,50} | same as above | 10s after Published mounts |
| **Bookmark celebration (first save)** | ✅ Live | bookmark created | `components/detail/BookmarkSavedModal.tsx` + `lib/bookmarks/labels.ts` | Right after orbit + 600ms bounce |
| **Bookmark orbit microinteraction** | ✅ Live | bookmark created (not removed) | `hooks/useBookmarkOrbit.ts`, `DetailHeaderActions.tsx` | 700ms flight + 520ms bounce |
| **Duplicate submission hook** | ✅ Live | AI match locks on existing item | `useSubmission` `duplicate` state → `SuggestionOverlay` duplicate screen | Inline during submission |
| **Search empty-state CTA** | ⚠️ Partial | search returns no results | `app/(main)/search/page.tsx` — copy present, "πρόσθεσέ το πρώτος" handoff TODO | n/a |
| **Streak indicator (home + profile)** | ❌ Not built | consecutive-day suggestions | spec only | n/a |
| **"Others are looking" social proof** | ❌ Not built | high recent activity on item | spec only | n/a |
| **First-suggestion-of-day banner** | ❌ Not built | logged-in, 0 suggestions today | spec only | n/a |
| **Comment-prompt after rating** | ❌ Not built | rating submitted without text | spec only | n/a |
| **Profile progress bar** | ⚠️ Partial | always visible on own profile | inline in `UserProfile.tsx` | n/a |
| **Bookmark count milestone push** | ❌ Not built | your item hit 5/10/25/50 bookmarks | spec only | server cron + push |
| **Followed user added suggestion** | ✅ Live | suggestions INSERT (published) | migration 029 — `notify_followers_of_suggestion` trigger | INSERT in-app |
| **New follower** | ✅ Live | follows INSERT | migration 029 — `notify_on_follow_inserted` | INSERT in-app |
| **Your suggestion got rated** | ✅ Live | reviews INSERT | migration 029 — `notify_on_review_inserted` | INSERT in-app |
| **Your item hit 5 / 10 / 25 / 50 / 100 bookmarks** | ✅ Live | bookmarks INSERT (milestone count) | migration 029 — `notify_on_bookmark_milestone` | INSERT in-app |
| **Master pause / quiet hours respected** | ✅ Live | every trigger consults `should_notify` | migration 029 | gate |
| **Bookmarked event tomorrow** | ❌ Not built | event_dates - 1d | spec only | cron |
| **Bookmarked series new season** | ❌ Not built | TMDB webhook | spec only | push |
| **14-day dormant comeback** | ❌ Not built | last_login_at + cron | spec only | push |

When this table grows past ~20 rows, move to the DB-driven moments table (see §9 — the path that's in motion).

---

## Core Philosophy

> "Give before you ask. Reward before you prompt. Make every action feel consequential."

Three hook loops:
- **Investment loop** — User puts in effort (suggestion, rating, comment) → gets social reward → invests more
- **Discovery loop** — User discovers something great → wants to share → brings others in
- **Progress loop** — User sees they're close to something → takes one more action → gets rewarded

---

## 1. Notification Triggers

### 1A — Post-Action Smart Nudges
Triggered after a specific user action, after a delay.

| Trigger | Delay | Message | Goal |
|---|---|---|---|
| User suggests a classic movie | 3 days | "Μιας και σου αρέσουν τα κλασικά, ποιες είναι οι 3 αγαπημένες σου κλασικές ταινίες;" | More suggestions |
| User suggests any movie | 7 days | "Πόσες από τις ταινίες που έχεις προτείνει έχεις δει πρόσφατα; Πρόσθεσε μια νέα αξιολόγηση." | Rating activity |
| User comments on a suggestion | 24 hours | "Σχολίασες πρόσφατα. Έχεις κάτι δικό σου να προτείνεις για αυτή την κατηγορία;" | Submission conversion |
| User bookmarks 3+ items in same category | 1 hour | "Έχεις αποθηκεύσει [N] [κατηγορία]. Θες να δεις τι άλλο υπάρχει στην κατηγορία;" | Discovery |
| User reads detail page but doesn't rate | 48 hours | "Είδες το [item]; Τι σου φάνηκε; Άφησε μια βαθμολογία." | Rating activity |
| User reaches level up threshold - 1 | Immediate | "Μένει μόνο 1 πρόταση για το επόμενο level! 🎯" | Submission |
| User hasn't opened app in 3 days | 3 days | "Ο [followed user] πρόσθεσε [N] νέες προτάσεις από τότε που έφυγες." | Re-engagement |
| User hasn't opened app in 7 days | 7 days | "[N] νέες προτάσεις στις κατηγορίες που σε ενδιαφέρουν. Δες τι χάνεις." | Re-engagement |
| User suggests a series | 5 days | "Ξεκίνησες το [series]; Πώς σου φάνηκε μέχρι τώρα;" | Engagement |
| User bookmarks an event | 1 day before event | "Αύριο είναι το [event] που έχεις αποθηκεύσει! Μην το χάσεις." | Utility |
| New season announced for bookmarked series | Immediately | "Ανακοινώθηκε νέα σεζόν του [series] που έχεις στη λίστα σου!" | FOMO |

### 1B — Social Triggers
Triggered by other users' actions.

| Trigger | Delay | Message | Goal |
|---|---|---|---|
| Followed user adds suggestion | Immediate | "[User] πρόσθεσε [item] στα [κατηγορία]" | Discovery |
| Someone follows you | Immediate | "[User] σε ακολούθησε — [N] προτάσεις, [N] κατηγορίες" | Social reciprocity |
| Your suggestion gets rated | Immediate | "[User] βαθμολόγησε την πρότασή σου για [item] με [N]★" | Validation |
| Your suggestion gets commented | Immediate | "[User] σχολίασε την πρότασή σου για [item]" | Conversation |
| Your suggestion gets bookmarked by 5th person | Immediate | "5 χρήστες αποθήκευσαν την πρότασή σου για [item]!" | Pride/investment |
| Your suggestion gets bookmarked by 10th, 25th, 50th person | Immediate | "[N] χρήστες έχουν αποθηκεύσει [item] χάρη σε σένα!" | Pride/investment |
| Someone votes up your suggestion | Immediate (batched max 1/day) | "[N] χρήστες βρήκαν χρήσιμη την πρότασή σου αυτή την εβδομάδα" | Validation |
| Followed user reaches new level | Immediate | "[User] έφτασε στο Level [N]! Δες τις νέες προτάσεις του." | Social competition |

### 1C — Contextual / AI-Driven
Triggered by AI analysis of user behavior patterns.

| Trigger | Delay | Message | Goal |
|---|---|---|---|
| User shows pattern in specific genre | Weekly | "Βλέπω ότι σου αρέσει το [genre]. Έχεις δει [item];" | Discovery |
| User active in food but not bars | After 2 food suggestions | "Μιας και σου αρέσει το φαγητό, έχεις κάποιο αγαπημένο bar/καφέ;" | Category expansion |
| User hasn't tried a category | After 2 weeks | "Δεν έχεις εξερευνήσει ακόμα τα [κατηγορία]. Υπάρχουν [N] προτάσεις που ίσως σου αρέσουν." | Category discovery |
| Personalized weekly digest | Every Monday 10:00 | "[N] νέα πράγματα βασισμένα στα ενδιαφέροντά σου αυτή την εβδομάδα." | Re-engagement |

---

## 2. In-App Real-Time Hooks

These are UI moments that happen instantly, not via notifications.

### 2A — Bookmark Moment ✅ LIVE

**Implemented as `BookmarkSavedModal` (session 19).** Triggered the first time a user bookmarks an item — slides up after the orbit microinteraction lands + 600ms bounce settles.

**What ships today:**
- Portal-mounted slide-up modal, 5s auto-dismiss
- Avatar stack of up to 9 prior bookmarkers + "+N" overflow chip
- Category-specific headline + body via `lib/bookmarks/labels.ts` (Θέλω να δω / Διάβασα / Πήγα / Έφτιαξα variants)
- Heart icon on active wishlist chip, ✓ icon on active done chip
- Tapping outside or X dismisses; bookmark stays saved either way
- Subsequent saves of same item: orbit + bounce + chip flip only, no modal

**Variants you can add (DB-driven moments will make this configurable):**

| Condition | Copy variant | Status |
|---|---|---|
| `bookmarkers_count = 0` | "Είσαι ο πρώτος που το αποθηκεύει — be a curator!" | ❌ Not built |
| `bookmarkers_count ≥ 100` | "🔥 Hot — N+ άνθρωποι το θέλουν επίσης" | ❌ Not built |
| `bookmark.user.category_bookmarks_count = 10` | "Το 10ο movie στη λίστα σου! 🎬" | ❌ Not built |
| `bookmark.user.category_bookmarks_count = 25/50` | Tier-style milestone celebration | ❌ Not built |
| `bookmarkers_in_user_follows ≥ 1` | "@george και Ν φίλοι σου το θέλουν επίσης" | ❌ Not built |
| `item.added_within_7d AND bookmarkers_count ≥ 3` | "Φρέσκο και ήδη trending — N άνθρωποι το αποθήκευσαν" | ❌ Not built |
| `bookmark on event with date in next 7 days` | "Σε N μέρες — μην το ξεχάσεις" + add-to-calendar CTA | ❌ Not built |

The variant cascade should be **highest-specificity-wins** (event-with-date beats hot beats default).

### 2B — After Publishing Suggestion ✅ PARTIAL

**What ships today (session 20):** Published screen → 10s pause → `AchievementUnlockedModal` opens. The 10s gap is deliberate — the user reads their own publish confirmation and feels the result before the celebration takes over (decided 2026-05-12).

**What hasn't shipped:** the "Είσαι ο Nος που πρότεινε αυτή την εβδομάδα" social-proof hook that's spec'd here. It would slot **between** Published mount and the achievement modal — e.g. at the 4-5s mark via an inline pill on the Published screen.

**Variants you can add:**

| Condition | Copy variant | Status |
|---|---|---|
| `user.weekly_suggestion_rank ≤ 10` | "Είσαι ο Nος που πρότεινε αυτή την εβδομάδα 🔥" | ❌ Not built |
| `category.followers_count > 50` | "N άνθρωποι παρακολουθούν αυτή την κατηγορία" | ❌ Not built |
| `item.is_brand_new` (no prior suggestion existed) | "Είσαι ο πρώτος που πρότεινε αυτό 🥇" | ❌ Not built |
| `user.consecutive_days ≥ 3` | "N μέρες σερί — απίθανο" | ❌ Not built |
| `user.day_of_week = 'Sunday'` | "Κυριακάτικη πρόταση — η αγαπημένη μέρα της κοινότητας" | ❌ Not built |

Rendered as a transient pill above the ✓ checkmark on Published, fades in at 3s, fades out at 8s (before achievement modal opens at 10s).

### 2C — Streak Indicator
Show on home screen / profile when user has suggested on consecutive days:

```
🔥 3 μέρες σερί — Συνέχισε!
```

Break message (if streak broken):
```
"Έχασες το streak σου. Ξεκίνα νέο σήμερα!"
```

### 2D — "Others Are Looking" Social Proof
On detail pages with high recent activity:

```
"👀 12 χρήστες είδαν αυτό σήμερα"
```

Or for trending:
```
"📈 Trending αυτή την εβδομάδα — 34 νέες αξιολογήσεις"
```

### 2E — Search Empty State (No Dead End)
When search returns no results:

```
"Δεν βρέθηκε '[query]' στο Proteino ακόμα.
Ήσουν ο πρώτος που το ανακαλύπτει — πρόσθεσέ το! →"
```

CTA opens submission flow with pre-filled query text.

### 2F — Category Empty State
When a category has no results for specific filter:

```
"Δεν υπάρχουν [filter] προτάσεις ακόμα.
Γνωρίζεις κάποιο; Πρόσθεσέ το πρώτος! →"
```

### 2G — Profile Progress Bar
Always visible on own profile, just below stats:

```
Level 2 ████████░░ 8/10 προτάσεις → Level 3
"2 ακόμα προτάσεις για το επόμενο level"
```

### 2H — First Suggestion of the Day
When user opens app and hasn't suggested today:

Subtle banner on home screen (dismissible):
```
"Έχεις κάτι να προτείνεις σήμερα; ✏️"
```

### 2I — Comment Prompt After Rating
After user submits a rating (modal), if they close without commenting:

Show subtle prompt below:
```
"Πες μας γιατί — τα σχόλιά σου βοηθούν την κοινότητα. [Γράψε σχόλιο →]"
```

### 2J — Onboarding Follow-Up
3 days after registration if user has 0 suggestions:

In-app banner:
```
"Δεν έχεις κάνει ακόμα πρότασή σου. Χρειάζεται μόνο 1 λεπτό! →"
```

---

## 3. Achievement Popup System ✅ LIVE (session 20)

Modal opens **10 seconds after** the Published screen mounts when the new `suggestion_count` matches one of the trigger thresholds.

### Live trigger table (server-side, `app/api/suggestions/route.ts`)

```
count   variant       target   badge unlocked at target
─────   ───────────   ──────   ────────────────────────
  1     progress       3       Verified (emerald shield)
  2     progress       3       Verified
  3     tier_unlock    3       ✓ Verified UNLOCKED
  7     progress      10       Έμπειρος (blue star)
  9     progress      10       Έμπειρος
 10     tier_unlock   10       ✓ Έμπειρος UNLOCKED
 22     progress      25       Expert (violet diamond)
 24     progress      25       Expert
 25     tier_unlock   25       ✓ Expert UNLOCKED
 47     progress      50       Platinum (slate crown)
 49     progress      50       Platinum
 50     tier_unlock   50       ✓ Platinum UNLOCKED
```

### Copy ladder (`AchievementUnlockedModal.tsx`)

**Progress variant** — title depends on `(count, target, remaining)`:

| Condition | Title |
|---|---|
| `count === 1` | "Μόλις έκανες την πρώτη σου πρόταση!" |
| `target ≤ 3 && remaining === 1` | "Καταπληκτική αρχή!" |
| `target ≥ 10 && remaining === 1` | "Είσαι πολύ κοντά!" |
| `target ≥ 10 && remaining > 1` | "Τα πας περίφημα!" |

Body: `"N ακόμα προτάσεις για [Tier]"` + dashed progress dots over `[target - dotCount + 1 .. target]` where `dotCount = max(3, remaining + 1)`.

**Tier-unlock variant** — title `"Τα κατάφερες!"` + ordinal subtitle:

| Tier | Subtitle | Badge color |
|---|---|---|
| Verified (3) | "Το πρώτο επίτευγμα είναι δικό σου" | `#1D9E75` emerald |
| Έμπειρος (10) | "Απέκτησες και δεύτερο επίτευγμα" | `#3B82F6` blue |
| Expert (25) | "Τρίτο επίτευγμα — απίθανο επίπεδο" | `#7C3AED` violet |
| Platinum (50) | "Platinum — το ανώτερο επίπεδο" | `#64748B` slate |

### Variants you can add

| Condition | Copy variant | Status |
|---|---|---|
| `count = 100` | "Centurion — 100 προτάσεις 🏛" + new badge | ❌ Not built |
| `count` matches `5/15/20/30/35/40` | Mid-tier progress milestones | ❌ Not built |
| `consecutive_days ≥ 7 AND count matches trigger` | Adds "+ 7 μέρες σερί" badge to modal | ❌ Not built |
| `category_streak >= 5` (5 in same category) | "Specialist της [category]" mini-badge | ❌ Not built |
| First suggestion in a **new** category | "Εξερευνητής — πρώτη φορά στα [category]" | ❌ Not built |

### Structure (frozen)
```
[Backdrop — coral haze]
[Laurel SVG left + right at 30% opacity]
[Badge — colored at 110px (unlock) / greyscaled (progress)]
[Sparkles — 4 staggered pop-ins, tier-colored]
[Title]
[Subtitle]
[Progress dots]   ← progress variant only
[Body line]
[X close in corner — no auto-dismiss, no primary CTA]
```

---

## 4. Variable Reward System

The home feed must never look the same twice. Rules:

- **Carousel order** rotates based on: time of day, recent activity, trending, and randomization
- **"Tailored for You"** section shows different reasoning each visit: "Because you liked X", "Trending in [city]", "Your friends are watching", "Hidden gem"
- **Quick Jumps** in search rotate based on season, trending, and personal history
- **Discovery card** — once per session, show something completely outside user's usual categories: "Κάτι διαφορετικό για σένα →"

---

## 5. FOMO Triggers

### Activity Feed Teaser
When user returns after absence, show before home feed loads:

```
"[N] νέες προτάσεις από τότε που έφυγες
[User1], [User2] και [N] ακόμα ήταν ενεργοί →"
```

### Leaderboard Position Change
Weekly notification if position changed:

```
"Ανέβηκες [N] θέσεις στο leaderboard αυτή την εβδομάδα! 
Τώρα είσαι #[rank]. [Δες το leaderboard →]"
```

Or if dropped:
```
"[User] σε πέρασε στο leaderboard. Κάνε μια πρόταση για να ανέβεις ξανά!"
```

### Limited Time Events
```
"Τελευταία ευκαιρία: [Event] λήγει σε 2 μέρες!"
```

---

## 6. Engagement Rules (Non-Negotiable)

1. **Max 2 notifications per day** per user — never spam
2. **Respect quiet hours** — no push notifications 23:00–09:00
3. **Smart batching** — if multiple triggers fire same day, send the most relevant one
4. **Easy opt-out** — every notification type is individually toggleable in settings
5. **No dark patterns** — misleading urgency or fake social proof is forbidden
6. **Real numbers only** — never show inflated counts
7. **Progressive permission** — ask for push notification permission only after user has made first suggestion (they have something to lose)
8. **Never interrupt a flow** — in-app hooks appear only between actions, never during submission or search

---

## 7. Implementation Notes

### Notification Queue
```typescript
// Priority order when multiple notifications would fire same day:
1. Achievement unlock (highest priority)
2. Direct social (someone commented/followed you)
3. Content you care about (new season, event reminder)
4. Engagement nudge (streak, level progress)
5. Re-engagement (lowest priority, only if nothing else fires)
```

### Timing Logic
```typescript
// Smart delay — don't send at inconvenient times
const smartDelay = (baseDelay: number) => {
  // Add delay to reach next 10:00 or 18:00 window
  // Never send during 23:00–09:00
  // Weekend nudges shift to Saturday/Sunday morning
}
```

### A/B Testing Hooks
Track which messages perform best:
- Open rate per message variant
- Conversion rate (did user take the intended action?)
- Opt-out rate per notification type

---

*This file is a living document. Add new hook ideas here before implementing.*

---

## 8. Duplicate Submission Hook ✅ LIVE

When user tries to submit something already on the platform,
turn the "dead end" into an engagement opportunity.

### If item exists — suggested by others
```
"Το [item] έχει ήδη προταθεί!"

[★ Βαθμολόγησέ το]        → opens rating modal
[+ Ακολούθησε @[user]]    → follow the original suggester
[✏️ Προτείνε κάτι άλλο]   → resets submission flow
```

### If item exists — suggested by the same user
```
"Το έχεις ήδη προτείνει εσύ! 😄"

[Δες την πρότασή σου →]   → navigates to their suggestion
[✏️ Προτείνε κάτι άλλο]   → resets submission flow
```

### Hook value
- Converts failed submission into rating action
- Converts failed submission into follow action
- Never leaves user with nothing to do
- "Ακολούθησε" only shows if user doesn't already follow the suggester

---

## 9. DB-driven Moments — architecture ✅ SHIPPED (session 21)

**Goal:** move every hook's copy + trigger + active flag out of hardcoded code into a `moments` table so you can iterate on celebrations from `/admin/moments` without a code deploy.

**What shipped in session 21:**
- Migration 026 (`moments` + `moment_events`) + 027 (14 seed rows porting current hardcoded copy verbatim)
- `lib/moments/` data layer — types, registry of 7 predicates, resolver with variant-group selection + priority sort, placeholder renderer (`{count}`, `{remaining}`, `{ordinal}`, `{category_list_noun}`, …, plus `**bold**` markdown)
- `/api/suggestions` and `/api/bookmarks` now consume the resolver — achievement modal + bookmark celebration fully DB-driven
- `/admin/moments` page with list (grouped by trigger event), inline edit drawer, live preview pane (renders each surface with sample data), per-row last-7d stats badge
- Admin API: `GET/POST /api/admin/moments`, `GET/PATCH/DELETE /api/admin/moments/[id]`, `GET /api/admin/moments/stats`, `GET /api/admin/moments/registry`

**Hardcoded surfaces still to migrate** (each ~30 min):
- Duplicate submission hook (`SuggestionOverlay` duplicate screen)
- Toast copy across the app (currently inline strings)
- Notifications page copy
- Profile progress bar copy

Same pattern: add a `trigger_event` value to migration 026's CHECK constraint, write a predicate function, seed the row, refactor the consumer.

### What stays in code

- **Predicate functions** — pure TypeScript functions registered by `predicate_key`. Each takes the event payload + user context and returns `true|false`. Examples:
  - `bookmarkers_count_gte_100`
  - `category_bookmark_count_eq` (parameterised on category + N)
  - `user_first_in_category`
  - `event_within_n_days` (parameterised on N)
  - `suggestion_count_eq` (parameterised on N — replaces the hardcoded TRIGGERS table)
- **Copy template interpolation** — `lib/moments/render.ts` resolves `{count}` / `{handle}` / `{category}` / `{first_name}` placeholders.
- **Display adapters** — `<AchievementUnlockedModal>`, `<BookmarkSavedModal>`, `<Toast>`, `<Banner>` each declare which template slots they consume (`title`, `subtitle`, `body`, `cta_label`, `cta_href`).

This bound keeps the predicate logic safe (no SQL injection via JSONB conditions) and lets the admin invent new variants for any predicate that's already wired.

### Schema sketch

```sql
CREATE TABLE moments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text NOT NULL UNIQUE,           -- 'bookmark.hot', 'achievement.tier_unlock_3'
  surface         text NOT NULL CHECK (surface IN (
                    'achievement_modal','bookmark_modal','toast','banner','published_pill','notification')),
  trigger_event   text NOT NULL CHECK (trigger_event IN (
                    'suggestion_published','bookmark_created','rating_submitted',
                    'follow_created','search_logged','dormant_14d','event_tomorrow',
                    'series_new_season','daily_first_open')),
  predicate_key   text NOT NULL,                  -- references a registered TS function
  predicate_args  jsonb NOT NULL DEFAULT '{}',    -- parameters passed to the predicate
  copy            jsonb NOT NULL,                 -- { title, subtitle, body, cta_label, cta_href }
  display         jsonb NOT NULL DEFAULT '{}',    -- { delay_ms, auto_dismiss_ms, dark_theme }
  priority        int NOT NULL DEFAULT 100,       -- higher wins when multiple moments match
  variant_group   text,                            -- moments sharing this id are A/B variants — one randomly picked
  is_active       boolean NOT NULL DEFAULT true,
  valid_from      timestamptz,
  valid_until     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id)
);

CREATE INDEX idx_moments_lookup
  ON moments (trigger_event, is_active)
  WHERE is_active = true;

-- Per-user audit so we can throttle, prevent duplicates, and A/B-test conversion.
CREATE TABLE moment_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id       uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fired_at        timestamptz NOT NULL DEFAULT now(),
  payload         jsonb,                          -- the event that triggered it (item_id, count, etc.)
  cta_clicked     boolean NOT NULL DEFAULT false,
  dismissed_at    timestamptz
);
CREATE INDEX idx_moment_events_user ON moment_events (user_id, fired_at DESC);
CREATE INDEX idx_moment_events_moment ON moment_events (moment_id, fired_at DESC);
```

### Resolver flow

```
event fires (e.g. POST /api/bookmarks succeeds)
   │
   ▼
resolveMoments(trigger_event, payload, user) :
   ├─ SELECT * FROM moments WHERE trigger_event = $1 AND is_active
   ├─ For each row:
   │    predicateFn = REGISTRY[row.predicate_key]
   │    if predicateFn(payload, user, row.predicate_args) → keep
   ├─ Group by variant_group, pick one per group (weighted random when multiple variants share a group)
   ├─ Sort remaining by priority DESC
   ├─ Apply throttle (max 1 modal per surface per event)
   └─ Return [{ surface, copy (interpolated), display }, …]
   │
   ▼
each surface renders its matching moment
```

### Admin UI — `/admin/moments`

- **List view** — table grouped by `trigger_event`, with badges for surface + active state, click-to-edit row
- **Edit view** — form with: key (slug, immutable after create), surface (select), trigger_event (select), predicate_key (select from registry), predicate_args (json editor with schema hints), copy (title/subtitle/body/CTA fields with placeholder reference card), display (delay_ms + auto_dismiss_ms + dark_theme toggle), priority (number), variant_group (text), valid_from/until (date pickers), is_active (toggle)
- **Preview pane** — renders the moment in the chosen surface with sample data so you can see the output before saving
- **Stats column on list** — last 7d: fires / CTA click rate / dismiss rate (joins `moment_events`)

### What to migrate first

Seed the table from the existing hardcoded triggers — exactly one row per current variant. Then refactor consumers to call the resolver:

| Hardcoded today | Becomes |
|---|---|
| `TRIGGERS` table in `app/api/suggestions/route.ts` | 12 rows in `moments` with `trigger_event='suggestion_published'`, `predicate_key='suggestion_count_eq'` |
| Bookmark default copy in `BookmarkSavedModal` | 1 row `predicate_key='always'` with category-aware copy via `{category_label}` placeholder |
| Bookmark per-category labels in `lib/bookmarks/labels.ts` | Stays in code (it's structural data, not copy variants) — placeholder resolver pulls from it |
| 10s Published delay | `moments.display.delay_ms = 10000` on the achievement rows |

### Open design call (your decision)

**Predicate args — JSONB schema vs flat columns?** JSONB is more flexible (any predicate can declare any args) but harder to validate in the admin UI. Flat columns (`predicate_n_int`, `predicate_n_text`, etc.) are clunky but typesafe. **My pick: JSONB + a `predicate_schemas` registry exposed to the admin form so the UI knows which fields to render per predicate_key.**

**Once you confirm this design, implementation order is:**
1. Migration `026-moments-table.sql` + `027-moment-events.sql`
2. `lib/moments/` (registry, resolver, render helpers)
3. Seed migration with current hardcoded moments
4. Refactor existing consumers (achievement + bookmark) to use resolver
5. `/admin/moments` list + edit + preview
6. Stats panel (last)

Estimated: 1.5–2 sessions of focused work.

