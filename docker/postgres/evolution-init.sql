\set auth_db `echo "${EVOGO_AUTH_DB:-evogo_auth}"`
\set users_db `echo "${EVOGO_USERS_DB:-evogo_users}"`

SELECT 'CREATE DATABASE ' || quote_ident(:'auth_db')
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = :'auth_db'
)\gexec

SELECT 'CREATE DATABASE ' || quote_ident(:'users_db')
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = :'users_db'
)\gexec
