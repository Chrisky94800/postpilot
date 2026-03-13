-- Migration 015: Replace n8n schedule with pg_cron for publish-scheduled-posts
-- Saves ~8,640 n8n executions/month (from every 5 min via n8n)
-- Now runs every 30 min directly in Supabase (0 n8n executions)

-- NOTE: pg_cron and pg_net are managed by Supabase infrastructure.
-- Enable them via: Dashboard → Database → Extensions → pg_cron + pg_net
-- Do NOT run CREATE EXTENSION here — it causes a privilege conflict.

-- Remove existing job if it exists (idempotent)
SELECT cron.unschedule('publish-scheduled-posts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-posts'
);

-- Create cron job: every 30 minutes
SELECT cron.schedule(
  'publish-scheduled-posts',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://tplgbskcvimemwtwpxyk.supabase.co/functions/v1/publish-scheduled-posts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'apikey',        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGdic2tjdmltZW13dHdweHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjM2NTcsImV4cCI6MjA4NzMzOTY1N30.WQ8iMnCTuL6oGp8nU5YE8tiXfjCYYQks0qfnbhT3wmk',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwbGdic2tjdmltZW13dHdweHlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NjM2NTcsImV4cCI6MjA4NzMzOTY1N30.WQ8iMnCTuL6oGp8nU5YE8tiXfjCYYQks0qfnbhT3wmk'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify job was created
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'publish-scheduled-posts';
