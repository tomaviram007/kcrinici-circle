CREATE OR REPLACE FUNCTION public.get_event_feedback_info(_event_id uuid)
RETURNS TABLE(id uuid, title text, event_date timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id, e.title, e.event_date
  FROM public.events e
  WHERE e.id = _event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_feedback_info(uuid) TO anon, authenticated;