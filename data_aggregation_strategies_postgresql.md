# Data Aggregation Strategies (PostgreSQL) for Hotel PMS Dashboard

This document outlines recommended strategies for aggregating data in PostgreSQL to support the Hotel PMS Dashboard. Efficient aggregation is crucial for dashboard performance, ensuring that key metrics can be displayed quickly without putting excessive load on the primary database tables.

## 1. Introduction to Aggregation

Pre-calculating and storing summarized data (aggregation) is a common and highly effective technique to optimize dashboard performance. Instead of running complex queries over large datasets every time the dashboard is loaded or refreshed, the dashboard can query smaller, pre-aggregated tables or materialized views. This leads to:

*   **Faster Load Times:** Dashboards retrieve data much more quickly.
*   **Reduced Database Load:** Lessens the processing burden on the operational database, especially during peak hours.
*   **Improved Scalability:** Helps the system handle more users and larger datasets more effectively.

The strategies below focus on leveraging PostgreSQL features to achieve these benefits.

---

## 2. Metrics Requiring Aggregation

Most key metrics displayed on the dashboard, especially those showing trends or daily summaries, are excellent candidates for pre-aggregation. Based on the metrics defined in `key_reservation_metrics_recommendations.md`, the following should be considered for aggregation:

*   **Daily Reservation Summaries:**
    *   Reservations Made (Count and Total Booking Value) per hotel, per day.
    *   New Cancellations (Count and Total Lost Value) per hotel, per day.
*   **Daily Operational Counts:**
    *   Check-ins Expected per hotel, per day (for future dates based on bookings).
    *   Check-outs Expected per hotel, per day (for future dates based on bookings).
    *   Actual Check-ins and Check-outs can also be aggregated daily for historical reporting.
*   **Daily Performance Metrics:**
    *   Occupancy Rate per hotel, per day/night. This requires knowing occupied/booked rooms and available rooms for each day.
    *   Revenue Per Available Room (RevPAR) per hotel, per day. This requires daily room revenue and available rooms.
*   **Periodic Calculation Metrics:**
    *   Average Lead Time: Calculated over a rolling period (e.g., last 30 days of new bookings), so daily snapshots of this average can be stored, or it can be calculated based on daily booking aggregates.
    *   Average Length of Stay (ALOS): Similar to Lead Time, calculated over a period for departed stays or new bookings. Daily snapshots of this average can be stored.

Metrics like "Check-ins expected *right now*" or "Occupancy *right now*" might involve more real-time components, discussed later. However, their daily totals/averages are prime for aggregation.

---

## 3. Recommended Aggregation Techniques

PostgreSQL offers several ways to implement pre-aggregation. The primary methods recommended are Materialized Views and dedicated Summary Tables.

### a. Materialized Views

*   **Concept:** Materialized Views (MVs) are database objects that store the result of a query. Unlike regular views, which re-execute the underlying query each time they are accessed, MVs store the data physically on disk. This means accessing an MV is as fast as querying a table. They are particularly useful for encapsulating complex aggregation logic.
*   **Example (Conceptual SQL for a daily hotel performance MV):**
    Let's assume core tables like:
    *   `hotels (hotel_id INT PRIMARY KEY, total_rooms INT)`
    *   `reservations (reservation_id INT PRIMARY KEY, hotel_id INT, creation_timestamp TIMESTAMPTZ, arrival_date DATE, departure_date DATE, status VARCHAR(20), booking_value DECIMAL(10,2), cancellation_timestamp TIMESTAMPTZ, room_id INT)`
    *   `room_stays (stay_id INT PRIMARY KEY, reservation_id INT, room_id INT, stay_date DATE, revenue DECIMAL(10,2))` (representing actual revenue per room per night for occupied rooms)

    ```sql
    -- Conceptual Example: Daily Hotel Performance MV
    CREATE MATERIALIZED VIEW daily_hotel_performance_mv AS
    SELECT
        h.hotel_id,
        d.metric_date,
        COALESCE(SUM(CASE WHEN r.creation_timestamp::DATE = d.metric_date THEN r.booking_value ELSE 0 END), 0) AS total_new_booking_value,
        COALESCE(COUNT(DISTINCT CASE WHEN r.creation_timestamp::DATE = d.metric_date THEN r.reservation_id END), 0) AS total_new_reservations,
        COALESCE(SUM(CASE WHEN r.cancellation_timestamp::DATE = d.metric_date THEN r.booking_value ELSE 0 END), 0) AS total_cancelled_value,
        COALESCE(COUNT(DISTINCT CASE WHEN r.cancellation_timestamp::DATE = d.metric_date THEN r.reservation_id END), 0) AS total_cancellations,
        COALESCE(COUNT(DISTINCT CASE WHEN r.arrival_date = d.metric_date AND r.status NOT IN ('CANCELLED', 'NO_SHOW') THEN r.reservation_id END), 0) AS expected_check_ins,
        COALESCE(COUNT(DISTINCT CASE WHEN r.departure_date = d.metric_date AND r.status = 'IN_HOUSE' THEN r.reservation_id END), 0) AS expected_check_outs, -- Simplified: Assumes 'IN_HOUSE' status correctly reflects current state
        COALESCE(SUM(rs.revenue), 0) AS total_room_revenue_for_date, -- Revenue from rooms occupied on metric_date
        COALESCE(COUNT(DISTINCT rs.room_id), 0) AS occupied_rooms_for_date, -- Rooms that generated revenue on metric_date
        h.total_rooms AS physical_rooms, -- Assuming total_rooms is the count of sellable rooms
        (COALESCE(COUNT(DISTINCT rs.room_id), 0) * 100.0 / NULLIF(h.total_rooms, 0)) AS occupancy_rate_percent,
        (COALESCE(SUM(rs.revenue), 0) / NULLIF(h.total_rooms, 0)) AS revpar
    FROM
        hotels h
    CROSS JOIN
        (SELECT generate_series(MIN(r.creation_timestamp)::DATE, MAX(r.departure_date)::DATE, '1 day')::DATE AS metric_date FROM reservations r) d -- Generate all relevant dates
    LEFT JOIN
        reservations r ON h.hotel_id = r.hotel_id AND (r.creation_timestamp::DATE <= d.metric_date AND r.departure_date >= d.metric_date OR r.cancellation_timestamp::DATE = d.metric_date)
    LEFT JOIN
        room_stays rs ON h.hotel_id = (SELECT r_inner.hotel_id FROM reservations r_inner WHERE r_inner.reservation_id = rs.reservation_id) AND rs.stay_date = d.metric_date
    GROUP BY
        h.hotel_id, d.metric_date, h.total_rooms
    ORDER BY
        h.hotel_id, d.metric_date;
    ```
