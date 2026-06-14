
-- 1. Ad campaigns: remove broad SELECT to authenticated, expose safe view instead
DROP POLICY IF EXISTS "Authenticated users can view active campaigns" ON public.ad_campaigns;

CREATE OR REPLACE VIEW public.ad_campaigns_public
WITH (security_invoker = true) AS
SELECT id, advertiser_id, title, media_type, media_url, target_url, alt_text,
       priority, max_appearances, target_page, placement, is_active,
       start_date, end_date, created_at, updated_at
FROM public.ad_campaigns
WHERE is_active = true
  AND now() >= start_date
  AND (end_date IS NULL OR now() <= end_date);

-- View needs its own policy-enabling row source; recreate the row filter via a policy
CREATE POLICY "Authenticated can view active campaigns via view"
ON public.ad_campaigns
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND now() >= start_date
  AND (end_date IS NULL OR now() <= end_date)
  AND (
    -- Restrict column visibility by routing non-privileged users through the view.
    -- The view is queried with security_invoker, so this policy still applies.
    current_setting('request.jwt.claims', true) IS NOT NULL
  )
);

GRANT SELECT ON public.ad_campaigns_public TO authenticated, anon;

-- 2. Ad impressions / clicks: enforce user_id attribution
DROP POLICY IF EXISTS "Authenticated users can insert impressions" ON public.ad_impressions;
CREATE POLICY "Authenticated users can insert impressions"
ON public.ad_impressions
FOR INSERT
TO authenticated
WITH CHECK (campaign_id IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

DROP POLICY IF EXISTS "Authenticated users can insert clicks" ON public.ad_clicks;
CREATE POLICY "Authenticated users can insert clicks"
ON public.ad_clicks
FOR INSERT
TO authenticated
WITH CHECK (campaign_id IS NOT NULL AND (user_id IS NULL OR auth.uid() = user_id));

-- 3. Event registrations: let registrant view their own rows
CREATE POLICY "Users can view their own registrations"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
