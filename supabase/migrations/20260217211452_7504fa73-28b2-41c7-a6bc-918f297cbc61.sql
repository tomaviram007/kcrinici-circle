-- Add sale_data JSON column for dynamic sale-specific fields
ALTER TABLE public.announcements 
ADD COLUMN sale_type text,
ADD COLUMN sale_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN sale_image_url text;

COMMENT ON COLUMN public.announcements.sale_type IS 'Product type for sales: car, electronics, furniture, fashion, real_estate, general';
COMMENT ON COLUMN public.announcements.sale_data IS 'Dynamic fields stored as JSON based on sale_type';
COMMENT ON COLUMN public.announcements.sale_image_url IS 'Image URL for sale items';