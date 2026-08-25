DROP POLICY IF EXISTS "Team members can insert their own audit log entries" ON public.audit_log;

CREATE POLICY "Team members can insert audit entries for their permission"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_permission(auth.uid(), 'manage_' || lower(entity_type) || 's')
  )
);