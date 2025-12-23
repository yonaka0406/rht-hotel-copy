-- Add default/unassigned categories with ID 0 to satisfy unique constraints in du_forecast and du_accounting
-- These IDs will be used instead of NULL in the UNIQUE index to prevent duplicate entries while allowing "unassigned" categories.

INSERT INTO plan_type_categories (id, name, display_order, created_by)
VALUES (0, '未設定', 0, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO plan_package_categories (id, name, display_order, created_by)
VALUES (0, '未設定', 0, 1)
ON CONFLICT (id) DO NOTHING;

-- Update existing records to use ID 0 instead of NULL
-- This ensures that the unique constraint (which considers NULL != NULL) treats unassigned categories consistently.
UPDATE du_forecast SET plan_type_category_id = 0 WHERE plan_type_category_id IS NULL;
UPDATE du_forecast SET plan_package_category_id = 0 WHERE plan_package_category_id IS NULL;
UPDATE du_accounting SET plan_type_category_id = 0 WHERE plan_type_category_id IS NULL;
UPDATE du_accounting SET plan_package_category_id = 0 WHERE plan_package_category_id IS NULL;

-- Update the sequences to ensure they don't try to reuse 0
SELECT setval('plan_type_categories_id_seq', COALESCE((SELECT MAX(id) FROM plan_type_categories), 1));
SELECT setval('plan_package_categories_id_seq', COALESCE((SELECT MAX(id) FROM plan_package_categories), 1));
