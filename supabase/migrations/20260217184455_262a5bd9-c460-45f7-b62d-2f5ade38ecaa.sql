
-- Fix announcements: make submit policy PERMISSIVE so non-admins can insert
DROP POLICY IF EXISTS "Anyone can submit announcements" ON public.announcements;
CREATE POLICY "Anyone can submit announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix the admin policy to be permissive too
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix the read policy
DROP POLICY IF EXISTS "Anyone can read approved announcements" ON public.announcements;
CREATE POLICY "Anyone can read approved announcements"
ON public.announcements
FOR SELECT
USING (is_approved = true);

-- Fix jobs: make submit policy PERMISSIVE
DROP POLICY IF EXISTS "Anyone can submit jobs" ON public.jobs;
CREATE POLICY "Anyone can submit jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Fix the admin policy
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
CREATE POLICY "Admins can manage jobs"
ON public.jobs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix the read policy
DROP POLICY IF EXISTS "Anyone can read approved jobs" ON public.jobs;
CREATE POLICY "Anyone can read approved jobs"
ON public.jobs
FOR SELECT
USING ((is_approved = true) AND (is_active = true));
