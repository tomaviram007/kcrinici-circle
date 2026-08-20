DROP POLICY IF EXISTS "Authenticated users can RSVP" ON public.event_rsvps;
CREATE POLICY "Approved members can RSVP"
ON public.event_rsvps
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);

DROP POLICY IF EXISTS "Authenticated users can vote" ON public.poll_votes;
CREATE POLICY "Approved members can vote"
ON public.poll_votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);