# Proteino — Admin Panel Specification

> ✅ IN PROGRESS — Shell, routing, and core pages built. Data layer pending.
> Route: `/admin` — protected, requires admin role in public.users.role

This file documents the complete admin panel architecture and implementation status.
The admin panel is the back-office for administrators to manage
all platform content, structure, metadata, and what users see on the front page.

---

## Core Principle

> "The admin controls everything that appears on the platform —
> content, structure, metadata, and what users see on the front page."

Admins never touch code. Everything is managed through the admin UI.

---

## Implementation Status

| Section | Status | Notes |
|---|---|---|
| Shell & Layout | ✅ Done | Sidebar, routing, responsive desktop layout |
| Overview | ✅ Done | Dashboard with stats cards, quick actions |
| Categories | ✅ Done | List + drill-down + create/edit form |
| Suggestions | ✅ Done | List table + full editor with category-specific ExtraFields |
| Extra Fields | ✅ Done | Table per category with values management |
| Content: Collections | ✅ Done | List + create flow + live mobile preview |
| Content: Activities | ✅ Done | Table + New Activity + New Category/Type form |
| Content: Movies Tonight | ✅ Done | Table with inline edit/remove + New Movie form |
| Content: Filters | ✅ Done | Explorer + Frontend filter config per category |
| Reviews | ✅ Done | Table with moderation actions |
| Users | ✅ Done | Table with user management |
| Settings | ⏳ Skeleton | Page exists, no screenshot reference yet |

---

## 1. Navigation Structure

✅ Built as a fixed sidebar (`AdminSidebar`) with these routes:

```
Proteino (logo)
├── Overview          → /admin
├── Categories        → /admin/categories
├── Suggestions       → /admin/suggestions
├── Extra Fields      → /admin/extra-fields
├── Content
│   ├── Collections   → /admin/content/collections
│   ├── Activities    → /admin/content/activities
│   ├── Filters       → /admin/content/filters
│   └── Movies Tonight → /admin/content/movies-tonight
├── Reviews           → /admin/reviews
├── Users             → /admin/users
└── Settings          → /admin/settings
```

---

## 2. Overview (Home) ✅

Quick dashboard with:
- **Stats cards:** Reviews Unresolved (red badge), Last Day Suggestions, Movies Tonight count
- **Quick create buttons:** + Category, + ExtraField, + Collection, + Activity

---

## 3. Categories ✅

### Categories List
Table with: Category icon, Name, Subcategories count, Suggestions count, Reviews count, Publish status, Edit link.

All 9 platform categories: Βιβλίο, Ταινίες, Σειρές, Συνταγές, Καφέ/Μπαρ, Φαγητό, Θέατρο, Εκδηλώσεις, Διαμονή.

### Category Drill-down (e.g. Categories / Βιβλίο)
Stats bar: Subcategories, Suggestions, Reviews, Users, Reports.
Table of subcategories with: Name, Suggestions count, Reviews count, Extra Fields count, Published status, Edit link.

### Create/Edit Category (subcategory = tag/attribute)
- Publish: Active / Inactive toggle
- Parent Category: dropdown (selects which of the 9 categories this belongs to)
- Title: text input
- Alias: auto-generated slug
- Description: textarea (for SEO)
- Save / Cancel

---

## 4. Suggestions ✅

Suggestions = the items on the platform (books, movies, restaurants etc).
Each suggestion was submitted by a user or created by admin.

### Suggestions List
Table with: Title, Category, Subcategory, Author, Created date, Published status, Edit link.
Filters: by category, by status, by date range, search by title.

### Edit Suggestion (SuggestionEditor component)
**Header section:**
- Title (text input)
- Alias (auto-generated slug)
- Category (dropdown — all 9 categories)
- Subcategory (dropdown — dynamically populated based on category selection)
- Publish: YES / NO toggle
- Author (dropdown — which user submitted this)
- Created (datetime)
- Published (datetime)
- Rating stats: average ★, total ratings count, total reviews count, distribution bar chart (5★/4★/3★/2★/1★ with percentages)

