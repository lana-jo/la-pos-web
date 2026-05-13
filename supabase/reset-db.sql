-- =====================================================================
-- DATABASE RESET SCRIPT
-- WARNING: This will TRUNCATE all tables in the 'public' schema and
-- restart all identities. Use with extreme caution in non-production environments.
-- =====================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- disable referential constraints while truncating
  EXECUTE 'SET session_replication_role = replica';

  FOR r IN
    SELECT schemaname, tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('TRUNCATE TABLE %I.%I RESTART IDENTITY CASCADE', r.schemaname, r.tablename);
  END LOOP;

  EXECUTE 'SET session_replication_role = origin';
END $$;
