
-- ===== supabase/migrations/20260612120327_e5a8b94e-38c0-4c0c-8d9b-cecb16f6095b.sql =====

-- ============== Profiles ==============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  onboarded boolean NOT NULL DEFAULT false,
  start_date timestamptz NOT NULL DEFAULT now(),
  height_cm numeric(5,2),
  initial_weight_kg numeric(5,2),
  birth_date date,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_time text NOT NULL DEFAULT '20:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============== Habits ==============
CREATE TABLE public.habits (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  "trigger" text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX habits_user_id_idx ON public.habits(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== Day logs ==============
CREATE TABLE public.day_logs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  frozen jsonb NOT NULL DEFAULT '[]'::jsonb,
  mood smallint,
  stress smallint,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_logs TO authenticated;
GRANT ALL ON public.day_logs TO service_role;
ALTER TABLE public.day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own day_logs" ON public.day_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== Week freeze usage ==============
CREATE TABLE public.week_freeze_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key text NOT NULL,
  used smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.week_freeze_usage TO authenticated;
GRANT ALL ON public.week_freeze_usage TO service_role;
ALTER TABLE public.week_freeze_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own freezes" ON public.week_freeze_usage FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== Cycle settings ==============
CREATE TABLE public.cycle_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_period_start date NOT NULL,
  cycle_length smallint NOT NULL DEFAULT 28,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_settings TO authenticated;
GRANT ALL ON public.cycle_settings TO service_role;
ALTER TABLE public.cycle_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle" ON public.cycle_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== Journal entries ==============
CREATE TABLE public.journal_entries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX journal_user_idx ON public.journal_entries(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============== Auto profile on signup ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, ''), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== supabase/migrations/20260612120405_1b3b8bb5-e247-41cf-8b09-396540e560ee.sql =====
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ===== supabase/migrations/20260612122759_5c4dbcfb-1058-40c1-a4d8-2a299fa0ca71.sql =====
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.schedule_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  start_minute smallint NOT NULL,
  end_minute smallint NOT NULL,
  title text NOT NULL,
  habit_id text,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_minute >= 0 AND start_minute < 1440),
  CHECK (end_minute > start_minute AND end_minute <= 1440)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_blocks TO authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own schedule_blocks" ON public.schedule_blocks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX schedule_blocks_user_date_idx ON public.schedule_blocks (user_id, date);

CREATE TRIGGER schedule_blocks_set_updated_at
  BEFORE UPDATE ON public.schedule_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== supabase/migrations/20260612123155_ae4e7093-dade-481e-a7fd-43e2d9b2c539.sql =====
-- movement entries
CREATE TABLE public.movement_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('walking','activity')),
  steps integer,
  duration_minutes integer,
  distance_km numeric(6,2),
  activity_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (steps IS NULL OR steps >= 0),
  CHECK (duration_minutes IS NULL OR (duration_minutes >= 0 AND duration_minutes <= 1440))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movement_entries TO authenticated;
GRANT ALL ON public.movement_entries TO service_role;

ALTER TABLE public.movement_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own movement_entries" ON public.movement_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX movement_entries_user_date_idx ON public.movement_entries (user_id, date);

CREATE TRIGGER movement_entries_set_updated_at
  BEFORE UPDATE ON public.movement_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- weight entries
CREATE TABLE public.weight_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries TO authenticated;
GRANT ALL ON public.weight_entries TO service_role;

ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own weight_entries" ON public.weight_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX weight_entries_user_date_idx ON public.weight_entries (user_id, date);

CREATE TRIGGER weight_entries_set_updated_at
  BEFORE UPDATE ON public.weight_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- profile goal columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS step_goal integer NOT NULL DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS active_minutes_goal integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS weight_goal_kg numeric(5,2);

-- ===== supabase/migrations/20260612124232_8eba8122-7740-42e5-9e91-56eee5b9534b.sql =====

-- 1) profiles: gender, dashboard widgets, onboarding flag
CREATE TYPE public.user_gender AS ENUM ('female', 'male');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender public.user_gender NOT NULL DEFAULT 'female',
  ADD COLUMN IF NOT EXISTS dashboard_widgets jsonb NOT NULL DEFAULT '["steps","movement","weight","habits","phase","mood","journal"]'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- 2) journal_media table
CREATE TABLE public.journal_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  tag text NOT NULL DEFAULT 'general' CHECK (tag IN ('meal','movement','weight','general')),
  taken_at timestamptz NOT NULL DEFAULT now(),
  width int,
  height int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_media TO authenticated;
GRANT ALL ON public.journal_media TO service_role;
ALTER TABLE public.journal_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_media_own" ON public.journal_media
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER journal_media_updated_at
  BEFORE UPDATE ON public.journal_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX journal_media_user_taken_idx ON public.journal_media(user_id, taken_at DESC);

-- 3) Storage RLS for journal-media bucket: path is "{user_id}/..."
CREATE POLICY "journal_media_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "journal_media_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "journal_media_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "journal_media_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'journal-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== supabase/migrations/20260612171500_create_private_journal_media_bucket.sql =====
-- Private Supabase Storage bucket for user-owned journal images.
-- Object-level access is controlled by the storage.objects RLS policies in
-- 20260612124232_8eba8122-7740-42e5-9e91-56eee5b9534b.sql.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'journal-media',
  'journal-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
