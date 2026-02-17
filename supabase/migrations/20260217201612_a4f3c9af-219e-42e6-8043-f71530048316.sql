CREATE POLICY "Users can update own gallery images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);