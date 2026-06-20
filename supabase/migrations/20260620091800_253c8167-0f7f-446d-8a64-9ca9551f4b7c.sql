
DO $$ BEGIN
  PERFORM cron.unschedule('email-failure-monitor-15min');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'email-failure-monitor-15min',
  '*/15 * * * *',
  $$ SELECT net.http_post(
       url := 'https://wzbvdpgoyetmgluvhygf.supabase.co/functions/v1/email-failure-monitor',
       headers := jsonb_build_object('Content-Type','application/json'),
       body := '{}'::jsonb
     ) $$
);
