ALTER TABLE public.deals ADD COLUMN benefit_type text DEFAULT 'percent';
ALTER TABLE public.deals ADD COLUMN benefit_value integer;