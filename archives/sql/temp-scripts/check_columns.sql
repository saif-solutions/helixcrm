SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'sent_emails'
  AND column_name LIKE 'to%';
