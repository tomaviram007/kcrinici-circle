-- Security hardening

-- 1. Remove hardcoded admin email auto-assignment.
-- Admins are managed by inserting rows into public.user_roles manually.
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
DROP FUNCTION IF EXISTS public.handle_admin_role();

-- 2. Ad tracking: remove open insert policies. Inserts happen only through
-- the SECURITY DEFINER tracking functions below, which now require an
-- authenticated caller and derive the user id from auth.uid() instead of
-- trusting a client-supplied parameter.
DROP POLICY IF EXISTS "Anyone can insert impressions" ON public.ad_impressions;
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.ad_clicks;

CREATE OR REPLACE FUNCTION public.track_ad_impression(p_campaign_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.ad_impressions (campaign_id, user_id) VALUES (p_campaign_id, auth.uid());
  UPDATE public.ad_campaigns SET impression_count = impression_count + 1 WHERE id = p_campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_ad_click(p_campaign_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.ad_clicks (campaign_id, user_id) VALUES (p_campaign_id, auth.uid());
  UPDATE public.ad_campaigns SET click_count = click_count + 1 WHERE id = p_campaign_id;
END;
$$;
