-- Migration 027: seed moments table with the currently-hardcoded copy.
--
-- Ports two sets:
--   1. Achievement modal — 12 rows (counts 1, 2, 3, 7, 9, 10, 22, 24,
--      25, 47, 49, 50), copy matches AchievementUnlockedModal.tsx
--      buildCopy exactly so the visible result is identical on day 1.
--   2. Bookmark celebration — 1 default row + 1 "first bookmarker"
--      variant, copy matches BookmarkSavedModal.tsx.
--
-- Idempotent — uses ON CONFLICT DO UPDATE on `key` so re-running
-- refreshes the seed without duplicating.

-- ── Achievement modal — Verified tier (target=3) ─────────────────────

INSERT INTO moments (key, label, surface, trigger_event, predicate_key, predicate_args, copy, display, priority)
VALUES
('achievement.verified.count_1',
 'Achievement · 1η πρόταση (Verified ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 1}'::jsonb,
 jsonb_build_object(
   'title',    'Μόλις έκανες την πρώτη σου πρόταση!',
   'subtitle', 'Με ακόμη **{remaining}** προτάσεις αποκτάς το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'verified',
   'target',   3
 ),
 100),

('achievement.verified.count_2',
 'Achievement · 2η πρόταση (Verified ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 2}'::jsonb,
 jsonb_build_object(
   'title',    'Καταπληκτική αρχή!',
   'subtitle', 'Μένει ακόμη **1** πρόταση και αποκτάς το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'verified',
   'target',   3
 ),
 100),

('achievement.verified.unlock',
 'Achievement · Verified unlocked (3)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 3}'::jsonb,
 jsonb_build_object(
   'title',    'Τα κατάφερες!',
   'subtitle', 'Το πρώτο επίτευγμα είναι δικό σου',
   'body',     'Ολοκλήρωσες **{count}** προτάσεις και τώρα οι υπόλοιποι γνωρίζουν ότι συμβάλλεις πραγματικά στην κοινότητα του proteino'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'tier_unlock',
   'badge',    'verified',
   'target',   3
 ),
 100),

-- ── Achievement modal — Gold tier (target=10) ────────────────────────

('achievement.gold.count_7',
 'Achievement · 7η πρόταση (Gold ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 7}'::jsonb,
 jsonb_build_object(
   'title',    'Τα πας περίφημα!',
   'subtitle', 'Με ακόμη **{remaining}** προτάσεις φτάνεις το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'gold',
   'target',   10
 ),
 100),

('achievement.gold.count_9',
 'Achievement · 9η πρόταση (Gold ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 9}'::jsonb,
 jsonb_build_object(
   'title',    'Είσαι πολύ κοντά!',
   'subtitle', 'Μένει ακόμη **1** πρόταση και αποκτάς το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'gold',
   'target',   10
 ),
 100),

('achievement.gold.unlock',
 'Achievement · Gold unlocked (10)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 10}'::jsonb,
 jsonb_build_object(
   'title',    'Τα κατάφερες!',
   'subtitle', 'Απέκτησες και {ordinal} επίτευγμα',
   'body',     'Ολοκλήρωσες **{count}** προτάσεις και τώρα οι υπόλοιποι αναγνωρίζουν την αξία σου και τη συνεισφορά σου στην κοινότητα του proteino'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'tier_unlock',
   'badge',    'gold',
   'target',   10
 ),
 100),

-- ── Achievement modal — Expert tier (target=25) ──────────────────────

('achievement.expert.count_22',
 'Achievement · 22η πρόταση (Expert ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 22}'::jsonb,
 jsonb_build_object(
   'title',    'Τα πας περίφημα!',
   'subtitle', 'Με ακόμη **{remaining}** προτάσεις φτάνεις το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'expert',
   'target',   25
 ),
 100),

('achievement.expert.count_24',
 'Achievement · 24η πρόταση (Expert ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 24}'::jsonb,
 jsonb_build_object(
   'title',    'Είσαι πολύ κοντά!',
   'subtitle', 'Μένει ακόμη **1** πρόταση και αποκτάς το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'expert',
   'target',   25
 ),
 100),

