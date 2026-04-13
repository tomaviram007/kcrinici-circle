
-- Add target_page column to specify which page the campaign appears on
ALTER TABLE public.ad_campaigns ADD COLUMN target_page text NOT NULL DEFAULT 'all';

-- Add max_appearances to limit how many times ad shows on a page
ALTER TABLE public.ad_campaigns ADD COLUMN max_appearances integer NOT NULL DEFAULT 1;

-- Update placement default to 'premium' 
ALTER TABLE public.ad_campaigns ALTER COLUMN placement SET DEFAULT 'premium';
