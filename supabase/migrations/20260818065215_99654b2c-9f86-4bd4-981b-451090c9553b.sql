ALTER TABLE public.secondhand_items ADD COLUMN IF NOT EXISTS sold_status text;
ALTER TABLE public.secondhand_items DROP CONSTRAINT IF EXISTS secondhand_items_sold_status_check;
ALTER TABLE public.secondhand_items ADD CONSTRAINT secondhand_items_sold_status_check CHECK (sold_status IS NULL OR sold_status IN ('sold','given'));
UPDATE public.secondhand_items SET sold_status = 'sold' WHERE is_sold = true AND sold_status IS NULL;