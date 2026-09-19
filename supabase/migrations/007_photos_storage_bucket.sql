-- Photos storage bucket used by album uploads and feed post images.
-- Objects live under {group_id}/... e.g. {group_id}/feed/{post_id}.jpg
-- Matches the bucket applied on the GSL Supabase project:
--   public photos bucket + storage RLS keyed to auth_group_id().

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  15728640,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Public read for the public bucket (getPublicUrl). Writes stay group-scoped.
DROP POLICY IF EXISTS photos_objects_select ON storage.objects;
DROP POLICY IF EXISTS photos_storage_select ON storage.objects;
CREATE POLICY photos_storage_select ON storage.objects
  FOR SELECT
  USING (bucket_id = 'photos');

DROP POLICY IF EXISTS photos_objects_insert ON storage.objects;
DROP POLICY IF EXISTS photos_storage_insert ON storage.objects;
CREATE POLICY photos_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  );

DROP POLICY IF EXISTS photos_objects_update ON storage.objects;
DROP POLICY IF EXISTS photos_storage_update ON storage.objects;
CREATE POLICY photos_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  )
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  );

DROP POLICY IF EXISTS photos_objects_delete ON storage.objects;
DROP POLICY IF EXISTS photos_storage_delete ON storage.objects;
CREATE POLICY photos_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  );
