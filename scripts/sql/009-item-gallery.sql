-- Migration: items.images jsonb — multi-image gallery for venue categories
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Food / bars / hotels need multiple photos (interior, exterior, dishes/rooms).
-- Today only cover_url + poster_url + backdrop_url exist (single images each).
-- This adds a flat array of images each with url + optional alt + optional tab
-- grouping (Δωμάτια / Κοινόχρηστοι / Εξωτερικά for hotels, etc.).
--
-- SHAPE: items.images = [
--   { url: string, alt?: string, tab?: string }
-- ]
-- Order in array = display order. First image is the gallery default.

ALTER TABLE items ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;
