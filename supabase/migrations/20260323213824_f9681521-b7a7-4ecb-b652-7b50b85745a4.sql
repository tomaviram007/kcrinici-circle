
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, address, phone, profession, expertise, bio, birth_date, hobbies, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'profession', ''),
    NEW.raw_user_meta_data->>'expertise',
    NEW.raw_user_meta_data->>'bio',
    CASE WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL AND NEW.raw_user_meta_data->>'birth_date' != '' 
         THEN (NEW.raw_user_meta_data->>'birth_date')::date 
         ELSE NULL END,
    NEW.raw_user_meta_data->>'hobbies',
    CASE WHEN NEW.email = 'tomaviram2187@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$function$;

-- Also auto-approve existing admin profile if not already approved
UPDATE public.profiles SET is_approved = true WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tomaviram2187@gmail.com'
) AND is_approved = false;
