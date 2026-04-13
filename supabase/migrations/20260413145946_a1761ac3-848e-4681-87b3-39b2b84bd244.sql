
-- Advertisers table
CREATE TABLE public.advertisers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage advertisers" ON public.advertisers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team with ads permission can view advertisers" ON public.advertisers FOR SELECT
  USING (has_permission(auth.uid(), 'manage_ads'::text));

CREATE TRIGGER update_advertisers_updated_at BEFORE UPDATE ON public.advertisers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ad Campaigns table
CREATE TABLE public.ad_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id uuid NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
  title text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  media_url text NOT NULL,
  target_url text NOT NULL,
  placement text NOT NULL DEFAULT 'hero',
  alt_text text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  price numeric DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  impression_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns" ON public.ad_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team with ads permission can view campaigns" ON public.ad_campaigns FOR SELECT
  USING (has_permission(auth.uid(), 'manage_ads'::text));

CREATE POLICY "Anyone can view active campaigns" ON public.ad_campaigns FOR SELECT
  USING (is_active = true AND now() >= start_date AND now() <= end_date);

CREATE TRIGGER update_ad_campaigns_updated_at BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ad Impressions table
CREATE TABLE public.ad_impressions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert impressions" ON public.ad_impressions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view impressions" ON public.ad_impressions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad Clicks table
CREATE TABLE public.ad_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks" ON public.ad_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view clicks" ON public.ad_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to increment campaign counters
CREATE OR REPLACE FUNCTION public.track_ad_impression(p_campaign_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_impressions (campaign_id, user_id) VALUES (p_campaign_id, p_user_id);
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
  INSERT INTO public.ad_clicks (campaign_id, user_id) VALUES (p_campaign_id, p_user_id);
  UPDATE public.ad_campaigns SET click_count = click_count + 1 WHERE id = p_campaign_id;
END;
$$;

-- Storage bucket for ad media
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Ad media is publicly accessible" ON storage.objects FOR SELECT
  USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ad media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ad media" ON storage.objects FOR UPDATE
  USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ad media" ON storage.objects FOR DELETE
  USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));
