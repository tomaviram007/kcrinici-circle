CREATE OR REPLACE FUNCTION public.get_public_events()
RETURNS TABLE(
  id uuid, title text, description text, event_date timestamptz, end_date timestamptz,
  image_url text, price numeric, registration_required boolean, max_participants integer,
  is_admin_only boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.title, e.description, e.event_date, e.end_date,
         e.image_url, e.price, e.registration_required, e.max_participants,
         e.is_admin_only, e.created_at
  FROM public.events e
  WHERE e.is_admin_only = false
  ORDER BY e.event_date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_events() TO anon, authenticated;