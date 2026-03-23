
ALTER TABLE public.professional_recommendations 
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN is_admin_post BOOLEAN NOT NULL DEFAULT false;
