CREATE POLICY "Team can view event feedback" ON public.event_feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'chief_editor') OR public.has_role(auth.uid(),'editor') OR public.has_permission(auth.uid(),'manage_events'));
CREATE POLICY "Team can view feedback forms" ON public.feedback_forms FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'chief_editor') OR public.has_role(auth.uid(),'editor') OR public.has_permission(auth.uid(),'manage_events'));