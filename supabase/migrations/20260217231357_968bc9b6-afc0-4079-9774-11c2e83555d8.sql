
-- Add gallery URLs column for sale announcements
ALTER TABLE public.announcements
ADD COLUMN sale_gallery_urls text[] DEFAULT '{}';
