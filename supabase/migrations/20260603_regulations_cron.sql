-- Enable pg_cron extension (free on Supabase)
create extension if not exists pg_cron;

-- Run scrape-regulations every Sunday at 2am UTC
select cron.schedule(
  'scrape-regulations-weekly',
  '0 2 * * 0',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/scrape-regulations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
