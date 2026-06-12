
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
