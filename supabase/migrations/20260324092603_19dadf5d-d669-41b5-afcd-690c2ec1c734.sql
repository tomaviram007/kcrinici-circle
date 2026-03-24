
DROP POLICY IF EXISTS "Anyone can view approved recommendations" ON public.professional_recommendations;

CREATE POLICY "Authenticated users can view approved recommendations"
ON public.professional_recommendations
FOR SELECT
TO authenticated
USING (is_approved = true AND is_hidden = false);
