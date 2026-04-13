
-- Make end_date nullable
ALTER TABLE public.ad_campaigns ALTER COLUMN end_date DROP NOT NULL;

-- Update RLS policy to handle null end_date
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.ad_campaigns;
CREATE POLICY "Anyone can view active campaigns"
ON public.ad_campaigns
FOR SELECT
USING (
  is_active = true 
  AND now() >= start_date 
  AND (end_date IS NULL OR now() <= end_date)
);
