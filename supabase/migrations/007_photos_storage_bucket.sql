-- Photos storage bucket used by album uploads and feed post images.
-- Objects live under {group_id}/... e.g. {group_id}/feed/{post_id}.jpg
-- The bucket is public so the client can use getPublicUrl for display.
-- Write access is still limited to authenticated members of that group.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS photos_objects_insert ON storage.objects;
CREATE POLICY photos_objects_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  );

DROP POLICY IF EXISTS photos_objects_update ON storage.objects;
CREATE POLICY photos_objects_update ON storage.objects
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
CREATE POLICY photos_objects_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1] = auth_group_id()::text
  );
