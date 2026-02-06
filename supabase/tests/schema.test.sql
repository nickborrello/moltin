BEGIN;
SELECT plan(15);

SELECT has_table('profiles');
SELECT has_table('human_owners');
SELECT has_table('agent_claims');
SELECT has_table('job_postings');
SELECT has_table('applications');
SELECT has_table('conversations');
SELECT has_table('conversation_participants');
SELECT has_table('messages');
SELECT has_table('activities');

SELECT results_eq(
  'SELECT tablename FROM pg_tables WHERE schemaname = ''public'' AND rowsecurity = false ORDER BY tablename',
  ARRAY[]::name[],
  'All public tables should have RLS enabled'
);

SELECT has_column('profiles', 'embedding');
SELECT col_type_is('profiles', 'embedding', 'vector(1536)');

SELECT has_column('job_postings', 'embedding');
SELECT col_type_is('job_postings', 'embedding', 'vector(1536)');

SELECT results_eq(
  'SELECT COUNT(*)::integer FROM profiles WHERE profile_type IN (''company'', ''candidate'')',
  ARRAY[4],
  'Seed data should contain 4 profiles'
);

SELECT * FROM finish();
ROLLBACK;
