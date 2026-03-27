-- Backfill existing deals: extract numeric value from discount_label
UPDATE public.deals
SET benefit_value = (regexp_match(discount_label, '(\d+)'))[1]::integer
WHERE benefit_value IS NULL
  AND discount_label IS NOT NULL
  AND discount_label ~ '\d+';

-- Set consultation type for non-numeric labels
UPDATE public.deals
SET benefit_type = 'consultation', benefit_value = 1
WHERE benefit_value IS NULL
  AND discount_label IS NOT NULL
  AND discount_label !~ '\d+';