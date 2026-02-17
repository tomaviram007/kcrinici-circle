
-- Fix overly permissive INSERT policies on announcements and jobs
-- Replace WITH CHECK (true) with authenticated user check

DROP POLICY IF EXISTS "Anyone can submit announcements" ON public.announcements;
CREATE POLICY "Authenticated users can submit announcements"
ON public.announcements
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can submit jobs" ON public.jobs;
CREATE POLICY "Authenticated users can submit jobs"
ON public.jobs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
