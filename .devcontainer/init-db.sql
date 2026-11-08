-- init-db.sql: Idempotent initialization of development and test databases
-- Primary development database 'archon_dev' is created by POSTGRES_DB.
-- The test database 'archon_test' is created here idempotently.
-- Vector extensions and table schemas are strictly delegated to application migrations.

SELECT 'CREATE DATABASE archon_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'archon_dev')\gexec

SELECT 'CREATE DATABASE archon_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'archon_test')\gexec
