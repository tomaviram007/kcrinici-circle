-- Neighborhood real-estate board: rent/sale listings published by members or guests
CREATE TABLE public.realestate_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  listing_type TEXT NOT NULL DEFAULT 'rent' CHECK (listing_type IN ('rent', 'sale')),
  property_type TEXT NOT NULL DEFAULT 'דירה',
  rooms NUMERIC,
  floor_number INTEGER,
  size_sqm NUMERIC,
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'ILS',
  address TEXT,
  available_from DATE,
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  contact_phone TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  guest_name TEXT,
  guest_email TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.realestate_listings TO authenticated;
GRANT INSERT ON public.realestate_listings TO anon;
GRANT ALL ON public.realestate_listings TO service_role;

ALTER TABLE public.realestate_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view approved active listings"
ON public.realestate_listings FOR SELECT TO authenticated
USING (is_active = true AND is_approved = true AND public.is_approved_user(auth.uid()));

CREATE POLICY "Owners can view their listings"
ON public.realestate_listings FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Admins can view all listings"
ON public.realestate_listings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users can insert their own listings"
ON public.realestate_listings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

CREATE POLICY "Anyone can submit guest listings"
ON public.realestate_listings FOR INSERT TO anon, authenticated
WITH CHECK (
  created_by IS NULL
  AND guest_name IS NOT NULL AND length(btrim(guest_name)) > 0
  AND contact_phone IS NOT NULL AND length(btrim(contact_phone)) > 0
  AND guest_email IS NOT NULL AND length(btrim(guest_email)) > 0
);

CREATE POLICY "Owners can update their listings"
ON public.realestate_listings FOR UPDATE TO authenticated
USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update any listing"
ON public.realestate_listings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete their listings"
ON public.realestate_listings FOR DELETE TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete any listing"
ON public.realestate_listings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-approve listings created by approved members / admins; guests wait for approval
CREATE OR REPLACE FUNCTION public.realestate_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND (
       public.is_approved_user(NEW.created_by)
       OR public.has_role(NEW.created_by, 'admin')
     ) THEN
    NEW.is_approved := true;
  ELSE
    NEW.is_approved := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_realestate_auto_approve
BEFORE INSERT ON public.realestate_listings
FOR EACH ROW EXECUTE FUNCTION public.realestate_auto_approve();

-- Block non-admins from flipping is_approved themselves
CREATE OR REPLACE FUNCTION public.block_realestate_approval_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change is_approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_realestate_approval
BEFORE UPDATE ON public.realestate_listings
FOR EACH ROW EXECUTE FUNCTION public.block_realestate_approval_self_edit();

CREATE TRIGGER update_realestate_listings_updated_at
BEFORE UPDATE ON public.realestate_listings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_realestate_listings_created_at ON public.realestate_listings (created_at DESC);
CREATE INDEX idx_realestate_listings_listing_type ON public.realestate_listings (listing_type);

-- Content access settings row for the public tier
INSERT INTO public.content_access_settings (content_type, public_list_enabled)
VALUES ('realestate', true)
ON CONFLICT (content_type) DO NOTHING;

-- Member RPC: full listings (without guest contact details)
CREATE OR REPLACE FUNCTION public.get_member_realestate()
 RETURNS TABLE(id uuid, title text, description text, listing_type text, property_type text, rooms numeric, floor_number integer, size_sqm numeric, price numeric, currency text, address text, available_from date, images text[], is_closed boolean, is_active boolean, contact_phone text, created_by uuid, created_at timestamp with time zone, is_approved boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT l.id, l.title, l.description, l.listing_type, l.property_type,
         l.rooms, l.floor_number, l.size_sqm, l.price, l.currency,
         l.address, l.available_from, l.images, l.is_closed, l.is_active,
         l.contact_phone, l.created_by, l.created_at, l.is_approved
  FROM public.realestate_listings l
  WHERE l.is_active = true AND l.is_approved = true
  ORDER BY l.created_at DESC;
END $function$;

-- Public RPC: honors content_access_settings, hides contact details
CREATE OR REPLACE FUNCTION public.get_public_realestate()
 RETURNS TABLE(id uuid, title text, description text, listing_type text, property_type text, rooms numeric, floor_number integer, size_sqm numeric, price numeric, currency text, address text, available_from date, images text[], is_closed boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE s public.content_access_settings;
BEGIN
  SELECT * INTO s FROM public.content_access_settings WHERE content_type = 'realestate';
  IF s.public_list_enabled = false THEN RETURN; END IF;
  RETURN QUERY
  SELECT l.id, l.title, left(coalesce(l.description,''), 180) AS description,
    l.listing_type, l.property_type, l.rooms, l.floor_number, l.size_sqm,
    CASE WHEN s.public_price_enabled THEN l.price ELSE NULL END,
    l.currency, l.address, l.available_from,
    CASE WHEN s.public_images_enabled THEN l.images ELSE ARRAY[]::text[] END,
    l.is_closed, l.created_at
  FROM public.realestate_listings l
  WHERE l.is_active = true AND l.is_approved = true
  ORDER BY l.created_at DESC;
END $function$;

GRANT EXECUTE ON FUNCTION public.get_member_realestate() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_realestate() TO anon, authenticated, service_role;
