
CREATE POLICY "Admins can delete recommendations"
ON public.professional_recommendations
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update recommendations"
ON public.professional_recommendations
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