*   **Refresh Strategy:**
    *   MVs need to be refreshed to update their data. PostgreSQL provides `REFRESH MATERIALIZED VIEW view_name;`.
    *   For large MVs, `REFRESH MATERIALIZED VIEW CONCURRENTLY view_name;` is recommended if a unique index exists on the MV. This allows the MV to be queried while it's being refreshed, but it's slower.
    *   **Schedule:** Refreshes can be scheduled using tools like `pg_cron` or external schedulers (e.g., cron jobs running a SQL script).
        *   **Daily Metrics:** Refresh once a day, after midnight (hotel local time).
        *   **Intra-day Metrics (e.g., Reservations Today):** Could be refreshed more frequently, e.g., hourly, if near real-time data is desired on the dashboard for these specific counters.
        *   **Event-Triggered (Advanced):** While possible using triggers and functions, this can add complexity and overhead. For dashboard purposes, scheduled refreshes are usually sufficient.

### b. Summary Tables

*   **Concept:** Instead of using MVs, you can create regular tables (often called summary tables or aggregate tables) and populate them with aggregated data using custom SQL scripts or application-level background jobs. This approach offers more control over indexing, constraints, and update logic.
*   **Example (Conceptual Table Structure):**
    ```sql
    -- Conceptual Example: Daily Hotel Metrics Table
    CREATE TABLE daily_hotel_metrics (
        hotel_id INT NOT NULL,
        metric_date DATE NOT NULL,
        total_new_booking_value DECIMAL(12,2) DEFAULT 0,
        total_new_reservations INT DEFAULT 0,
        total_cancelled_value DECIMAL(12,2) DEFAULT 0,
        total_cancellations INT DEFAULT 0,
        expected_check_ins INT DEFAULT 0,
        expected_check_outs INT DEFAULT 0,
        actual_check_ins INT DEFAULT 0, -- Can be updated as check-ins happen or daily
        actual_check_outs INT DEFAULT 0, -- Can be updated as check-outs happen or daily
        total_room_revenue DECIMAL(12,2) DEFAULT 0,
        occupied_rooms INT DEFAULT 0,
        physical_rooms INT, -- Or available_rooms if that changes
        occupancy_rate_percent DECIMAL(5,2) DEFAULT 0,
        revpar DECIMAL(10,2) DEFAULT 0,
        avg_lead_time_days DECIMAL(7,2) DEFAULT 0, -- Snapshot of avg lead time for bookings made around this date
        avg_length_of_stay_nights DECIMAL(5,2) DEFAULT 0, -- Snapshot of ALOS for stays around this date
        last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (hotel_id, metric_date)
    );

    -- Example for an hourly summary for "today's" rapidly changing metrics
    CREATE TABLE hourly_hotel_snapshot (
        hotel_id INT NOT NULL,
        metric_hour TIMESTAMPTZ NOT NULL, -- Stores the specific hour
        reservations_since_last_hour INT DEFAULT 0,
        revenue_since_last_hour DECIMAL(10,2) DEFAULT 0,
        cancellations_since_last_hour INT DEFAULT 0,
        PRIMARY KEY (hotel_id, metric_hour)
    );
    ```
*   **Population Strategy:**
    *   **Scheduled Jobs:** Use `pg_cron`, OS-level cron jobs, or an application scheduler to run SQL scripts (e.g., stored procedures or ad-hoc DML statements) that calculate and then `INSERT ... ON CONFLICT ... UPDATE` or `TRUNCATE` and `INSERT` data into these tables.
    *   **Application-Level Logic:** Background workers in the application can perform calculations and update these tables. This is useful if the logic is very complex or involves external data sources.
    *   **Frequency:** Similar to MVs; daily for most historical trends, hourly or more frequently for "today's" key figures if needed. For `daily_hotel_metrics`, a common approach is to update records for the current day more frequently (e.g., hourly) and records for past days once (e.g., nightly).

