
-- Replace always-true INSERT policies with explicit checks
DROP POLICY IF EXISTS "Authenticated users can insert clicks" ON public.ad_clicks;
CREATE POLICY "Authenticated users can insert clicks"
ON public.ad_clicks
FOR INSERT
TO authenticated
WITH CHECK (campaign_id IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert impressions" ON public.ad_impressions;
CREATE POLICY "Authenticated users can insert impressions"
ON public.ad_impressions
FOR INSERT
TO authenticated
WITH CHECK (campaign_id IS NOT NULL);
