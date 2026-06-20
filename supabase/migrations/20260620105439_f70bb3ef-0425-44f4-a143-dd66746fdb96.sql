
-- 1) Settings table for admin-controlled content access
CREATE TABLE public.content_access_settings (
  content_type TEXT PRIMARY KEY,
  public_list_enabled BOOLEAN NOT NULL DEFAULT true,
  public_card_open_enabled BOOLEAN NOT NULL DEFAULT false,
  public_contact_enabled BOOLEAN NOT NULL DEFAULT false,
  public_action_enabled BOOLEAN NOT NULL DEFAULT false,
  public_images_enabled BOOLEAN NOT NULL DEFAULT true,
  public_price_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.content_access_settings TO anon, authenticated;
GRANT ALL ON public.content_access_settings TO service_role;

ALTER TABLE public.content_access_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read content access settings"
  ON public.content_access_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage content access settings"
  ON public.content_access_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER content_access_settings_set_updated_at
  BEFORE UPDATE ON public.content_access_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults: public list visible, all details/actions members-only
INSERT INTO public.content_access_settings (content_type, public_list_enabled) VALUES
  ('jobs', true),
  ('members', true),
  ('professionals', true),
  ('deals', true),
  ('secondhand', true),
  ('events', true);

-- 2) Helper: settings lookup
CREATE OR REPLACE FUNCTION public.get_content_access(_content_type text)
RETURNS public.content_access_settings
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.content_access_settings WHERE content_type = _content_type;
$$;

-- 3) Public, partial-data RPCs. Each strips sensitive fields for non-approved/anon viewers.

-- Jobs
CREATE OR REPLACE FUNCTION public.get_public_jobs()
RETURNS TABLE(
  id uuid, title text, category text, company_name text,
  location text, job_type text, summary text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'jobs';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT j.id, j.title, j.category, j.company_name, j.location, j.job_type,
    left(coalesce(j.description, ''), 140) AS summary, j.created_at
  FROM public.jobs j
  WHERE j.is_approved = true AND j.is_active = true
  ORDER BY j.created_at DESC;
END $$;

-- Members
CREATE OR REPLACE FUNCTION public.get_public_members()
RETURNS TABLE(
  id uuid, first_name text, profession text, avatar_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'members';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id,
    COALESCE(p.first_name, split_part(coalesce(p.full_name,''), ' ', 1)) AS first_name,
    p.profession, p.avatar_url
  FROM public.profiles p
  WHERE p.is_approved = true AND p.is_removed = false
  ORDER BY COALESCE(p.first_name, p.full_name);
END $$;

-- Recommendations (professionals)
CREATE OR REPLACE FUNCTION public.get_public_recommendations()
RETURNS TABLE(
  id uuid, professional_first_name text, category text,
  description text, rating int, recommender_name text, is_admin_post boolean,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'professionals';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT r.id, r.professional_first_name, r.category,
    left(r.description, 140) AS description, r.rating,
    r.recommender_name, r.is_admin_post, r.created_at
  FROM public.professional_recommendations r
  WHERE r.is_approved = true AND r.is_hidden = false
  ORDER BY r.created_at DESC;
END $$;

-- Deals
CREATE OR REPLACE FUNCTION public.get_public_deals()
RETURNS TABLE(
  id uuid, title text, description text, business_name text,
  business_logo_url text, category text, discount_label text,
  benefit_type text, benefit_value int, expires_at timestamptz, created_at timestamptz
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
    d.category, d.discount_label, d.benefit_type, d.benefit_value,
    d.expires_at, d.created_at
  FROM public.deals d
  WHERE d.is_active = true AND d.is_approved = true
    AND (d.expires_at IS NULL OR d.expires_at > now())
  ORDER BY d.created_at DESC;
END $$;

-- Secondhand items
CREATE OR REPLACE FUNCTION public.get_public_secondhand()
RETURNS TABLE(
  id uuid, title text, description text, price numeric, currency text,
  condition text, category text, images text[], is_sold boolean, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'secondhand';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT i.id, i.title, left(coalesce(i.description,''), 180) AS description,
    CASE WHEN s.public_price_enabled THEN i.price ELSE NULL END,
    i.currency, i.condition, i.category,
    CASE WHEN s.public_images_enabled THEN i.images ELSE ARRAY[]::text[] END,
    i.is_sold, i.created_at
  FROM public.secondhand_items i
  WHERE i.is_active = true
  ORDER BY i.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_content_access(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_jobs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_members() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_recommendations() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_deals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_secondhand() TO anon, authenticated;
