const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectForecastData = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    SELECT
      hotel_id,
      forecast_month,
      SUM(accommodation_revenue) AS accommodation_revenue,
      SUM(non_accommodation_revenue) AS non_accommodation_revenue,
      MAX(operating_days) AS operating_days,
      MAX(available_room_nights) AS available_room_nights,
      SUM(rooms_sold_nights) AS rooms_sold_nights,
      SUM(non_accommodation_sold_rooms) AS non_accommodation_sold_rooms
    FROM du_forecast
    WHERE hotel_id = $1
      AND date_trunc('month', (forecast_month AT TIME ZONE 'Asia/Tokyo')::date) 
          BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
    GROUP BY hotel_id, forecast_month
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectAccountingData = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    SELECT
      hotel_id,
      accounting_month,
      SUM(accommodation_revenue) AS accommodation_revenue,
      SUM(non_accommodation_revenue) AS non_accommodation_revenue,
      MAX(operating_days) AS operating_days,
      MAX(available_room_nights) AS available_room_nights,
      SUM(rooms_sold_nights) AS rooms_sold_nights,
      SUM(non_accommodation_sold_rooms) AS non_accommodation_sold_rooms
    FROM du_accounting
    WHERE hotel_id = $1
      AND date_trunc('month', (accounting_month AT TIME ZONE 'Asia/Tokyo')::date) 
          BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
    GROUP BY hotel_id, accounting_month
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectForecastDataByCategory = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    WITH active_categories AS (
      -- Categories that have forecast data for this hotel
      SELECT DISTINCT 
        plan_type_category_id, 
        plan_package_category_id
      FROM du_forecast
      WHERE hotel_id = $1
      
      UNION
      
      -- Categories that are "filled" (have plans) in PMS for this hotel
      SELECT DISTINCT 
        plan_type_category_id, 
        plan_package_category_id
      FROM plans_hotel
      WHERE hotel_id = $1
    ),
    months AS (
      SELECT generate_series(
        date_trunc('month', $2::date),
        date_trunc('month', $3::date),
        '1 month'::interval
      )::date AS month
    )
    SELECT
      $1 AS hotel_id,
      m.month AS forecast_month,
      ac.plan_type_category_id,
      ac.plan_package_category_id,
      COALESCE(ptc.name, '未設定') AS type_category_name,
      COALESCE(ppc.name, '未設定') AS package_category_name,
      COALESCE(df.accommodation_revenue, 0) AS accommodation_revenue,
      COALESCE(df.non_accommodation_revenue, 0) AS non_accommodation_revenue,
      COALESCE(df.operating_days, 0) AS operating_days,
      COALESCE(df.available_room_nights, 0) AS available_room_nights,
      COALESCE(df.rooms_sold_nights, 0) AS rooms_sold_nights,
      COALESCE(df.non_accommodation_sold_rooms, 0) AS non_accommodation_sold_rooms
    FROM months m
    CROSS JOIN active_categories ac
    LEFT JOIN plan_type_categories ptc ON ac.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ac.plan_package_category_id = ppc.id
    LEFT JOIN du_forecast df ON 
      df.hotel_id = $1 AND
      m.month = df.forecast_month AND
      (df.plan_type_category_id IS NOT DISTINCT FROM ac.plan_type_category_id) AND
      (df.plan_package_category_id IS NOT DISTINCT FROM ac.plan_package_category_id)
    ORDER BY m.month, ptc.display_order, ppc.display_order
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data by category:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectAccountingDataByCategory = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    WITH active_categories AS (
      -- Categories that have accounting data for this hotel
      SELECT DISTINCT 
        plan_type_category_id, 
        plan_package_category_id
      FROM du_accounting
      WHERE hotel_id = $1
      
      UNION
      
      -- Categories that are "filled" (have plans) in PMS for this hotel
      SELECT DISTINCT 
        plan_type_category_id, 
        plan_package_category_id
      FROM plans_hotel
      WHERE hotel_id = $1
    ),
    months AS (
      SELECT generate_series(
        date_trunc('month', $2::date),
        date_trunc('month', $3::date),
        '1 month'::interval
      )::date AS month
    )
    SELECT
      $1 AS hotel_id,
      m.month AS accounting_month,
      ac.plan_type_category_id,
      ac.plan_package_category_id,
      COALESCE(ptc.name, '未設定') AS type_category_name,
      COALESCE(ppc.name, '未設定') AS package_category_name,
      COALESCE(da.accommodation_revenue, 0) AS accommodation_revenue,
      COALESCE(da.non_accommodation_revenue, 0) AS non_accommodation_revenue,
      COALESCE(da.operating_days, 0) AS operating_days,
      COALESCE(da.available_room_nights, 0) AS available_room_nights,
      COALESCE(da.rooms_sold_nights, 0) AS rooms_sold_nights,
      COALESCE(da.non_accommodation_sold_rooms, 0) AS non_accommodation_sold_rooms
    FROM months m
    CROSS JOIN active_categories ac
    LEFT JOIN plan_type_categories ptc ON ac.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ac.plan_package_category_id = ppc.id
    LEFT JOIN du_accounting da ON 
      da.hotel_id = $1 AND
      m.month = da.accounting_month AND
      (da.plan_type_category_id IS NOT DISTINCT FROM ac.plan_type_category_id) AND
      (da.plan_package_category_id IS NOT DISTINCT FROM ac.plan_package_category_id)
    ORDER BY m.month, ptc.display_order, ppc.display_order
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data by category:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

module.exports = {
  selectForecastData,
  selectAccountingData,
  selectForecastDataByCategory,
  selectAccountingDataByCategory,
  // Keep old function names for backward compatibility (deprecated)
  selectForecastDataByPlan: selectForecastDataByCategory,
  selectAccountingDataByPlan: selectAccountingDataByCategory,
};