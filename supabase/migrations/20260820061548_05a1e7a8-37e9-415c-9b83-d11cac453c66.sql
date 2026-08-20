ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS card_image_url text;

DROP FUNCTION IF EXISTS public.get_public_deals();

CREATE OR REPLACE FUNCTION public.get_public_deals()
RETURNS TABLE(
  id uuid, title text, description text, business_name text,
  business_logo_url text, card_image_url text, category text, discount_label text,
  benefit_type text, benefit_value int, expires_at timestamptz, created_at timestamptz,
  website_url text, business_phone text, coupon_code text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'deals';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT d.id, d.title, left(coalesce(d.description,''), 180) AS description,
    d.business_name,
    CASE WHEN s.public_images_enabled THEN d.business_logo_url ELSE NULL END,
    CASE WHEN s.public_images_enabled THEN d.card_image_url ELSE NULL END,
    d.category, d.discount_label, d.benefit_type, d.benefit_value,
    d.expires_at, d.created_at,
    CASE WHEN s.public_contact_enabled THEN d.website_url ELSE NULL END,
    CASE WHEN s.public_contact_enabled THEN d.business_phone ELSE NULL END,
    CASE WHEN s.public_contact_enabled THEN d.coupon_code ELSE NULL END
  FROM public.deals d
  WHERE d.is_active = true AND d.is_approved = true
    AND (d.expires_at IS NULL OR d.expires_at > now())
  ORDER BY d.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_deals() TO anon, authenticated;