
-- 1) Add columns for guest submissions + approval flag
ALTER TABLE public.secondhand_items
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_email text;

-- Existing items stay visible
UPDATE public.secondhand_items SET is_approved = true WHERE is_approved = false;

-- 2) Auto-approve trigger when an approved member or admin creates the item
CREATE OR REPLACE FUNCTION public.secondhand_auto_approve()
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

DROP TRIGGER IF EXISTS trg_secondhand_auto_approve ON public.secondhand_items;
CREATE TRIGGER trg_secondhand_auto_approve
BEFORE INSERT ON public.secondhand_items
FOR EACH ROW EXECUTE FUNCTION public.secondhand_auto_approve();

-- 3) Block non-admins from flipping is_approved themselves
CREATE OR REPLACE FUNCTION public.block_secondhand_approval_self_edit()
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

DROP TRIGGER IF EXISTS trg_block_secondhand_approval ON public.secondhand_items;
CREATE TRIGGER trg_block_secondhand_approval
BEFORE UPDATE ON public.secondhand_items
FOR EACH ROW EXECUTE FUNCTION public.block_secondhand_approval_self_edit();

-- 4) Grants for anonymous guest submissions
GRANT INSERT ON public.secondhand_items TO anon;

-- 5) Guest submission policy (anyone, including anonymous)
DROP POLICY IF EXISTS "Anyone can submit guest items" ON public.secondhand_items;
CREATE POLICY "Anyone can submit guest items"
ON public.secondhand_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  created_by IS NULL
  AND guest_name IS NOT NULL AND length(btrim(guest_name)) > 0
  AND contact_phone IS NOT NULL AND length(btrim(contact_phone)) > 0
  AND guest_email IS NOT NULL AND length(btrim(guest_email)) > 0
);

-- 6) Tighten SELECT: approved members see only approved+active items
DROP POLICY IF EXISTS "Approved users can view active items" ON public.secondhand_items;
CREATE POLICY "Approved users can view approved active items"
ON public.secondhand_items
FOR SELECT
TO authenticated
USING (is_active = true AND is_approved = true AND public.is_approved_user(auth.uid()));

-- Owners can view their own items regardless of approval
DROP POLICY IF EXISTS "Owners can view their items" ON public.secondhand_items;
CREATE POLICY "Owners can view their items"
ON public.secondhand_items
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- 7) Public RPC: only return approved items
CREATE OR REPLACE FUNCTION public.get_public_secondhand()
RETURNS TABLE(id uuid, title text, description text, price numeric, currency text, condition text, category text, images text[], is_sold boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  WHERE i.is_active = true AND i.is_approved = true
  ORDER BY i.created_at DESC;
END $$;
