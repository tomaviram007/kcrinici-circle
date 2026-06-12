
CREATE TABLE public.secondhand_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'ILS',
  condition TEXT NOT NULL DEFAULT 'used_good',
  category TEXT NOT NULL DEFAULT 'כללי',
  images TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  contact_phone TEXT,
  is_sold BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.secondhand_items TO authenticated;
GRANT ALL ON public.secondhand_items TO service_role;

ALTER TABLE public.secondhand_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users can view active items"
ON public.secondhand_items FOR SELECT TO authenticated
USING (is_active = true AND public.is_approved_user(auth.uid()));

CREATE POLICY "Admins can view all items"
ON public.secondhand_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users can insert their own items"
ON public.secondhand_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by AND public.is_approved_user(auth.uid()));

CREATE POLICY "Owners can update their items"
ON public.secondhand_items FOR UPDATE TO authenticated
USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update any item"
ON public.secondhand_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete their items"
ON public.secondhand_items FOR DELETE TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete any item"
ON public.secondhand_items FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_secondhand_items_updated_at
BEFORE UPDATE ON public.secondhand_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_secondhand_items_created_at ON public.secondhand_items (created_at DESC);
CREATE INDEX idx_secondhand_items_category ON public.secondhand_items (category);
