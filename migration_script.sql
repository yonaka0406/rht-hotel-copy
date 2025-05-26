-- Migration script to modify the users table

-- 1. Make the password_hash column nullable
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add a new column auth_provider
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'local';

-- 3. Add a new column provider_user_id
ALTER TABLE users
ADD COLUMN IF NOT EXISTS provider_user_id VARCHAR(255) NULL;

-- Note:
-- Making password_hash nullable: If it's already nullable, this command won't fail.
-- It will simply do nothing.
-- Adding auth_provider: IF NOT EXISTS ensures idempotency.
-- The NOT NULL constraint and DEFAULT value are applied.
-- Adding provider_user_id: IF NOT EXISTS ensures idempotency.
-- It's explicitly set to NULL (allowing null values), which is the default for new columns
-- but stated for clarity.
--
-- To make this script fully idempotent for the auth_provider column's NOT NULL and DEFAULT constraints
-- in a scenario where the column might exist but without these constraints is more complex and
-- often handled by dropping and recreating the column or by more advanced conditional logic
-- specific to the database version or procedural extensions (like PL/pgSQL).
-- However, for the common case of adding a new column, `ADD COLUMN IF NOT EXISTS`
-- with the desired constraints is a good balance of idempotency and clarity.
--
-- Similarly, for ALTER COLUMN ... DROP NOT NULL, if the column is already nullable,
-- PostgreSQL will not error out.
--
-- If the table 'users' itself might not exist, you would typically wrap table-specific
-- DDL in a check or ensure it's created by a prior migration.
-- For example:
-- CREATE TABLE IF NOT EXISTS users (
--    id SERIAL PRIMARY KEY,
--    username VARCHAR(255) NOT NULL,
--    password_hash VARCHAR(255) NOT NULL -- Initial state before this migration
--    -- other columns...
-- );
-- This script assumes the 'users' table already exists.
