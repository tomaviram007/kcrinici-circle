
DROP POLICY "Anyone can read public events" ON public.events;
CREATE POLICY "Authenticated users can read public events" ON public.events
  FOR SELECT TO authenticated USING (is_admin_only = false);

DROP POLICY "Authenticated users can submit deals" ON public.deals;
CREATE POLICY "Approved users can submit deals" ON public.deals
  FOR INSERT TO authenticated WITH CHECK (is_approved_user(auth.uid()));

DROP POLICY "Authenticated users can submit recommendations" ON public.professional_recommendations;
CREATE POLICY "Approved users can submit recommendations" ON public.professional_recommendations
  FOR INSERT TO authenticated WITH CHECK (is_approved_user(auth.uid()));
