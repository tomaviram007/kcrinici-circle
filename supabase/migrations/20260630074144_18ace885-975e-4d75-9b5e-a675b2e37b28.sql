ALTER TABLE public.secondhand_items DISABLE TRIGGER USER;
UPDATE public.secondhand_items SET is_approved = true WHERE is_approved = false;
ALTER TABLE public.secondhand_items ENABLE TRIGGER USER;