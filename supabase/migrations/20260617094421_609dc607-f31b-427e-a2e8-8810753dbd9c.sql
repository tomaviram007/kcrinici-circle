
-- Add is_approved to photos for moderation
ALTER TABLE public.gallery_photos
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT true;

-- Replace SELECT policy to hide unapproved photos from non-owners/non-admins
DROP POLICY IF EXISTS "Authenticated users can view photos" ON public.gallery_photos;
CREATE POLICY "Authenticated users can view approved photos"
ON public.gallery_photos
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    is_approved = true
    OR uploaded_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
