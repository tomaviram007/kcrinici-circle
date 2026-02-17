
-- Add richer job fields
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS job_type text,
ADD COLUMN IF NOT EXISTS salary text,
ADD COLUMN IF NOT EXISTS requirements text,
ADD COLUMN IF NOT EXISTS company_name text;
