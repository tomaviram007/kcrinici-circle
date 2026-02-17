
-- Add display settings columns to quotes table
ALTER TABLE public.quotes ADD COLUMN background_image_url TEXT DEFAULT NULL;
ALTER TABLE public.quotes ADD COLUMN section_height INTEGER DEFAULT 28;
ALTER TABLE public.quotes ADD COLUMN font_size INTEGER DEFAULT 24;
ALTER TABLE public.quotes ADD COLUMN page_location TEXT DEFAULT 'home';