**Subcategory values per category:**
- Movies: Δράμα, Κωμωδία, Θρίλερ, Δράση, Sci-Fi, Ρομαντική, Animation, Ντοκιμαντέρ, Horror, Βιογραφική
- Series: Δράμα, Κωμωδία, Crime, Sci-Fi, Θρίλερ, Ρομαντική, Ντοκιμαντέρ, Mini-series, Animation
- Books: Μυθιστόρημα, Θρίλερ, Sci-Fi, Ιστορία, Αυτοβιογραφία, Ψυχολογία, Φιλοσοφία, Self-help, Ποίηση, Business, Παιδικά
- Recipes: Κυρίως Πιάτο, Ορεκτικά, Επιδόρπια, Breakfast, Ψητά, Σαλάτες, Σούπες, Γλυκά, Ψωμί & Ζύμες
- Food: Ελληνική, Ιταλική, Ασιατική, Burger, Sushi, Fine Dining, Brunch, Vegan, Seafood, Street Food, Middle Eastern
- Bars: Cocktail Bar, Wine Bar, Jazz Bar, Rooftop, Beach Bar, Coffee, Speakeasy, Pub, All-Day, Sports Bar
- Hotels: Dynamic destinations (Αθήνα, Κρήτη, Θεσσαλονίκη, Σαντορίνη, Μύκονος, Ρόδος, κτλ)
- Theater: Θέατρο, Μιούζικαλ, Stand-up, Μονόπρακτο, Παιδικό
- Events: Συναυλία, Festival, Έκθεση, Stand-up, Workshop, Sports

**Description:**
Rich text editor (Heading, Bold, Italic, Underline, Strikethrough, Lists, Link, Image, Table, Attachment)

**Media section (category-aware):**
Different tabs and modes per category:
- Movies/Series/Books: Portrait | Landscape | Trailer (single mode — one image per tab)
- Food: Εξωτερικά | Εσωτερικά | Πιάτα (gallery mode — multiple photos per tab)
- Bars: Εσωτερικά | Εξωτερικά (gallery mode)
- Hotels: Δωμάτια | Κοινόχρηστοι | Εξωτερικά (gallery mode)
- Theater/Events: Landscape | Trailer (single mode)

Gallery mode: drag & drop to reorder, first image = default. Each photo has Change/Delete.
Single mode: one image with Change/Delete buttons, filename shown.
Trailer tab: YouTube + Vimeo URL inputs (not image upload).

**Extra Fields section (varies by category):**

MOVIES:
- Year, Duration (top row)
- Country (autocomplete input with datalist of 48 countries, multiple with + button)
- Director (text input with + button for multiple)
- Actors (grid with avatar circle + name input per actor, hover to change avatar, "Add Actor" button)
- Awards (split by type: Oscar, BAFTA, Golden Globe, Cannes — each with predefined category dropdown + year)
- Attributes: checkboxes (Based on true events, Based on a book, Remake, Sequel, Prequel, Contains violence, Contains sex, Classic, Independent film, Black & White, Foreign language, Animated)
- Plot (textarea)

SERIES:
- Seasons (No, Released, End, Info — 4 fields)
- Attributes: checkboxes (Contain UFO, Based on true events, Contain SEX, Series of one season, Contain Religion, Series is completed)
- Country (autocomplete input with datalist, multiple with + button)
- Streaming: Netflix, Disney+, Prime, YouTube (logo + title input per platform)
- Actors (8 dropdown slots)
- Awards (8 dropdown slots)
- Plot (textarea)

BOOKS:
- Author, Editor/Publisher, Language, Pages, Released (5 fields)
- Plot (textarea)
- Buy links (e.g. Public bookstore URL)
- Author Info card: photo circle + Name, Age, Books count, Biography textarea

FOOD:
- Address + lat/lng OR drag & drop on map
- Region (dropdown), Area (dropdown)
- Telephone, Information URL, Source (dropdown)
- Attributes: checkboxes (Parking, Wi-Fi, Outdoor Seating, Kid Friendly, Pet Friendly, Reservations, Takeaway, Delivery, Live Music, Accessible, Smoking Area, Credit Cards)
- Delivery links: efood, Wolt, Box (URL per platform)

BARS/CAFES:
- Address + lat/lng OR drag & drop on map
- Region (dropdown), Area (dropdown)
- Telephone, Information URL, Source (dropdown)
- Type: radio buttons (Cocktail Bar, Wine Bar, Jazz Bar, Rooftop, Beach Bar, Coffee Shop, Speakeasy, Pub, All-Day, Sports Bar)
- Attributes: checkboxes (Parking, Wi-Fi, Outdoor Seating, Live Music, DJ, Pet Friendly, Reservations, Smoking Area, Accessible, Credit Cards, Happy Hour, Late Night)

