-- Guests are allowed to publish listings, so they must also be able to attach photos.
-- Uploads are confined to a single "guest" folder and the bucket itself is capped
-- to image types and 5MB, matching the client side validation.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'announcements';

DROP POLICY IF EXISTS "Guests can upload listing images" ON storage.objects;
CREATE POLICY "Guests can upload listing images"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'announcements'
  AND (storage.foldername(name))[1] = 'guest'
);

-- Admins clean up anything abusive in the guest folder.
DROP POLICY IF EXISTS "Admins can delete guest listing images" ON storage.objects;
CREATE POLICY "Admins can delete guest listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements'
  AND (storage.foldername(name))[1] = 'guest'
  AND public.has_role(auth.uid(), 'admin')
);
