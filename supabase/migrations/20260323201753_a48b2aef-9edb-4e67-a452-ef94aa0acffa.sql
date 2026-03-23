
CREATE TABLE public.professional_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  recommender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recommender_name TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_recommendations ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved recommendations
CREATE POLICY "Anyone can view approved recommendations"
ON public.professional_recommendations
FOR SELECT
USING (is_approved = true);

-- Authenticated users can submit recommendations
CREATE POLICY "Authenticated users can submit recommendations"
ON public.professional_recommendations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view own recommendations
CREATE POLICY "Users can view own recommendations"
ON public.professional_recommendations
FOR SELECT
USING (auth.uid() = recommender_user_id);

-- Admins can manage all recommendations
CREATE POLICY "Admins can manage recommendations"
ON public.professional_recommendations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_professional_recommendations_updated_at
  BEFORE UPDATE ON public.professional_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
