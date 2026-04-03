
-- Fix 1: Remove profiles from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;

-- Fix 2: Restrict poll_votes SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view votes" ON public.poll_votes;
CREATE POLICY "Authenticated users can view votes"
ON public.poll_votes
FOR SELECT
USING (auth.uid() IS NOT NULL);
