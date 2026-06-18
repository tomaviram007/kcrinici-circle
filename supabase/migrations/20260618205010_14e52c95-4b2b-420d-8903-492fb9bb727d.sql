
-- 1) Deals bucket: require approved members to upload (match table-level gate)
DROP POLICY IF EXISTS "Authenticated users can upload deal logos" ON storage.objects;
CREATE POLICY "Approved members can upload deal logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'deals' AND public.is_approved_user(auth.uid()));

-- 2) event_registrations: explicit owner-only insert policy.
-- Service role (edge function) bypasses RLS, so guest inserts still work via the function.
CREATE POLICY "Users can insert their own registrations"
ON public.event_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3) poll_votes: restrict SELECT to own rows; expose aggregates via RPC.
DROP POLICY IF EXISTS "Authenticated users can view votes" ON public.poll_votes;
CREATE POLICY "Users can view their own votes"
ON public.poll_votes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_poll_results(_poll_id uuid)
RETURNS TABLE(option_id uuid, vote_count bigint, total_votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.option_id,
         count(*)::bigint AS vote_count,
         (SELECT count(*)::bigint FROM public.poll_votes WHERE poll_id = _poll_id) AS total_votes
  FROM public.poll_votes v
  WHERE v.poll_id = _poll_id
  GROUP BY v.option_id
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated, anon;
