
CREATE POLICY "Users can read own announcements"
  ON public.announcements FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can read own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = created_by);
