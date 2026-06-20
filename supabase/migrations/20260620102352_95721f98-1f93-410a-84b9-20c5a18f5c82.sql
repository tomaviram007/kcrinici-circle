
ALTER TABLE public.birthday_email_template
  ADD COLUMN IF NOT EXISTS preview_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS heading text DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature text DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS reply_to text DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bg_color text DEFAULT '#16110e',
  ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#f6f0e6',
  ADD COLUMN IF NOT EXISTS button_color text DEFAULT '#D4AF37';
