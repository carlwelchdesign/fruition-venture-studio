\set ON_ERROR_STOP on

SELECT current_database() AS database_name \gset

SELECT format(
  'CREATE ROLE fruition_admin_runtime LOGIN PASSWORD %L',
  :'runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'fruition_admin_runtime'
)\gexec

SELECT format(
  'ALTER ROLE fruition_admin_runtime PASSWORD %L',
  :'runtime_password'
)\gexec

GRANT CONNECT ON DATABASE :"database_name" TO fruition_admin_runtime;
GRANT USAGE ON SCHEMA public TO fruition_admin_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO fruition_admin_runtime;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO fruition_admin_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO fruition_admin_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO fruition_admin_runtime;
