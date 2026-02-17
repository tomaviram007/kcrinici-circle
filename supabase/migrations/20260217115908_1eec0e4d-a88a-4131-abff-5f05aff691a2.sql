
-- Allow approved members to insert announcements
CREATE POLICY "Approved members can create announcements"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (is_approved_user(auth.uid()));

-- Allow approved members to insert jobs
CREATE POLICY "Approved members can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (is_approved_user(auth.uid()));

-- Allow users to update their own announcements
CREATE POLICY "Users can update own announcements"
ON public.announcements
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Allow users to delete their own announcements
CREATE POLICY "Users can delete own announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Allow users to update their own jobs
CREATE POLICY "Users can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Allow users to delete their own jobs
CREATE POLICY "Users can delete own jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
