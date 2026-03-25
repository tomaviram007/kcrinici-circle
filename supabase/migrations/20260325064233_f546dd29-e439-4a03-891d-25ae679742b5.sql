
-- Allow public (anon) to call get_public_stats
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;

-- Allow public (anon + authenticated) to view approved, non-hidden recommendations
DROP POLICY IF EXISTS "Authenticated users can view approved recommendations" ON public.professional_recommendations;

CREATE POLICY "Anyone can view approved recommendations"
ON public.professional_recommendations
FOR SELECT
TO public
USING ((is_approved = true) AND (is_hidden = false));
