
DROP VIEW IF EXISTS public.ad_campaigns_public;

CREATE OR REPLACE FUNCTION public.get_active_ad_campaigns()
RETURNS TABLE (
  id uuid,
  advertiser_id uuid,
  title text,
  media_type text,
  media_url text,
  target_url text,
  alt_text text,
  priority integer,
  max_appearances integer,
  target_page text,
  placement text,
  is_active boolean,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.advertiser_id, c.title, c.media_type, c.media_url, c.target_url, c.alt_text,
         c.priority, c.max_appearances, c.target_page, c.placement, c.is_active,
         c.start_date, c.end_date, c.created_at, c.updated_at
  FROM public.ad_campaigns c
  WHERE c.is_active = true
    AND now() >= c.start_date
    AND (c.end_date IS NULL OR now() <= c.end_date);
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_ad_campaigns() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_ad_campaigns() TO authenticated;
