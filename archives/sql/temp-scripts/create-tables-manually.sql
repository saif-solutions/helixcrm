-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'deal_daily_summaries',
    'revenue_daily_summaries',
    'pipeline_stage_summaries',
    'activity_daily_summaries'
  );
