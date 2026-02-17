-- Add category column to announcements for filtering (הודעות / מכירות)
ALTER TABLE public.announcements 
ADD COLUMN category text NOT NULL DEFAULT 'announcement';

-- Add comment for clarity
COMMENT ON COLUMN public.announcements.category IS 'announcement or sale';