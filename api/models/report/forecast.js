const { getPool } = require('../../config/database');

const selectForecastData = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    SELECT
      hotel_id,
      forecast_month,
      SUM(accommodation_revenue) AS accommodation_revenue,
      MAX(operating_days) AS operating_days,
      MAX(available_room_nights) AS available_room_nights,
      SUM(rooms_sold_nights) AS rooms_sold_nights
    FROM du_forecast
    WHERE hotel_id = $1
      AND forecast_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
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
      MAX(operating_days) AS operating_days,
      MAX(available_room_nights) AS available_room_nights,
      SUM(rooms_sold_nights) AS rooms_sold_nights
    FROM du_accounting
    WHERE hotel_id = $1
      AND accounting_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
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

const selectForecastDataByPlan = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    SELECT
      df.hotel_id,
      df.forecast_month,
      df.plan_global_id,
      COALESCE(pg.name, '未設定') AS plan_name,
      df.accommodation_revenue,
      df.operating_days,
      df.available_room_nights,
      df.rooms_sold_nights
    FROM du_forecast df
    LEFT JOIN plans_global pg ON df.plan_global_id = pg.id
    WHERE df.hotel_id = $1
      AND df.forecast_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data by plan:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectAccountingDataByPlan = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  const query = `
    SELECT
      da.hotel_id,
      da.accounting_month,
      da.plan_global_id,
      COALESCE(pg.name, '未設定') AS plan_name,
      da.accommodation_revenue,
      da.operating_days,
      da.available_room_nights,
      da.rooms_sold_nights
    FROM du_accounting da
    LEFT JOIN plans_global pg ON da.plan_global_id = pg.id
    WHERE da.hotel_id = $1
      AND da.accounting_month BETWEEN date_trunc('month', $2::date) AND date_trunc('month', $3::date)
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data by plan:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

module.exports = {
  selectForecastData,
  selectAccountingData,
  selectForecastDataByPlan,
  selectAccountingDataByPlan,
};