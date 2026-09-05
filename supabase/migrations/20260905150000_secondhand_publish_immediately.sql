-- Second hand ads now go live the moment they are submitted, guests included.
-- The admin is told about every new ad through Telegram instead of holding it
-- in a queue, and can still hide or delete anything from the admin board.

CREATE OR REPLACE FUNCTION public.secondhand_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_approved := true;
  RETURN NEW;
END;
$$;

-- Release anything left waiting from the old flow
UPDATE public.secondhand_items SET is_approved = true WHERE is_approved = false;
