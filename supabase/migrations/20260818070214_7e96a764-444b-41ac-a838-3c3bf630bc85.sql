DROP POLICY IF EXISTS "Approved members can upload deal logos" ON storage.objects;
CREATE POLICY "Approved members can upload deal logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'deals'
  AND public.is_approved_user(auth.uid())
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

DROP POLICY IF EXISTS "Approved members can upload gallery images" ON storage.objects;
CREATE POLICY "Approved members can upload gallery images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'gallery'
  AND public.is_approved_user(auth.uid())
  AND (storage.foldername(name))[1] = (auth.uid())::text
);