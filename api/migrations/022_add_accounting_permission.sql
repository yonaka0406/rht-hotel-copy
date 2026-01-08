-- Migration 022: Add accounting permission to user roles
-- This migration adds the 'accounting' permission to all existing roles
-- Sets it to true for admin role (ID 1) and false for all other roles

-- Update admin role (ID 1) to include accounting permission set to true
UPDATE user_roles 
SET permissions = jsonb_set(permissions, '{accounting}', 'true'::jsonb)
WHERE id = 1;

-- Update all other roles to include accounting permission set to false
UPDATE user_roles 
SET permissions = jsonb_set(permissions, '{accounting}', 'false'::jsonb)
WHERE id != 1;

-- Verify the changes
SELECT id, role_name, permissions->'accounting' as accounting_permission 
FROM user_roles 
ORDER BY id;