HOTELS:
- Address + lat/lng OR drag & drop on map
- Region (dropdown), Area (dropdown)
- Telephone, Information URL, Source (dropdown)
- Type: visual radio (Διαμέρισμα, Δωμάτιο, Camping, Μονοκατοικία, Ξενοδοχείο)
- Amenities (3-column checkboxes):
  - Παροχές: Pool, Bar, Restaurant, Parking, Breakfast
  - Δωμάτιο: Sea view, Mountain View, Wifi
  - Extra: Pet Friendly, Disabilities, Transfer
- Availability: Booking.com URL (+ add more)

RECIPES:
- Ingredients table: drag-reorder rows, columns: #, Ποσότητα, Μονάδα (dropdown), Υλικό (autocomplete), Link, Remove
- Steps: numbered list with textarea per step, add/remove
- Tips: numbered list with textarea, add/remove
- Chef, Website, Level (dropdown), Calories
- Duration split into:
  - Χρόνος Προετοιμασίας (Ώρες + Λεπτά inputs)
  - Χρόνος Ψησίματος (Ώρες + Λεπτά inputs)
- Nutrition checkboxes: Vegan, Milk, Sugar, Gluten Free, Nut Free

THEATER/EVENTS:
- Type: Single / Tour (radio)
- Writer, Director, Year
- Place (dropdown) + Address + lat/lng OR map
- Actors (8 dropdown slots)
- Dates table: Availability (Υψηλή/Χαμηλή/Εξαντλημένα), From, To, Price + add/remove
- Ticket/Buy URL
- Ads section: Active/Inactive toggle, URL, Text, Buy link, live preview

---

## 5. Extra Fields ✅

Management of the metadata field definitions per category.
These are the fields that appear in the Suggestions edit form.

### Extra Fields List
Tabs: Αρχική | Βιβλίο | Ταινίες | Σειρές | Φαγητό | Καφέ/Μπαρ | Συνταγές | Θέατρο | Εκδηλώσεις | Διαμονή

Table columns: Title, Type (Dropdown/Textarea/Date/Number), Values (count or range), Image (icon), Published status, Edit link.

### Create/Edit Extra Field
- Title (e.g. "Actor")
- Type: Dropdown / Textarea / Date / Number / Checkbox / URL
- Category: which category this field belongs to
- Published: Active / Inactive
- For Dropdown type: manage the list of values (add/edit/delete/reorder)
  - Each value can have: name, image/icon

---

## 6. Content

### 6A. Collections ✅
Collections are the **dynamic sections** that appear on:
- Home page feed (carousels, themed cards)
- Category page headers (themed cards at top)
- Category page sections (carousels within category)

**Two collection types:**

**Card** (>10 items):
- Appears as a themed card in category page or home
- Shows: icon/logo + title + description

**Carousel** (4-10 items):
- Horizontal scroll section with item cards
- Shows title + horizontal scroll of poster cards

**Collections List:**
- Filter by category tabs
- Sub-filter: Card | Carousel
- Drag & drop to reorder (determines display order on frontend)
- Each collection: logo/icon + title + subtitle + Active toggle + Edit link
- **Live mobile preview** panel on the right showing how it looks on device

**Create Collection flow:**
Step 1: Choose type — Card or Carousel (with visual preview of each)
Step 2: Fill details: Title, subtitle, icon, category, position, items search, valid dates, active toggle

### 6B. Activities ✅
Nearby activities associated with venues/hotels.

**Activities List:**
- Category tabs: Αθλητικές | Εκπαιδευτικές | Ψυχαγωγικές | Αξιοθέατα
- Type filter chips: ALL | ΣΚΙ | MOUNTAIN BIKE | RAFTING | ΟΡΕΙΒΑΣΙΑ | ΠΕΖΟΠΟΡΙΑ
- Table: Type, Name, Location (Google Maps), Info (Website/Facebook/Instagram), Published, Edit
- Header buttons: "New Activity" + "New Category/Type"

**New Category/Type form:**
- Radio toggle: Category or Type
- If Type selected → Category dropdown + Title + Image upload area
- If Category selected → Title only
- Save / Cancel

### 6C. Filters ✅
Two-purpose tool for managing platform filters:

**1. Explorer (left panel):**
- Category tabs at top (all 9 categories)
- All attributes for the selected category shown as filter dropdowns/checkboxes
- Shows count of matching suggestions per value
- Result box: total matching count + visual indicator for Card (>10) or Carousel (4-10)
- Purpose: admin filters content to decide how to organize collections

**2. Frontend Filter Config (right panel):**
- Table of all available attributes per category
- Two toggle columns: "Quick Filter" (chip visible on category page) + "Bottom Sheet" (inside ⊞ Φίλτρα panel)
- Badge counts for active quick filters and bottom sheet filters
- Live preview showing how the filter row will look on the frontend
- "Save Configuration" button

