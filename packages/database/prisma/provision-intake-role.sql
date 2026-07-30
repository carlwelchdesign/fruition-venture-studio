\set ON_ERROR_STOP on
SELECT current_database() AS database_name \gset

SELECT 'CREATE ROLE fruition_intake_api NOLOGIN'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'fruition_intake_api'
)\gexec

SELECT format('CREATE ROLE fruition_intake LOGIN PASSWORD %L', :'intake_password')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'fruition_intake'
)\gexec

SELECT format('ALTER ROLE fruition_intake PASSWORD %L', :'intake_password')\gexec

GRANT fruition_intake_api TO fruition_intake;
GRANT CONNECT ON DATABASE :"database_name" TO fruition_intake_api;
GRANT USAGE ON SCHEMA public TO fruition_intake_api;
GRANT EXECUTE ON FUNCTION public.submit_fruition_idea(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) TO fruition_intake_api;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM fruition_intake_api;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM fruition_intake_api;
