-- Migration 036: extend moments.trigger_event with 'review_published'
-- and seed 5 review-milestone celebrations (1st / 5th / 10th / 25th / 50th).
--
-- Mirrors the suggestion-milestone pattern from migration 027 — each row
-- targets a precise count via `review_count_eq` predicate, fires the
-- achievement_modal surface, reuses the same AchievementUnlockedModal.
-- The tier_unlock variant carries no progress-dots; the existing badge
-- icons (verified / gold / expert / platinum) are reused as visual
-- reward, with the under-hex label overridden via display.label_line1/2
-- so users don't see "Επαληθευμένος χρήστης" on a review celebration.
--
-- Idempotent — uses ON CONFLICT DO UPDATE on `key`.

-- ── 1. Extend trigger_event CHECK constraint ─────────────────────────

ALTER TABLE moments DROP CONSTRAINT IF EXISTS moments_trigger_event_check;
ALTER TABLE moments ADD CONSTRAINT moments_trigger_event_check
  CHECK (trigger_event IN (
    'suggestion_published',
    'bookmark_created',
    'bookmark_status_changed',
    'rating_submitted',
    'review_published',     -- NEW
    'follow_created',
    'search_logged',
    'dormant_14d',
    'event_tomorrow',
    'series_new_season',
    'daily_first_open'
  ));

-- ── 2. Seed the 5 review milestones ──────────────────────────────────

INSERT INTO moments (key, label, surface, trigger_event, predicate_key, predicate_args, copy, display, priority)
VALUES

-- 1st review
('achievement.review.first',
 'Achievement · Πρώτη αξιολόγηση',
 'achievement_modal',
 'review_published',
 'review_count_eq',
 '{"n": 1}'::jsonb,
 jsonb_build_object(
   'title',    'Πρώτη σου αξιολόγηση!',
   'subtitle', 'Καλωσόρισες στους reviewers του proteino',
   'body',     'Με τις αξιολογήσεις σου βοηθάς **άλλους χρήστες** να ανακαλύψουν αυτό που αξίζει'
 ),
 jsonb_build_object(
   'delay_ms',     2000,
   'variant',      'tier_unlock',
   'badge',        'verified',
   'target',       1,
   'label_line1',  'Πρώτη',
   'label_line2',  'αξιολόγηση'
 ),
 100),

-- 5th review
('achievement.review.five',
 'Achievement · 5 αξιολογήσεις',
 'achievement_modal',
 'review_published',
 'review_count_eq',
 '{"n": 5}'::jsonb,
 jsonb_build_object(
   'title',    'Πέντε αξιολογήσεις!',
   'subtitle', 'Παίρνεις φόρα — η φωνή σου μετράει',
   'body',     'Ολοκλήρωσες **{count}** αξιολογήσεις και τα μέλη της κοινότητας ξέρουν τη γνώμη σου'
 ),
 jsonb_build_object(
   'delay_ms',     2000,
   'variant',      'tier_unlock',
   'badge',        'verified',
   'target',       5,
   'label_line1',  '5',
   'label_line2',  'αξιολογήσεις'
 ),
 100),

-- 10th review
('achievement.review.ten',
 'Achievement · 10 αξιολογήσεις',
 'achievement_modal',
 'review_published',
 'review_count_eq',
 '{"n": 10}'::jsonb,
 jsonb_build_object(
   'title',    'Δέκα αξιολογήσεις!',
   'subtitle', 'Είσαι πλέον **Trusted Reviewer** στο proteino',
   'body',     'Ολοκλήρωσες **{count}** αξιολογήσεις και οι υπόλοιποι αναγνωρίζουν την κρίση σου'
 ),
 jsonb_build_object(
   'delay_ms',     2000,
   'variant',      'tier_unlock',
   'badge',        'gold',
   'target',       10,
   'label_line1',  'Trusted',
   'label_line2',  'Reviewer'
 ),
 100),

-- 25th review
('achievement.review.twentyfive',
 'Achievement · 25 αξιολογήσεις',
 'achievement_modal',
 'review_published',
 'review_count_eq',
 '{"n": 25}'::jsonb,
 jsonb_build_object(
   'title',    '25 αξιολογήσεις — εντυπωσιακό!',
   'subtitle', 'Είσαι από τις δυνατές φωνές της κοινότητας',
   'body',     'Με **{count}** αξιολογήσεις διαμορφώνεις πραγματικά την εμπειρία των άλλων χρηστών'
 ),
 jsonb_build_object(
   'delay_ms',     2000,
   'variant',      'tier_unlock',
   'badge',        'expert',
   'target',       25,
   'label_line1',  'Expert',
   'label_line2',  'Reviewer'
 ),
 100),

-- 50th review
('achievement.review.fifty',
 'Achievement · 50 αξιολογήσεις',
 'achievement_modal',
 'review_published',
 'review_count_eq',
 '{"n": 50}'::jsonb,
 jsonb_build_object(
   'title',    '50 αξιολογήσεις!',
   'subtitle', 'Είσαι **Top Reviewer** — από τους πιο ενεργούς στο proteino',
   'body',     'Με **{count}** αξιολογήσεις είσαι σταθερή και αξιόπιστη παρουσία στην κοινότητα'
 ),
 jsonb_build_object(
   'delay_ms',     2000,
   'variant',      'tier_unlock',
   'badge',        'platinum',
   'target',       50,
   'label_line1',  'Top',
   'label_line2',  'Reviewer'
 ),
 100)

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
