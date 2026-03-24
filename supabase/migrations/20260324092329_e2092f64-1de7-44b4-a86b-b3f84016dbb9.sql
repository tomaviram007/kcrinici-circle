
ALTER TABLE public.deals ADD COLUMN claim_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.deals ADD COLUMN website_click_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_deal_counter(deal_id UUID, counter_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF counter_name = 'claim_count' THEN
    UPDATE public.deals SET claim_count = claim_count + 1 WHERE id = deal_id;
  ELSIF counter_name = 'website_click_count' THEN
    UPDATE public.deals SET website_click_count = website_click_count + 1 WHERE id = deal_id;
  END IF;
END;
$$;
