
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  discount_label TEXT,
  coupon_code TEXT,
  business_name TEXT NOT NULL,
  business_logo_url TEXT,
  business_phone TEXT,
  category TEXT NOT NULL DEFAULT 'כללי',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deals" ON public.deals FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved users can view active deals" ON public.deals FOR SELECT TO public
  USING (is_active = true AND is_approved_user(auth.uid()));
