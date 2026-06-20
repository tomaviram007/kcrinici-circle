
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

-- Restrict unapproved submissions
DROP POLICY IF EXISTS "Authenticated users can submit announcements" ON public.announcements;
CREATE POLICY "Approved users can submit announcements" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create albums" ON public.gallery_albums;
CREATE POLICY "Approved users can create albums" ON public.gallery_albums
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can submit jobs" ON public.jobs;
CREATE POLICY "Approved users can submit jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create polls" ON public.polls;
CREATE POLICY "Approved users can create polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create poll options" ON public.poll_options;
CREATE POLICY "Approved users can create poll options" ON public.poll_options
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_approved_user(auth.uid())
    AND EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid())
  );

-- Tighten audit log inserts to admins / team-permissioned users only
DROP POLICY IF EXISTS "Users can insert their own audit log entries" ON public.audit_log;
CREATE POLICY "Team members can insert their own audit log entries" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = auth.uid() AND up.granted = true
      )
    )
  );