### c. Choosing Between Materialized Views and Summary Tables

*   **Materialized Views:**
    *   **Pros:** Simpler to create for straightforward aggregations (SQL query defines the structure and data). Refresh mechanism is built-in. Can often be transparent to ORMs if accessed like a read-only table.
    *   **Cons:** Less flexibility in indexing (though PostgreSQL is improving here). `REFRESH CONCURRENTLY` has limitations (requires a unique index, can be slower). Complex incremental updates are harder to manage; usually involves full recalculation or more complex query logic for the MV itself.
*   **Summary Tables:**
    *   **Pros:** Full control over table structure, indexes (can be highly optimized for query patterns), constraints, and update logic. Allows for incremental updates (e.g., updating only today's row every hour) which can be much faster than full MV refreshes. Easier to integrate with complex ETL processes. Can store metadata like `last_updated`.
    *   **Cons:** Require more manual setup for creation, population scripts, and scheduling. The logic for updates (insert, update, delete) needs to be explicitly defined and managed.
*   **Recommendation:**
    *   For many daily aggregated metrics where a full refresh daily or hourly is acceptable, **Materialized Views** can be a good starting point due to their simplicity.
    *   For very high-traffic dashboards, metrics requiring frequent intra-day updates, or complex aggregation logic not easily expressed in a single MV query, **Summary Tables** often provide better performance and flexibility. A hybrid approach is also common.

---

## 4. Real-time Data vs. Aggregated Data

While pre-aggregation is key for most dashboard metrics, there might be specific components where near real-time data is highly desirable (e.g., "Available rooms *right now*", or "Guests expected to check-in/out in the next hour").

*   **Guidance:**
    *   **Use Sparingly for Dashboards:** Direct queries to primary data tables for dashboard-level summaries should be minimized, as they can degrade performance if not carefully constructed or if they become too numerous.
    *   **Small, Specific Queries:** If used, such queries should be highly targeted (e.g., for a single hotel, for a very specific, small dataset like today's arrivals for the front desk view).
    *   **Heavy Indexing:** Ensure that the primary tables (`reservations`, `rooms`, `hotel_availability`, etc.) are extremely well-indexed on columns used in these real-time queries (e.g., `hotel_id`, `arrival_date`, `departure_date`, `status`, `creation_timestamp`).
    *   **Caching at Application Level:** For frequently requested real-time snippets, consider caching the results at the application layer for a very short period (e.g., 1-5 minutes) to reduce direct database hits.
*   **Example Scenario:**
    *   The main dashboard shows "Reservations Made Today (Count)" from an hourly refreshed summary table/MV.
    *   A separate, more operational "Front Desk View" might query the `reservations` table directly for `arrival_date = CURRENT_DATE AND status = 'Confirmed'` for the specific hotel, as this list needs to be very current. This query must be highly optimized.
*   **Balance:** The goal is to balance data freshness with system performance. Most strategic dashboard metrics do not require sub-minute accuracy and are well-served by aggregations refreshed at appropriate intervals (hourly to daily).

---

## 5. Aggregation Granularity and Retention

*   **Recommended Granularity:**
    *   **Daily:** This is the most common and useful granularity for trend analysis on a PMS dashboard (e.g., `daily_hotel_metrics` or daily MVs). It allows for tracking KPIs day-over-day, week-over-week, etc.
    *   **Hourly:** For certain key metrics that change rapidly throughout the day and are valuable for operational decisions (e.g., "Reservations Made Today," "Cancellations Today," "Occupancy for Tonight"), hourly snapshots can be beneficial. These could be stored in separate tables (like `hourly_hotel_snapshot`) or by updating the current day's record in a daily summary table more frequently.
    *   **Monthly/Weekly:** While dashboards typically show daily trends, underlying monthly or weekly aggregates can also be generated for longer-term performance reporting, potentially from the daily aggregates.
*   **Data Retention for Aggregates:**
    *   Aggregated data is typically much smaller than the raw transactional data. However, a retention policy is still needed.
    *   **Daily Aggregates:** Retain for a significant period, e.g., 2-5 years, or as long as detailed daily trend analysis is required.
    *   **Hourly Aggregates:** May not need to be stored for as long as daily aggregates. For example, retain hourly details for the last 30-90 days, after which they could be rolled up into daily summaries if not already done, or purged if the daily summary is sufficient.
    *   **Alignment with Primary Data:** The retention policy for aggregates should align with business needs and any regulations regarding the primary data. However, aggregates can often be kept longer than raw detailed logs if they provide sufficient historical insight.
    *   **Storage Considerations:** Factor in storage costs, though typically aggregates consume far less space than the source transactional tables.
*   **Configurability:** Where feasible, make refresh intervals and retention periods configurable per hotel or system-wide to adapt to different needs or scales.
