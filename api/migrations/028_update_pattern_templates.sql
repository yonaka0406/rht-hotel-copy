-- Migration: Update pattern templates to use plans_hotel_id instead of plan_key
-- This migration converts existing pattern templates from using deprecated plan_key
-- to using plans_hotel_id for plan identification

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
            ELSE day_value
        END
    )
    FROM jsonb_each(template) AS t(day_key, day_value)
)
WHERE template IS NOT NULL 
AND EXISTS (
    SELECT 1 
    FROM jsonb_each(template) AS t(day_key, day_value)
    WHERE day_value ? 'plan_key'
);