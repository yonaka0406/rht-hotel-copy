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
    SELECT
      df.hotel_id,
      df.forecast_month,
      df.plan_type_category_id,
      df.plan_package_category_id,
      COALESCE(ptc.name, '未設定') AS type_category_name,
      COALESCE(ppc.name, '未設定') AS package_category_name,
      df.accommodation_revenue,
      df.non_accommodation_revenue,
      df.operating_days,
      df.available_room_nights,
      df.rooms_sold_nights,
      df.non_accommodation_sold_rooms
    FROM du_forecast df
    LEFT JOIN plan_type_categories ptc ON df.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON df.plan_package_category_id = ppc.id
    WHERE df.hotel_id = $1
      AND df.forecast_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
    ORDER BY df.forecast_month, ptc.display_order, ppc.display_order
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
    SELECT
      da.hotel_id,
      da.accounting_month,
      da.plan_type_category_id,
      da.plan_package_category_id,
      COALESCE(ptc.name, '未設定') AS type_category_name,
      COALESCE(ppc.name, '未設定') AS package_category_name,
      da.accommodation_revenue,
      da.non_accommodation_revenue,
      da.operating_days,
      da.available_room_nights,
      da.rooms_sold_nights,
      da.non_accommodation_sold_rooms
    FROM du_accounting da
    LEFT JOIN plan_type_categories ptc ON da.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON da.plan_package_category_id = ppc.id
    WHERE da.hotel_id = $1
      AND da.accounting_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
    ORDER BY da.accounting_month, ptc.display_order, ppc.display_order
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