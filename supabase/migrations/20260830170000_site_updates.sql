-- Homepage popup announcing a new page, service or product on the site
CREATE TABLE public.site_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text TEXT NOT NULL DEFAULT 'חדש באתר',
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  button_text TEXT NOT NULL DEFAULT 'לצפייה',
  button_url TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'members', 'guests')),
  max_displays INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_updates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_updates TO authenticated;
GRANT ALL ON public.site_updates TO service_role;

ALTER TABLE public.site_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active site updates"
ON public.site_updates FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins can read all site updates"
ON public.site_updates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage site updates"
ON public.site_updates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_updates_updated_at
BEFORE UPDATE ON public.site_updates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_site_updates_active ON public.site_updates (is_active, display_order DESC, created_at DESC);

-- Public RPC: the single update that should show right now, respecting the date window.
-- Audience filtering happens client side, since the popup also serves logged out visitors.
CREATE OR REPLACE FUNCTION public.get_active_site_updates()
 RETURNS TABLE(id uuid, badge_text text, title text, body text, image_url text, button_text text, button_url text, audience text, max_displays integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.id, u.badge_text, u.title, u.body, u.image_url,
         u.button_text, u.button_url, u.audience, u.max_displays, u.updated_at
  FROM public.site_updates u
  WHERE u.is_active = true
    AND (u.starts_at IS NULL OR u.starts_at <= now())
    AND (u.ends_at IS NULL OR u.ends_at >= now())
  ORDER BY u.display_order DESC, u.created_at DESC
  LIMIT 5;
END $function$;

GRANT EXECUTE ON FUNCTION public.get_active_site_updates() TO anon, authenticated, service_role;
