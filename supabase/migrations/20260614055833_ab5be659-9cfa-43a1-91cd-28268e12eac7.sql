
-- Remove the broad authenticated SELECT we re-added; only admins / ads-team keep direct access.
DROP POLICY IF EXISTS "Authenticated can view active campaigns via view" ON public.ad_campaigns;

-- Recreate the public view as SECURITY DEFINER (default) so it can return safe columns
-- without exposing the underlying table to non-privileged members.
DROP VIEW IF EXISTS public.ad_campaigns_public;
CREATE VIEW public.ad_campaigns_public AS
SELECT id, advertiser_id, title, media_type, media_url, target_url, alt_text,
       priority, max_appearances, target_page, placement, is_active,
       start_date, end_date, created_at, updated_at
FROM public.ad_campaigns
WHERE is_active = true
  AND now() >= start_date
  AND (end_date IS NULL OR now() <= end_date);

GRANT SELECT ON public.ad_campaigns_public TO authenticated, anon;
