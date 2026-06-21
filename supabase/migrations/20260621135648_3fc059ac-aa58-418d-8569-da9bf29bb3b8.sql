ALTER TABLE public.gallery_photos ALTER COLUMN is_approved SET DEFAULT false;

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON public.gallery_photos;
CREATE POLICY "Approved users can upload photos"
ON public.gallery_photos
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_approved_user(auth.uid())
  AND uploaded_by = auth.uid()
  AND is_approved = false
);

ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;