-- UP: Fixes the get_available_plans_with_rates_and_addons function to correctly retrieve addon_type
-- AND adds p_include_inactive parameter to optionally return inactive plans.

CREATE OR REPLACE FUNCTION get_available_plans_with_rates_and_addons(
    p_hotel_id INT,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE -- New parameter
)
RETURNS TABLE (
    plan_id INT,
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
    SELECT
        ph.id AS plan_id,
        ph.name AS plan_name,
        ph.plan_type,
        ph.description,
        ptc.name AS type_category,
        ppc.name AS package_category,
        ph.display_order,
        ph.is_active,
        ph.color,
        -- Aggregate rates as JSONB array
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'rate_id', pr.id,
                'date_start', pr.date_start,
                'date_end', pr.date_end,
                'adjustment_type', pr.adjustment_type,
                'adjustment_value', pr.adjustment_value,
                'condition_type', pr.condition_type,
                'condition_value', pr.condition_value,
                'tax_rate', pr.tax_rate,
                'sales_category', pr.sales_category
            ) ORDER BY pr.date_start)
            FROM plans_rates pr
            WHERE pr.plans_hotel_id = ph.id
              AND pr.hotel_id = ph.hotel_id
              AND pr.date_start <= COALESCE(p_date_end, p_target_date)
              AND (pr.date_end IS NULL OR pr.date_end >= p_target_date)
            ), '[]'::jsonb
        ) AS rates,
        -- Aggregate addons as JSONB array
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'addon_id', ah.id,
                'addon_name', ah.name,
                'addon_type', ac.addon_type,
                'price', ah.price,
                'tax_rate', ah.tax_rate,
                'net_price', ah.net_price,
                'visible', ah.visible
            ) ORDER BY ah.display_order)
            FROM plan_addons pa
            JOIN addons_hotel ah ON pa.addons_hotel_id = ah.id AND pa.hotel_id = ah.hotel_id
            JOIN addon_categories ac ON ah.addon_category_id = ac.id
            WHERE pa.plans_hotel_id = ph.id
              AND pa.hotel_id = ph.hotel_id
              AND ah.is_active = true
            ), '[]'::jsonb
        ) AS addons
    FROM plans_hotel ph
    LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
    WHERE ph.hotel_id = p_hotel_id
      AND (p_include_inactive OR ph.is_active = true) -- Modified filter
      AND (ph.available_from IS NULL OR ph.available_from <= p_target_date)
      AND (ph.available_until IS NULL OR ph.available_until >= COALESCE(p_date_end, p_target_date))
    ORDER BY ph.display_order;
END;
$$ LANGUAGE plpgsql STABLE;