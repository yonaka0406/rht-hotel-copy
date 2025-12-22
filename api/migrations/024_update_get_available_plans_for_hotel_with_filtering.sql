-- Migration to update get_available_plans_for_hotel function to use new filtering columns
-- while maintaining compatibility with global plans and global addons (not deprecated yet)

-- Drop the old function
DROP FUNCTION IF EXISTS get_available_plans_for_hotel(INTEGER);
DROP FUNCTION IF EXISTS get_available_plans_for_hotel(INTEGER, DATE);

-- Create updated function with date range support for checking plan availability over a period
CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(
    p_hotel_id INTEGER,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7),
    plan_type_category_id INT,
    plan_package_category_id INT,
    display_order INT,
    is_active BOOLEAN,
    available_from DATE,
    available_until DATE
) AS $$
BEGIN
    RETURN QUERY
    -- Hotel-specific plans with new filtering
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name,
        ph.description,
        ph.plan_type,
        ph.color,
        ph.plan_type_category_id,
        ph.plan_package_category_id,
        ph.display_order,
        ph.is_active,
        ph.available_from,
        ph.available_until
    FROM
        plans_hotel AS ph
    WHERE
        ph.hotel_id = p_hotel_id
        AND (p_include_inactive OR ph.is_active = true) -- Filter by active status unless including inactive
        AND (ph.available_from IS NULL OR ph.available_from <= p_target_date) -- Plan must be available from the start date
        AND (ph.available_until IS NULL OR ph.available_until >= COALESCE(p_date_end, p_target_date)) -- Plan must be available until the end date (or target date if no end date)

    UNION ALL

    -- Global plans (still supported, not deprecated yet)
    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name,
        pg.description,
        pg.plan_type,
        pg.color,
        NULL::INT AS plan_type_category_id,
        NULL::INT AS plan_package_category_id,
        999 AS display_order, -- Put global plans at the end
        true AS is_active, -- Global plans are always considered active
        NULL::DATE AS available_from,
        NULL::DATE AS available_until
    FROM
        plans_global AS pg
    WHERE
        NOT EXISTS (
            SELECT 1
            FROM hotel_plan_exclusions hpe
            WHERE hpe.global_plan_id = pg.id AND hpe.hotel_id = p_hotel_id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM plans_hotel ph
            WHERE ph.plans_global_id = pg.id AND ph.hotel_id = p_hotel_id
        )
    
    ORDER BY display_order ASC, plan_type ASC, name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create overloaded functions for backward compatibility
CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(p_hotel_id INT)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7),
    plan_type_category_id INT,
    plan_package_category_id INT,
    display_order INT,
    is_active BOOLEAN,
    available_from DATE,
    available_until DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_available_plans_for_hotel(p_hotel_id, CURRENT_DATE, NULL, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Overloaded function with just target date (for single date checks)
CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(
    p_hotel_id INT,
    p_target_date DATE
)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7),
    plan_type_category_id INT,
    plan_package_category_id INT,
    display_order INT,
    is_active BOOLEAN,
    available_from DATE,
    available_until DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_available_plans_for_hotel(p_hotel_id, p_target_date, NULL, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Optional: Create the enhanced function for future use when ready to include rates and addons
-- This can be used when you want to reduce database calls by getting everything in one query
CREATE OR REPLACE FUNCTION get_available_plans_with_rates_and_addons(
    p_hotel_id INT,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    plan_name TEXT,
    plan_type TEXT,
    description TEXT,
    type_category TEXT,
    package_category TEXT,
    display_order INT,
    is_active BOOLEAN,
    color VARCHAR(7),
    rates JSONB,
    addons JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Hotel-specific plans with rates and addons
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name AS plan_name,
        ph.plan_type,
        ph.description,
        ptc.name AS type_category,
        ppc.name AS package_category,
        ph.display_order,
        ph.is_active,
        ph.color,
        -- Aggregate rates as JSONB array
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rate_id', pr.id,
                    'date_start', pr.date_start,
                    'date_end', pr.date_end,
                    'adjustment_type', pr.adjustment_type,
                    'adjustment_value', pr.adjustment_value,
                    'condition_type', pr.condition_type,
                    'condition_value', pr.condition_value,
                    'tax_rate', pr.tax_rate,
                    'sales_category', pr.sales_category
                ) ORDER BY pr.date_start
            )
            FROM plans_rates pr
            WHERE pr.plans_hotel_id = ph.id
                AND pr.hotel_id = ph.hotel_id
                AND pr.date_start <= COALESCE(p_date_end, p_target_date)
                AND (pr.date_end IS NULL OR pr.date_end >= p_target_date)
        ), '[]'::jsonb) AS rates,
        -- Aggregate addons as JSONB array (including both hotel and global addons)
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'addon_id', COALESCE(ah.id, ag.id),
                    'addon_name', COALESCE(ah.name, ag.name),
                    'addon_type', ac.addon_type,
                    'price', COALESCE(ah.price, ag.price),
                    'tax_rate', COALESCE(ah.tax_rate, ag.tax_rate),
                    'net_price', COALESCE(ah.net_price, ag.net_price),
                    'visible', COALESCE(ah.visible, ag.visible),
                    'is_global', CASE WHEN ag.id IS NOT NULL THEN true ELSE false END
                ) ORDER BY COALESCE(ah.display_order, ag.display_order, 999)
            )
            FROM plan_addons pa
            LEFT JOIN addons_hotel ah ON pa.addons_hotel_id = ah.id AND pa.hotel_id = ah.hotel_id
            LEFT JOIN addons_global ag ON pa.addons_global_id = ag.id
            LEFT JOIN addon_categories ac ON COALESCE(ah.addon_category_id, ag.addon_category_id) = ac.id
            WHERE pa.plans_hotel_id = ph.id
                AND pa.hotel_id = ph.hotel_id
                AND (ah.is_active = true OR ag.id IS NOT NULL) -- Hotel addons must be active, global addons are always considered active
        ), '[]'::jsonb) AS addons
    FROM plans_hotel ph
    LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
    WHERE ph.hotel_id = p_hotel_id
        AND (p_include_inactive OR ph.is_active = true)
        AND (ph.available_from IS NULL OR ph.available_from <= p_target_date)
        AND (ph.available_until IS NULL OR ph.available_until >= COALESCE(p_date_end, p_target_date))

    UNION ALL

    -- Global plans with their rates and addons
    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name AS plan_name,
        pg.plan_type,
        pg.description,
        NULL::TEXT AS type_category,
        NULL::TEXT AS package_category,
        999 AS display_order,
        true AS is_active,
        pg.color,
        -- Global plan rates
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rate_id', pr.id,
                    'date_start', pr.date_start,
                    'date_end', pr.date_end,
                    'adjustment_type', pr.adjustment_type,
                    'adjustment_value', pr.adjustment_value,
                    'condition_type', pr.condition_type,
                    'condition_value', pr.condition_value,
                    'tax_rate', pr.tax_rate,
                    'sales_category', pr.sales_category
                ) ORDER BY pr.date_start
            )
            FROM plans_rates pr
            WHERE pr.plans_global_id = pg.id
                AND pr.hotel_id = p_hotel_id
                AND pr.date_start <= COALESCE(p_date_end, p_target_date)
                AND (pr.date_end IS NULL OR pr.date_end >= p_target_date)
        ), '[]'::jsonb) AS rates,
        -- Global plan addons
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'addon_id', ag.id,
                    'addon_name', ag.name,
                    'addon_type', ac.addon_type,
                    'price', ag.price,
                    'tax_rate', ag.tax_rate,
                    'net_price', ag.net_price,
                    'visible', ag.visible,
                    'is_global', true
                ) ORDER BY ag.display_order
            )
            FROM plan_addons pa
            JOIN addons_global ag ON pa.addons_global_id = ag.id
            JOIN addon_categories ac ON ag.addon_category_id = ac.id
            WHERE pa.plans_global_id = pg.id
                AND pa.hotel_id = p_hotel_id
        ), '[]'::jsonb) AS addons
    FROM plans_global pg
    WHERE NOT EXISTS (
            SELECT 1
            FROM hotel_plan_exclusions hpe
            WHERE hpe.global_plan_id = pg.id AND hpe.hotel_id = p_hotel_id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM plans_hotel ph
            WHERE ph.plans_global_id = pg.id AND ph.hotel_id = p_hotel_id
        )
    
    ORDER BY display_order ASC, plan_type ASC, plan_name ASC;
END;
$$ LANGUAGE plpgsql STABLE;
