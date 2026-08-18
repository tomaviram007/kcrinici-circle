DROP FUNCTION IF EXISTS public.get_member_secondhand();
DROP FUNCTION IF EXISTS public.get_public_secondhand();

CREATE OR REPLACE FUNCTION public.get_member_secondhand()
 RETURNS TABLE(id uuid, title text, description text, price numeric, currency text, condition text, category text, images text[], is_sold boolean, sold_status text, is_active boolean, contact_phone text, created_by uuid, created_at timestamp with time zone, is_approved boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT i.id, i.title, i.description, i.price, i.currency,
         i.condition, i.category, i.images, i.is_sold, i.sold_status, i.is_active,
         i.contact_phone, i.created_by, i.created_at, i.is_approved
  FROM public.secondhand_items i
  WHERE i.is_active = true AND i.is_approved = true
  ORDER BY i.created_at DESC;
END $function$;

CREATE OR REPLACE FUNCTION public.get_public_secondhand()
 RETURNS TABLE(id uuid, title text, description text, price numeric, currency text, condition text, category text, images text[], is_sold boolean, sold_status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'secondhand';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT i.id, i.title, left(coalesce(i.description,''), 180) AS description,
    CASE WHEN s.public_price_enabled THEN i.price ELSE NULL END,
    i.currency, i.condition, i.category,
    CASE WHEN s.public_images_enabled THEN i.images ELSE ARRAY[]::text[] END,
    i.is_sold, i.sold_status, i.created_at
  FROM public.secondhand_items i
  WHERE i.is_active = true AND i.is_approved = true
  ORDER BY i.created_at DESC;
END $function$;

GRANT EXECUTE ON FUNCTION public.get_member_secondhand() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_secondhand() TO anon, authenticated, service_role;