-- Migration 054: "similar items" on detail pages (Phase B day 2).
--
-- Adds the `_vector_similar_` related-section rule type: pgvector cosine
-- neighbours of the current item in the SAME category. Works for guests,
-- no LLM at request time. Items without an embedding simply get no
-- section (the resolver drops sections below min_items).
--
-- Needs item embeddings (scripts/embed-items.ts). Idempotent.

CREATE OR REPLACE FUNCTION public.similar_items(
  p_item_id uuid,
  p_limit   int DEFAULT 8
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT i.id, 1 - (i.embedding <=> q.embedding) AS similarity
    FROM public.items q
    JOIN public.items i
      ON i.category = q.category
     AND i.id <> q.id
   WHERE q.id = p_item_id
     AND q.embedding IS NOT NULL
     AND i.is_published = true
     AND i.embedding IS NOT NULL
   -- "+ 0" keeps the planner off the HNSW index: an index scan filtered
   -- by category can return far fewer than p_limit rows for small
   -- categories, and an exact scan over ~2K rows takes milliseconds.
   ORDER BY (i.embedding <=> q.embedding) + 0
   LIMIT LEAST(GREATEST(p_limit, 1), 24);
$$;

GRANT EXECUTE ON FUNCTION public.similar_items(uuid, int) TO anon, authenticated, service_role;

-- One rule per category. Admin can retitle / reorder / disable it at
-- /admin/related-sections. Ordered after the value-match rules and
-- before "nearby" (100).
INSERT INTO related_sections_config
  (category, field, title_template, min_items, item_limit, display_order, is_active)
VALUES
  ('movies',  '_vector_similar_', 'Ταινίες σαν αυτή',        3, 8, 90, true),
  ('series',  '_vector_similar_', 'Σειρές σαν αυτή',         3, 8, 90, true),
  ('books',   '_vector_similar_', 'Βιβλία σαν αυτό',         3, 8, 90, true),
  ('food',    '_vector_similar_', 'Παρόμοια μαγαζιά',        3, 8, 90, true),
  ('bars',    '_vector_similar_', 'Παρόμοια μαγαζιά',        3, 8, 90, true),
  ('hotels',  '_vector_similar_', 'Παρόμοια καταλύματα',     3, 8, 90, true),
  ('recipes', '_vector_similar_', 'Συνταγές σαν αυτή',       3, 8, 90, true),
  ('theater', '_vector_similar_', 'Παραστάσεις σαν αυτή',    3, 8, 90, true),
  ('events',  '_vector_similar_', 'Παρόμοιες εκδηλώσεις',    3, 8, 90, true)
ON CONFLICT (category, field) DO NOTHING;
