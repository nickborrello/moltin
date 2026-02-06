-- Update activity_type check constraint to include new types
ALTER TABLE activities DROP CONSTRAINT activities_activity_type_check;

ALTER TABLE activities ADD CONSTRAINT activities_activity_type_check 
CHECK (activity_type IN (
  'job_posted', 
  'application_received', 
  'application_sent', 
  'match_found', 
  'message_received',
  'application_status_updated'
));
