-- Migration: app_settings (key/value store for site config)
-- Run this in Supabase SQL Editor.
--
-- WHY:
-- Maintenance mode, site identity, and other operational toggles need a
-- central place admins can edit without redeploying. Key/value structure
-- keeps it future-proof — no schema migrations to add new settings.

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT 'null'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_app_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_settings_touch ON app_settings;
CREATE TRIGGER trg_app_settings_touch
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION touch_app_settings_updated_at();

-- RLS: public read for non-secret settings; admin writes via service-role.
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_public_read" ON app_settings;
CREATE POLICY "app_settings_public_read" ON app_settings
  FOR SELECT USING (true);

-- Default keys (admin can edit values via UI)
INSERT INTO app_settings (key, value, description) VALUES
  ('site_name',           '"Proteino"'::jsonb,     'Όνομα ιστοτόπου (header, metadata)'),
  ('site_tagline',        '"Ανακάλυψε. Πρότεινε. Εμπνεύσου."'::jsonb, 'Tagline στο footer & metadata'),
  ('maintenance_mode',    'false'::jsonb,          'Όταν true, εμφανίζει banner σε όλους τους χρήστες'),
  ('maintenance_message', '"Συντήρηση συστήματος. Επιστρέφουμε σε λίγο."'::jsonb, 'Μήνυμα όταν maintenance_mode=true')
ON CONFLICT (key) DO NOTHING;
