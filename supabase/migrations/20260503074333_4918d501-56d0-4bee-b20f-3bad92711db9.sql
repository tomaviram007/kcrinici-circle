
-- 1. event_rsvps: replace permissive SELECT
DROP POLICY IF EXISTS "Authenticated users can view RSVPs" ON public.event_rsvps;

CREATE POLICY "Users can view their own RSVPs"
ON public.event_rsvps FOR SELECT
USING (auth.uid() = user_id);

-- 2. Public RPC for attending counts (safe aggregate, no PII)
CREATE OR REPLACE FUNCTION public.get_event_attending_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, attending_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id, count(*)::bigint
  FROM public.event_rsvps
  WHERE event_id = ANY(_event_ids) AND status = 'attending'
  GROUP BY event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_attending_counts(uuid[]) TO authenticated, anon;

-- 3. advertisers: restrict SELECT to admins only
DROP POLICY IF EXISTS "Team with ads permission can view advertisers" ON public.advertisers;

-- 4. Storage: ownership-checked update/delete on deals bucket
DROP POLICY IF EXISTS "Users can update their own deal logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own deal logos" ON storage.objects;

CREATE POLICY "Users can update their own deal logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'deals'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete their own deal logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'deals'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow admins to manage deal logos as well
CREATE POLICY "Admins can manage deal logos"
ON storage.objects FOR ALL
USING (bucket_id = 'deals' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'deals' AND public.has_role(auth.uid(), 'admin'));
