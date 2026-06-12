DROP POLICY IF EXISTS "Authenticated users can read events" ON public.events;
CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.event_rsvps TO anon;