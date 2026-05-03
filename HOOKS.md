# Proteino — Engagement & Hook Mechanics

This file documents all hook patterns, notification triggers, and engagement mechanics.
Every new feature should be evaluated against these patterns.
Place this file in the project root alongside CLAUDE.md.

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

### 2A — Bookmark Moment
When a user bookmarks something, immediately show:

```
"Αυτή την πρόταση την έχουν αποθηκεύσει ακόμη 57 χρήστες!
Μάλλον ταιριάζετε — θες να δεις αν θα τους ακολουθήσεις; →"
```

**Rules:**
- Show only if count ≥ 5
- Show for max 3 seconds, then dismiss
- Tap → opens list of users who bookmarked, with follow buttons
- Don't show if user already follows all of them

### 2B — After Publishing Suggestion
Immediately after "PUBLISHED" screen:

```
"Η πρότασή σου είναι live! 
[N] άνθρωποι ακολουθούν αυτή την κατηγορία και μπορούν να τη δουν."
```

Then after 2 seconds:
```
"Ήσουν ο [Nth] που πρότεινε κάτι αυτή την εβδομάδα 🔥"
```

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

## 3. Achievement Popup System

Shown immediately after each suggestion is published.

### Badge Progression
```
Suggestions 1  → "Μόλις έκανες την πρώτη σου πρόταση!" · Progress 1/3 → Επαληθευμένος χρήστης
Suggestions 2  → "Καταπληκτική αρχή!" · Progress 2/3 → Επαληθευμένος χρήστης  
Suggestions 3  → 🏆 UNLOCK "Επαληθευμένος χρήστης" (green shield)
Suggestions 7  → "Τα πας περίφημα!" · Progress 1/3 → Έμπειρος χρήστης (7/10)
Suggestions 9  → "Είσαι πολύ κοντά!" · Progress 2/3 → Έμπειρος χρήστης (9/10)
Suggestions 10 → 🏆 UNLOCK "Έμπειρος χρήστης" (blue star)
Suggestions 25 → 🏆 UNLOCK "Αφοσιωμένος Curator" (gold crown)
Suggestions 50 → 🏆 UNLOCK "Proteino Expert" (diamond)
```

### Popup Structure
```
[Title — e.g. "Καταπληκτική αρχή!"]
[Progress dots — e.g. ● ● ○]
[Progress text — e.g. "Μένει ακόμα 1 πρόταση"]
[Badge preview — dimmed next badge]
[Motivational copy]
[Dismiss button]
```

### Celebration Screen (on unlock)
```
[Title — "Τα κατάφερες!"]
[Subtitle — "Απέκτησες νέο επίτευγμα"]
[Badge — animated, full color, pop-in]
[Badge name + description]
[Share achievement button] + [Dismiss]
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

## 8. Duplicate Submission Hook

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

