
-- Fix infinite recursion in profiles RLS policies
-- Also fix announcements/events/jobs policies that reference profiles

-- 1. Create security definer function to check approval without RLS
CREATE OR REPLACE FUNCTION public.is_approved_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_approved = true
  )
$$;

-- 2. Fix profiles policies
DROP POLICY IF EXISTS "Approved members can see approved profiles" ON public.profiles;

CREATE POLICY "Approved members can see approved profiles"
ON public.profiles
FOR SELECT
USING (
  is_approved = true AND is_approved_user(auth.uid())
);

-- 3. Fix announcements policies (also references profiles causing recursion)
DROP POLICY IF EXISTS "Approved members can read announcements" ON public.announcements;

CREATE POLICY "Approved members can read announcements"
ON public.announcements
FOR SELECT
USING (is_approved_user(auth.uid()));

-- 4. Fix events policies
DROP POLICY IF EXISTS "Approved members can read events" ON public.events;

CREATE POLICY "Approved members can read events"
ON public.events
FOR SELECT
USING (is_approved_user(auth.uid()));

-- 5. Fix jobs policies
DROP POLICY IF EXISTS "Approved members can read active jobs" ON public.jobs;

CREATE POLICY "Approved members can read active jobs"
ON public.jobs
FOR SELECT
USING (is_active = true AND is_approved_user(auth.uid()));
