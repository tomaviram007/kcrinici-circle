
-- 1) Storage: announcements bucket upload restricted to approved members
DROP POLICY IF EXISTS "Authenticated users can upload announcement images" ON storage.objects;
CREATE POLICY "Approved users can upload announcement images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'announcements' AND public.is_approved_user(auth.uid()));

-- 2) Announcements UPDATE: only is_sold may change for non-admins; admins keep full access via existing ALL policy
DROP POLICY IF EXISTS "Users can mark own sale as sold" ON public.announcements;
CREATE OR REPLACE FUNCTION public.block_announcement_owner_update_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.sale_type IS DISTINCT FROM OLD.sale_type
     OR NEW.sale_data IS DISTINCT FROM OLD.sale_data
     OR NEW.sale_image_url IS DISTINCT FROM OLD.sale_image_url
     OR NEW.sale_gallery_urls IS DISTINCT FROM OLD.sale_gallery_urls
     OR NEW.is_approved IS DISTINCT FROM OLD.is_approved
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Only is_sold can be changed by owners after approval';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_block_announcement_owner_update_fields ON public.announcements;
CREATE TRIGGER trg_block_announcement_owner_update_fields
BEFORE UPDATE ON public.announcements FOR EACH ROW
EXECUTE FUNCTION public.block_announcement_owner_update_fields();
CREATE POLICY "Owners can toggle sold on own announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- 3) Birthday template SELECT restricted to admins
DROP POLICY IF EXISTS "Read birthday template" ON public.birthday_email_template;
CREATE POLICY "Admins can read birthday template"
ON public.birthday_email_template FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Poll options visible only to approved members (admins covered by ALL policy)
DROP POLICY IF EXISTS "Authenticated users can view poll options" ON public.poll_options;
CREATE POLICY "Approved users can view poll options"
ON public.poll_options FOR SELECT TO authenticated
USING (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 5) Hide guest contact fields from approved members; expose via RPC without guest contact.
--    Admins still SELECT * via "Admins can view all items".
DROP POLICY IF EXISTS "Approved users can view approved active items" ON public.secondhand_items;

CREATE OR REPLACE FUNCTION public.get_member_secondhand()
RETURNS TABLE(
  id uuid, title text, description text, price numeric, currency text,
  condition text, category text, images text[], is_sold boolean, is_active boolean,
  contact_phone text, created_by uuid, created_at timestamp with time zone,
  is_approved boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_approved_user(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT i.id, i.title, i.description, i.price, i.currency,
         i.condition, i.category, i.images, i.is_sold, i.is_active,
         i.contact_phone, i.created_by, i.created_at, i.is_approved
  FROM public.secondhand_items i
  WHERE i.is_active = true AND i.is_approved = true
  ORDER BY i.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.get_member_secondhand() TO authenticated;
