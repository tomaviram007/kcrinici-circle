
-- Require authentication for reading announcements
DROP POLICY IF EXISTS "Anyone can read approved announcements" ON public.announcements;
CREATE POLICY "Authenticated users can read approved announcements"
ON public.announcements
FOR SELECT
USING (is_approved = true AND auth.uid() IS NOT NULL);

-- Require authentication for reading events
DROP POLICY IF EXISTS "Anyone can read events" ON public.events;
CREATE POLICY "Authenticated users can read events"
ON public.events
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Require authentication for reading jobs
DROP POLICY IF EXISTS "Anyone can read approved jobs" ON public.jobs;
CREATE POLICY "Authenticated users can read approved jobs"
ON public.jobs
FOR SELECT
USING (is_approved = true AND is_active = true AND auth.uid() IS NOT NULL);

-- Require authentication for reading poll options
DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Authenticated users can view poll options"
ON public.poll_options
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Require authentication for reading active polls
DROP POLICY IF EXISTS "Anyone can view active polls" ON public.polls;
CREATE POLICY "Authenticated users can view active polls"
ON public.polls
FOR SELECT
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Require authentication for reading albums
DROP POLICY IF EXISTS "Anyone can view albums" ON public.gallery_albums;
CREATE POLICY "Authenticated users can view albums"
ON public.gallery_albums
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Require authentication for reading photos
DROP POLICY IF EXISTS "Anyone can view photos" ON public.gallery_photos;
CREATE POLICY "Authenticated users can view photos"
ON public.gallery_photos
FOR SELECT
USING (auth.uid() IS NOT NULL);
