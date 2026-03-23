
ALTER TABLE public.professional_recommendations
ADD COLUMN professional_first_name TEXT,
ADD COLUMN professional_last_name TEXT;

-- Migrate existing data: split professional_name into first/last
UPDATE public.professional_recommendations
SET professional_first_name = split_part(professional_name, ' ', 1),
    professional_last_name = NULLIF(
      trim(substring(professional_name from position(' ' in professional_name))),
      ''
    );

-- Make first_name NOT NULL after migration
ALTER TABLE public.professional_recommendations
ALTER COLUMN professional_first_name SET NOT NULL,
ALTER COLUMN professional_first_name SET DEFAULT '';
