-- Drop the restrictive policies
DROP POLICY IF EXISTS "Anyone can read active quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can manage quotes" ON public.quotes;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can read active quotes"
ON public.quotes
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage quotes"
ON public.quotes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));