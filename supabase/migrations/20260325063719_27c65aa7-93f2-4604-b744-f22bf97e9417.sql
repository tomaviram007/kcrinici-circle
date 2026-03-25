
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'member_count', (SELECT count(*) FROM public.profiles WHERE is_approved = true AND is_removed = false),
    'event_count', (SELECT count(*) FROM public.events WHERE event_date >= date_trunc('year', now()))
  );
$$;