('achievement.expert.unlock',
 'Achievement · Expert unlocked (25)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 25}'::jsonb,
 jsonb_build_object(
   'title',    'Τα κατάφερες!',
   'subtitle', 'Απέκτησες και {ordinal} επίτευγμα',
   'body',     'Ολοκλήρωσες **{count}** προτάσεις και τώρα οι υπόλοιποι αναγνωρίζουν την αξία σου και τη συνεισφορά σου στην κοινότητα του proteino'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'tier_unlock',
   'badge',    'expert',
   'target',   25
 ),
 100),

-- ── Achievement modal — Platinum tier (target=50) ────────────────────

('achievement.platinum.count_47',
 'Achievement · 47η πρόταση (Platinum ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 47}'::jsonb,
 jsonb_build_object(
   'title',    'Τα πας περίφημα!',
   'subtitle', 'Με ακόμη **{remaining}** προτάσεις φτάνεις το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'platinum',
   'target',   50
 ),
 100),

('achievement.platinum.count_49',
 'Achievement · 49η πρόταση (Platinum ladder)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 49}'::jsonb,
 jsonb_build_object(
   'title',    'Είσαι πολύ κοντά!',
   'subtitle', 'Μένει ακόμη **1** πρόταση και αποκτάς το {ordinal} σου επίτευγμα',
   'body',     'Με τις προτάσεις σου βοηθάς και άλλους να ανακαλύψουν συναρπαστικά πράγματα'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'progress',
   'badge',    'platinum',
   'target',   50
 ),
 100),

('achievement.platinum.unlock',
 'Achievement · Platinum unlocked (50)',
 'achievement_modal',
 'suggestion_published',
 'suggestion_count_eq',
 '{"n": 50}'::jsonb,
 jsonb_build_object(
   'title',    'Τα κατάφερες!',
   'subtitle', 'Απέκτησες και {ordinal} επίτευγμα',
   'body',     'Ολοκλήρωσες **{count}** προτάσεις και τώρα οι υπόλοιποι αναγνωρίζουν την αξία σου και τη συνεισφορά σου στην κοινότητα του proteino'
 ),
 jsonb_build_object(
   'delay_ms', 10000,
   'variant',  'tier_unlock',
   'badge',    'platinum',
   'target',   50
 ),
 100),

-- ── Bookmark celebration ──────────────────────────────────────────────
-- Default — fires for every bookmark save. Category-aware copy via
-- the {category_list_noun} placeholder ("ταινίες", "βιβλία", …) so the
-- single row covers all 9 categories.

('bookmark.default',
 'Bookmark · Default save celebration',
 'bookmark_modal',
 'bookmark_created',
 'always',
 '{}'::jsonb,
 jsonb_build_object(
   'title',    'Αποθηκεύτηκε στις {category_list_noun} σου!',
   'subtitle', '',
   'body',     ''
 ),
 jsonb_build_object(
   'auto_dismiss_ms', 5000
 ),
 50),

-- First-mover variant. Higher priority so it beats the default when
-- the user is the first bookmarker of this item.
('bookmark.first_bookmarker',
 'Bookmark · Είσαι ο πρώτος που το αποθηκεύει',
 'bookmark_modal',
 'bookmark_created',
 'bookmarkers_count_zero',
 '{}'::jsonb,
 jsonb_build_object(
   'title', 'Αποθηκεύτηκε στις {category_list_noun} σου!',
   'body',  'Είσαι ο πρώτος που το αποθηκεύει 🚀'
 ),
 jsonb_build_object(
   'auto_dismiss_ms', 5000
 ),
 150)

ON CONFLICT (key) DO UPDATE SET
  label          = EXCLUDED.label,
  surface        = EXCLUDED.surface,
  trigger_event  = EXCLUDED.trigger_event,
  predicate_key  = EXCLUDED.predicate_key,
  predicate_args = EXCLUDED.predicate_args,
  copy           = EXCLUDED.copy,
  display        = EXCLUDED.display,
  priority       = EXCLUDED.priority,
  updated_at     = now();
