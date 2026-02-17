
-- Fix 1: Restrict profiles visibility to authenticated approved users only
DROP POLICY IF EXISTS "Anyone can see approved profiles" ON public.profiles;

CREATE POLICY "Approved members can see other approved profiles"
ON public.profiles FOR SELECT
USING (is_approved = true AND is_approved_user(auth.uid()));

-- Fix 2: Restrict event_rsvps to authenticated users only
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON public.event_rsvps;

CREATE POLICY "Authenticated users can view RSVPs"
ON public.event_rsvps FOR SELECT
TO authenticated
USING (true);
