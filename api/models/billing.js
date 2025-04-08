const { getPool } = require('../config/database');

const selectBillableListView = async (requestId, hotelId, dateStart, dateEnd) => {
    const pool = getPool(requestId);
    const query = `
      SELECT
        reservations.hotel_id
        ,hotels.formal_name
        ,reservations.id
        ,reservations.status
        ,reservations.reservation_client_id AS booker_id
        ,COALESCE(booker.name_kanji, booker.name, booker.name_kana) AS booker_name
        ,booker.name_kana AS booker_name_kana
        ,booker.name_kanji AS booker_name_kanji
        ,reservations.check_in
        ,reservations.check_out
        ,reservations.check_out - reservations.check_in AS number_of_nights
        ,reservations.number_of_people
        ,details.plan_price		
        ,details.addon_price
        ,(details.plan_price + details.addon_price) AS price
        ,details.plan_period_price
        ,details.addon_period_price
        ,(details.plan_period_price + details.addon_period_price) AS period_price
        ,details.payment
        ,details.clients_json
        ,details.payers_json
      FROM
        reservations	
        ,hotels
        ,clients AS booker
        ,(
          SELECT 
            reservation_details.hotel_id
            ,reservation_details.reservation_id
            ,rc.clients_json::TEXT AS clients_json
            ,rpc.clients_json::TEXT AS payers_json          
            ,COALESCE(rp.payment,0) as payment          
            ,SUM(
              CASE WHEN reservation_details.plan_type = 'per_room' THEN rr.rates_price
              ELSE rr.rates_price * reservation_details.number_of_people END              
            ) AS plan_price
            ,SUM(
              CASE WHEN reservation_details.billable = TRUE AND reservation_details.cancelled IS NULL THEN COALESCE(ra.addon_sum,0) ELSE 0 END
            ) AS addon_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 THEN
                CASE WHEN reservation_details.plan_type = 'per_room' THEN rr.rates_price
                ELSE rr.rates_price * reservation_details.number_of_people END
              ELSE 0 END
            ) AS plan_period_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 THEN
                CASE WHEN reservation_details.billable = TRUE AND reservation_details.cancelled IS NULL THEN COALESCE(ra.addon_sum,0) ELSE 0 END
              ELSE 0 END
            ) AS addon_period_price 
          FROM
            reservation_details 
              LEFT JOIN 
            (
              SELECT 
                rr.reservation_details_id
                ,SUM(rr.price) AS rates_price
              FROM reservation_rates rr, reservation_details rd
              WHERE rr.reservation_details_id = rd.id AND rd.billable = TRUE 
                      AND (rd.cancelled IS NULL OR rr.adjustment_type = 'base_rate')
              GROUP BY rr.reservation_details_id
            ) rr ON rr.reservation_details_id = reservation_details.id           
              LEFT JOIN
            (
              SELECT 
                ra.hotel_id
                ,ra.reservation_detail_id
                ,SUM(COALESCE(ra.quantity,0) * COALESCE(ra.price,0)) as addon_sum
              FROM reservation_addons ra
              GROUP BY ra.hotel_id, ra.reservation_detail_id
            )
            ra
              ON reservation_details.hotel_id = ra.hotel_id AND reservation_details.id = ra.reservation_detail_id
              LEFT JOIN 
            (
              SELECT 
                rc.reservation_id,
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'client_id', rc.client_id,
                    'name', c.name,
                    'name_kana', c.name_kana,
                    'name_kanji', c.name_kanji,
                    'email', c.email,
                    'phone', c.phone
                  )
                ) AS clients_json
              FROM 
                (SELECT DISTINCT reservation_id, client_id FROM reservation_clients rc JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
                JOIN clients c ON rc.client_id = c.id
              GROUP BY rc.reservation_id
            ) rc ON rc.reservation_id = reservation_details.reservation_id
             LEFT JOIN
            (
              SELECT
                reservation_id
                ,SUM(value) as payment
              FROM 
                reservation_payments 
                  JOIN 
                payment_types 
                  ON reservation_payments.payment_type_id = payment_types.id
              WHERE payment_types.transaction <> 'bill'
              GROUP BY reservation_id
            ) rp ON rp.reservation_id = reservation_details.reservation_id
              LEFT JOIN
            (
              SELECT 
                rpc.reservation_id,
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'client_id', c.id,
                    'name', c.name,
                    'name_kana', c.name_kana,
                    'name_kanji', c.name_kanji,
                    'email', c.email,
                    'phone', c.phone
                  )
                ) AS clients_json
              FROM 
                (SELECT DISTINCT reservation_id, client_id FROM reservation_payments rp JOIN reservations r ON rp.reservation_id = r.id) rpc
                JOIN clients c ON rpc.client_id = c.id
              GROUP BY rpc.reservation_id
            ) rpc ON rpc.reservation_id = reservation_details.reservation_id
          WHERE
            reservation_details.hotel_id = $1
          GROUP BY
            reservation_details.hotel_id
            ,reservation_details.reservation_id
            ,rc.clients_json::TEXT
            ,rpc.clients_json::TEXT          
            ,rp.payment
        ) AS details
      WHERE
        reservations.hotel_id = $1
        AND reservations.check_out > $2
        AND reservations.check_in <= $3	  
        AND reservations.status <> 'block'  
        AND reservations.reservation_client_id = booker.id
        AND reservations.id = details.reservation_id
        AND reservations.hotel_id = details.hotel_id
        AND reservations.hotel_id = hotels.id
      ORDER BY 5, 7;
    `;
    const values = [hotelId, dateStart, dateEnd]
  
    try {
      const result = await pool.query(query, values);    
      return result.rows;
    } catch (err) {
      console.error('Error retrieving data:', err);
      throw new Error('Database error');
    }
  };

  module.exports = {    
    selectBillableListView,    
  };