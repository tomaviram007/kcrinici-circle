-- Allow users to update is_sold on their own announcements
CREATE POLICY "Users can mark own sale as sold"
ON public.announcements
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);