-- Migration: Update pattern templates to use plans_hotel_id instead of plan_key
-- This migration converts existing pattern templates from using deprecated plan_key
-- to using plans_hotel_id for plan identification
-- It also ensures all global plans referenced in templates have hotel counterparts

-- First, create missing hotel plans for any global plans referenced in templates
-- that don't have hotel-specific counterparts
INSERT INTO plans_hotel (
    hotel_id,
    plans_global_id,
    plan_type_category_id,
    plan_package_category_id,
    name,
    description,
    plan_type,
    color,
    display_order,
    is_active,
    available_from,
    available_until,
    created_at,
    created_by,
    updated_by
)
SELECT DISTINCT
    pt.hotel_id,
    (day_value->>'plans_global_id')::int as plans_global_id,
    COALESCE(pg.plan_type_category_id, 1) as plan_type_category_id, -- Default to first category
    1 as plan_package_category_id, -- Default to 'スタンダード'
    pg.name,
    pg.description,
    pg.plan_type,
    pg.color,
    COALESCE((
        SELECT MAX(display_order) + 1 
        FROM plans_hotel ph2 
        WHERE ph2.hotel_id = pt.hotel_id
    ), 1) as display_order,
    true as is_active,
    NULL as available_from,
    NULL as available_until,
    CURRENT_TIMESTAMP,
    1 as created_by, -- System user
    1 as updated_by
FROM plan_templates pt,
     jsonb_each(pt.template) AS t(day_key, day_value)
JOIN plans_global pg ON pg.id = (day_value->>'plans_global_id')::int
WHERE day_value ? 'plans_global_id'
  AND (day_value->>'plans_global_id')::int IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM plans_hotel ph 
      WHERE ph.hotel_id = pt.hotel_id 
        AND ph.plans_global_id = (day_value->>'plans_global_id')::int
  )
ON CONFLICT (hotel_id, plans_global_id) DO NOTHING;

-- Update pattern templates to replace plan_key with plans_hotel_id
UPDATE plan_templates 
SET template = (
    SELECT jsonb_object_agg(
        day_key,
        CASE 
            WHEN day_value ? 'plan_key' THEN
                jsonb_build_object(
                    'plans_hotel_id', 
                    CASE 
                        -- Extract hotel plan ID from plan_key format like '3h60' -> 60
                        WHEN day_value->>'plan_key' ~ '^[0-9]+h[0-9]+$' THEN
                            (regexp_replace(day_value->>'plan_key', '^[0-9]+h([0-9]+)$', '\1'))::int
                        -- Handle other plan_key formats if they exist
                        ELSE NULL
                    END,
                    'plans_global_id', day_value->'plans_global_id'
                ) - 'plan_key'
            WHEN day_value ? 'plans_global_id' THEN
                -- Ensure plans_hotel_id is set for global plan references
                jsonb_build_object(
                    'plans_hotel_id', 
                    (SELECT ph.id 
                     FROM plans_hotel ph 
                     WHERE ph.hotel_id = plan_templates.hotel_id 
                       AND ph.plans_global_id = (day_value->>'plans_global_id')::int
                     LIMIT 1),
                    'plans_global_id', day_value->'plans_global_id'
                )
            ELSE day_value
        END
    )
    FROM jsonb_each(template) AS t(day_key, day_value)
)
WHERE template IS NOT NULL 
AND EXISTS (
    SELECT 1 
    FROM jsonb_each(template) AS t(day_key, day_value)
    WHERE day_value ? 'plan_key' OR day_value ? 'plans_global_id'
);