Available attributes vary per category (genre, platform, region, price, duration, etc.).

### 6D. Movies Tonight ✅
Admin manually marks which movies are showing on TV tonight.

**Features built:**
- "Today" section with count badge + table of movies
- "This week" section with count badge + table of movies
- Inline editing: click "Επεξεργασία" → row becomes editable (title input, channel dropdown, date picker, time picker) with Save/Cancel
- Remove button per row
- "New Movie" form card: Title, Channel (dropdown: MEGA, ΕΡΤ1, ΕΡΤ2, ΕΡΤ3, ANT1, ALPHA, STAR, ΣΚΑΪ, OPEN), Date, Time
- "Edit Channels" button placeholder

---

## 7. Reviews ✅

List of all user ratings and reviews across the platform.
Admin can: approve, reject, flag, delete reviews.
Shows: unresolved count on Overview dashboard (red badge).

Table: Item, User, Rating (★), Review text, Date, Status (Resolved/Unresolved), Actions.

---

## 8. Users ✅

List of all registered users.
Columns: Avatar, Name, Email, Handle, Role, Suggestions count, Reviews count, Joined date, Status, Edit link.

Admin can:
- View user profile
- Change role (user / moderator / admin)
- Suspend/ban user
- See user's suggestions and reviews

---

## 9. Settings ⏳

Platform-wide settings (skeleton page exists):
- Site name, description, logo
- Email configuration
- Notification settings
- API keys (TMDB, Google Places, etc.)
- Maintenance mode

---

## 10. Technical Implementation

### Route Structure
```
app/admin/
├── layout.tsx              (sidebar + main content area)
├── page.tsx                (Overview)
├── categories/
│   ├── page.tsx            (Categories list)
│   └── [slug]/page.tsx     (Category drill-down)
├── suggestions/
│   ├── page.tsx            (Suggestions list)
│   └── [id]/page.tsx       (Edit suggestion)
├── extra-fields/page.tsx
├── content/
│   ├── collections/page.tsx
│   ├── activities/
│   │   ├── page.tsx
│   │   └── new-category-type/page.tsx
│   ├── filters/page.tsx
│   └── movies-tonight/page.tsx
├── reviews/page.tsx
├── users/page.tsx
└── settings/page.tsx
```

### Key Components
```
components/admin/
├── AdminSidebar.tsx              (fixed sidebar navigation)
├── OverviewDashboard.tsx         (stats + quick actions)
├── CategoriesTable.tsx           (categories list)
├── CategoryDetail.tsx            (category drill-down)
├── SuggestionsTable.tsx          (suggestions list)
├── SuggestionEditor.tsx          (full editor — ~1200 lines, category-aware)
├── ExtraFieldsTable.tsx          (extra fields management)
├── CollectionsPanel.tsx          (collections + live preview)
├── ActivitiesTable.tsx           (activities list)
├── ActivityCategoryTypeForm.tsx  (new category/type form)
├── MoviesTonightTable.tsx        (movies tonight CRUD)
├── ReviewsTable.tsx              (reviews moderation)
└── UsersTable.tsx                (users management)
```

### Design Decisions
- **Desktop-first**: Full-width layout, no mobile constraints
- **No FAB, no bottom nav** — sidebar navigation only
- **Category-aware Media**: `getMediaConfig(category)` returns different tabs and modes per category
- **Country autocomplete**: HTML `<datalist>` with 48 Greek-named countries — no external library needed
- **Actor avatars**: Auto-fetch from IMDB API (future), manual override via avatar circle hover
- **Awards by organization**: Predefined categories per award type (Oscar, BAFTA, Golden Globe, Cannes)
- **Recipe duration**: Split into prep time + cooking time, each with hours + minutes
- **Subcategory = tag**: Stored as metadata attribute, not a separate table. Dropdown dynamically populated based on selected category

### Route Protection
```typescript
// All /admin routes check:
// 1. User is authenticated
// 2. public.users.role === 'admin' || role === 'moderator'
// Redirect to / if not authorized
```

### Pending Work
1. **Settings page** — awaiting Figma design reference
2. **Real data layer** — connect all tables to Supabase (currently mock data)
3. **Database schema updates** — awards structure (type + category + year), recipe duration (prep_hours, prep_minutes, cook_hours, cook_minutes), actor avatars, filter_configs table
4. **API integrations** — IMDB for actor avatars, auto-fetch during enrichment

---

*Admin panel gives full control over platform content without touching code.*
*Everything visible on the frontend can be managed from here.*
