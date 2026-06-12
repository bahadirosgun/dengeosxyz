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
