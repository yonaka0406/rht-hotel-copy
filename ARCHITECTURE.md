# Data Aggregation Strategies for PostgreSQL

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
        *   **Current Implementation Note:** Monthly and yearly cumulative occupancy rates, comparing actual vs. forecast, are available in the reporting section (`frontend/src/pages/Reporting/components/ReportingSingleMonthHotel.vue` and `frontend/src/pages/Reporting/components/ReportingSingleMonthAllHotels.vue`). The main dashboard (`frontend/src/pages/MainPage/Dashboard.vue`) also displays occupancy rate gauges for the current and next two months.
    *   Revenue Per Available Room (RevPAR) per hotel, per day. This requires daily room revenue and available rooms.
        *   **Current Implementation Note:** Monthly and yearly cumulative RevPAR (and ADR) figures, comparing actual vs. forecast, are available in the reporting section (`frontend/src/pages/Reporting/components/ReportingSingleMonthHotel.vue` and `frontend/src/pages/Reporting/components/ReportingSingleMonthAllHotels.vue`).
*   **Periodic Calculation Metrics:**
    *   Average Lead Time: Calculated over a rolling period (e.g., last 30 days of new bookings), so daily snapshots of this average can be stored, or it can be calculated based on daily booking aggregates.
        *   **Current Implementation Note:** A detailed lead day analysis (average room nights booked X days prior to stay for a target month, and a heatmap) is available in `frontend/src/pages/Reporting/components/MonthlyReservationEvolutionReport.vue`. Additionally, `frontend/src/pages/Admin/AdminPanel.vue` displays a weighted average lead time specifically for "Today's Bookings," aggregated across all hotels. The single aggregated "Average Lead Time" metric as defined in section 6 under "Key Reservation Metrics Recommendations" (calculated over a broader period like 30 days for general users) is still a recommended enhancement.
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
    *   **Application-Level Logic:** Background processes in the application can perform calculations and update these tables. This is useful if the logic is very complex or involves external data sources.
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


# Key Reservation Metrics Recommendations

# Key Reservation Metrics for Hotel PMS Dashboard

This document outlines the recommended key reservation metrics to be displayed on the Hotel Property Management System (PMS) dashboard. Each metric is defined with its calculation method, importance, and specific considerations.

## Time Zone and Date Definitions

*   **"Today"**: Refers to the current calendar date (00:00:00 to 23:59:59) based on the hotel's local time zone. This time zone must be configurable for each hotel within the PMS.
*   **"Tonight"**: Refers to the upcoming night, specifically for occupancy calculations.
*   **Calculation Periods**: For metrics like Average Lead Time and Average Length of Stay, the default calculation period will be "the last 30 days of relevant data" (e.g., new bookings, completed stays). This period should be configurable.

---

## 1. Reservations Made Today

*   **Description:** Total number of new reservations created today and their cumulative booking value.
*   **Calculation:**
    *   **Count:** Sum of all reservations where the `reservation_creation_timestamp` falls within the defined "Today" period for the hotel's local time zone.
    *   **Total Booking Value:** Sum of `total_booking_amount` for all reservations counted above. This should represent the anticipated room revenue from these bookings.
*   **Importance:** Provides a real-time pulse on booking activity and immediate revenue generation. Helps gauge daily performance against targets and understand demand patterns.
*   **Considerations:**
    *   Ensure the hotel's local time zone is accurately used for `reservation_creation_timestamp`.
    *   Clarify whether `total_booking_amount` includes taxes or add-on services. For consistency, it's recommended to focus on net room revenue if possible, or clearly label what the value includes.
    *   Modifications to existing bookings (e.g., date change, room type change) should not be counted as new reservations unless the original is cancelled and a new one is created. The system should clearly define what constitutes a "new" reservation.

---

## 2. Check-ins Expected Today

*   **Description:** Total number of reservations scheduled for arrival "Today".
*   **Calculation:**
    *   Count: Sum of all reservations where the `arrival_date` is "Today" and the reservation status is "Confirmed" or "Pending Arrival" (or equivalent statuses indicating an expected arrival).
*   **Importance:** Crucial for front desk planning, staffing, room allocation, and preparing for guest arrivals. Helps anticipate workload and potential issues.
*   **Considerations:**
    *   The calculation should only include active reservations (e.g., not cancelled or no-show).
    *   It's useful to differentiate between individual and group check-ins if possible, as group check-ins might require more resources.
    *   Displaying a list of expected arrivals with guest names and reservation details is a common complementary feature.

---

## 3. Check-outs Expected Today

*   **Description:** Total number of reservations scheduled for departure "Today".
*   **Calculation:**
    *   Count: Sum of all reservations where the `departure_date` is "Today" and the reservation status indicates the guest is currently in-house (e.g., "Checked-in", "In-House").
*   **Importance:** Essential for housekeeping planning, managing late check-out requests, and anticipating room availability for arriving guests.
*   **Considerations:**
    *   The calculation should only include guests currently checked in.
    *   It's useful to also show "Actual Check-outs" as the day progresses.
    *   Displaying a list of expected departures is a common complementary feature.

---

## 4. New Cancellations Today

*   **Description:** Total number of reservations cancelled "Today", and their cumulative booking value.
*   **Calculation:**
    *   **Count:** Sum of reservations where the `cancellation_timestamp` falls within the defined "Today" period for the hotel's local time zone.
    *   **Total Lost Value:** Sum of `total_booking_amount` for the reservations counted above.
*   **Importance:** Helps monitor cancellation trends, understand potential revenue loss, and identify patterns that might indicate issues with booking sources, policies, or pricing.
*   **Considerations:**
    *   Ensure the hotel's local time zone is accurately used for `cancellation_timestamp`.
    *   Differentiate between cancellations with and without penalty, if possible.
    *   It might be useful to track the original booking date of cancelled reservations to understand how far in advance cancellations are occurring.

---

## 5. Occupancy Rate

*   **Description:** The percentage of available rooms that are occupied or booked for a specific night.
*   **Calculation (for "Tonight"):**
    *   `(Total Occupied Rooms Tonight + Total Confirmed Reservations for Tonight) / Total Available Rooms for Sale Tonight * 100%`
    *   **Total Occupied Rooms Tonight:** Number of rooms currently with "Checked-in" status.
    *   **Total Confirmed Reservations for Tonight:** Number of rooms with "Confirmed" or "Pending Arrival" status for tonight (excluding already checked-in rooms).
    *   **Total Available Rooms for Sale Tonight:** Total physical rooms in the hotel minus any rooms not available for sale (e.g., out-of-order, under maintenance).
*   **Importance:** A primary indicator of hotel performance and demand. Used for revenue management, staffing, and operational planning.
*   **Considerations:**
    *   The PMS must have an accurate count of `Total Available Rooms for Sale`. This means rooms marked as "Out of Order" or "Not Available" should be excluded from the denominator.
    *   Clarity is needed on whether "confirmed reservations" includes tentative or non-guaranteed bookings. Generally, only guaranteed/confirmed bookings are included.
    *   **Optional Extension:** Display occupancy for the next 3 (or X) days to help with forecasting and yield management. The calculation for future dates would be: `(Total Confirmed Reservations for Date X) / Total Available Rooms for Sale on Date X * 100%`.
        *   **Current Implementation Note:** Future occupancy for the current and next two months is displayed via gauge charts in `frontend/src/pages/MainPage/Dashboard.vue`. Detailed monthly actual vs. forecast occupancy is available in the reporting section at `frontend/src/pages/Reporting/components/ReportingSingleMonthHotel.vue` and `frontend/src/pages/Reporting/components/ReportingSingleMonthAllHotels.vue`.
    *   The definition of "occupied" should be clear (e.g., includes day-use rooms if applicable, or only overnight stays).

---

## 6. Average Lead Time for New Bookings

*   **Description:** The average number of days between when a reservation is made and the scheduled arrival date.
*   **Calculation:**
    *   For each new reservation created within the defined "Calculation Period" (e.g., last 30 days): `Arrival Date - Reservation Creation Date (in days)`.
    *   Average Lead Time = `Sum of all lead times for new bookings / Total number of new bookings in the period`.
*   **Importance:** Helps understand booking behaviors of guests, effectiveness of marketing campaigns, and informs forecasting and pricing strategies. A shorter lead time might indicate more last-minute bookings, while a longer lead time can provide a more stable forecast.
*   **Considerations:**
    *   The "Calculation Period" (e.g., last 7 days, last 30 days, last 90 days) should be clearly defined and potentially configurable.
    *   Consider if filtering by market segment or booking source would provide more actionable insights (this could be an advanced feature).
    *   Ensure `Reservation Creation Date` and `Arrival Date` are consistently defined (e.g., using the hotel's local time zone).
    *   **Current Implementation Note (from previous update):** While a single aggregated "Average Lead Time" as defined above is not yet displayed as a standalone KPI for general users, `frontend/src/pages/Reporting/components/MonthlyReservationEvolutionReport.vue` provides an "Average OTB by Lead Days" chart (平均OTB (リード日数別)). This chart shows the trend of average booked room nights based on each specific lead day (0, 1, 2... days prior to stay) for a selected target month, offering detailed insights into booking pace and lead time distribution.
    *   **Additional Current Implementation Note:** `frontend/src/pages/Admin/AdminPanel.vue` displays an "平均リードタイム" (Average Lead Time) card. This value is a weighted average (by total nights) of lead times for reservations made on the current day ("本日の予約"), aggregated across all hotels. This provides a "today-centered" lead time insight for administrators. The display of a general, single aggregated Average Lead Time (calculated over a broader period like 30 days for non-admin users) in the main dashboard or reporting section remains a separate, recommended enhancement.

---

## 7. Revenue Per Available Room (RevPAR)

*   **Description:** A key performance indicator representing the revenue generated per available room, irrespective of whether they are occupied.
*   **Calculation:**
    *   `Total Room Revenue for a Period / Total Available Rooms in that Period`
    *   Alternatively: `Average Daily Rate (ADR) * Occupancy Rate`
    *   **Total Room Revenue:** The sum of room revenue generated from all occupied rooms over a defined period (e.g., "Today", "Last 7 Days", "Last 30 Days"). This should ideally be net of taxes and exclude ancillary revenue.
    *   **Total Available Rooms:** The sum of rooms available for sale each day during the period (Total Hotel Rooms - Out-of-Order/Not Available Rooms).
*   **Importance:** RevPAR is a standard industry metric that provides a comprehensive view of how well a hotel is filling its rooms and how much revenue it's generating from those bookings. It helps in comparing performance over time and against competitors.
*   **Considerations:**
    *   The period for RevPAR calculation (e.g., daily, weekly, monthly, YTD) should be clearly specified and ideally configurable. For a "Today" view, it would be based on revenue earned from rooms occupied last night or for the current day if day-use is significant.
        *   **Current Implementation Note:** Monthly and yearly cumulative RevPAR and ADR are displayed in the reporting section (specifically in `frontend/src/pages/Reporting/components/ReportingSingleMonthHotel.vue` and `frontend/src/pages/Reporting/components/ReportingSingleMonthAllHotels.vue`), comparing actual vs. forecast figures.
    *   Consistency in calculating `Total Room Revenue` (e.g., including or excluding taxes, treatment of complimentary rooms) is crucial.
    *   Ensure `Total Available Rooms` accurately reflects rooms that *could* have been sold.

---

## 8. Average Length of Stay (ALOS)

*   **Description:** The average number of nights guests stay at the hotel.
*   **Calculation:**
    *   This can be calculated based on:
        *   **Departed Stays:** `Total number of room nights from departed reservations / Total number of departed reservations` over a defined "Calculation Period" (e.g., last 30 days). This is historically accurate.
        *   **New Bookings:** `Total number of room nights from new reservations / Total number of new reservations` created within a defined "Calculation Period". This is a forward-looking indicator.
    *   `Room Nights` for a single reservation = `Departure Date - Arrival Date (in nights)`.
*   **Importance:** ALOS is a key indicator of guest behavior and can impact revenue, operational planning (like housekeeping schedules), and profitability. Longer stays are often more profitable due to reduced turnover costs.
*   **Considerations:**
    *   Specify whether ALOS is calculated based on departed stays (historical) or new/future bookings (predictive). Both can be valuable. The dashboard should clearly label which method is used.
    *   The "Calculation Period" (e.g., last 30 days, last 90 days, or for a specific future period based on new bookings) should be clearly defined and configurable.
    *   Consider if ALOS should be segmented by market segment, room type, or booking source for more granular insights (advanced feature).
    *   Ensure that the calculation of nights is accurate (e.g., a 1-night stay is Arrival Date X, Departure Date X+1).

---

## 9. Dashboard KPI Card Display Recommendations

While the metrics above are crucial, their presentation on the main operational dashboard (`frontend/src/pages/MainPage/Dashboard.vue`) should prioritize immediate, "at-a-glance" insights for daily operations. The following "today-focused" KPIs are recommended for display as prominent summary cards on the dashboard:

*   **Reservations Made Today:**
    *   **Content:** Count of new reservations and their total booking value for the current day.
    *   **Source:** Requires a dedicated API endpoint serving pre-aggregated data (e.g., from an hourly refreshed summary table).
    *   **Importance:** Real-time pulse on booking activity.

*   **New Cancellations Today:**
    *   **Content:** Count of cancellations and total lost booking value for the current day.
    *   **Source:** Similar dedicated API and backend aggregation.
    *   **Importance:** Monitors cancellation trends and immediate revenue impact.

*   **Check-ins Expected Today:**
    *   **Content:** Count of unique reservations scheduled for arrival today.
    *   **Source:** Dedicated API from aggregated data.
    *   **Importance:** Crucial for front desk planning.

*   **Check-outs Expected Today:**
    *   **Content:** Count of unique reservations scheduled for departure today (currently in-house).
    *   **Source:** Dedicated API from aggregated data.
    *   **Importance:** Essential for housekeeping and room turnover planning.

*   **Occupancy Rate (Tonight):**
    *   **Content:** Percentage of available rooms occupied or confirmed for the current night.
    *   **Source:** Dedicated API. (Note: `Dashboard.vue` currently has monthly occupancy gauges; this card would be specific for "tonight").
    *   **Importance:** Primary indicator of immediate hotel performance.

*   **RevPAR (Recent - e.g., Yesterday):**
    *   **Content:** Revenue Per Available Room for the most recent completed day (e.g., yesterday).
    *   **Source:** Dedicated API, calculated from finalized daily revenue and room availability.
    *   **Importance:** Comprehensive performance indicator.

**Portfolio View for Dashboard KPIs:**
For users with multi-hotel access, these dashboard KPI cards should also support a "Portfolio View," displaying aggregated totals (e.g., sum of reservations today across all hotels) or weighted averages (for rates like Occupancy/RevPAR) for their entire accessible portfolio. This requires the backend APIs for these KPIs to handle requests for portfolio-wide data.

**Current Dashboard State (`frontend/src/pages/MainPage/Dashboard.vue`):**
As of the last review, `Dashboard.vue` includes charts for 7-day reservation trends, plan/addon breakdowns, and monthly occupancy gauges. However, it does not yet feature the specific "today-focused" summary KPI cards listed above. Implementing these cards is a key recommended enhancement to align with this architectural vision for an operational dashboard.

# Multi-Hotel Presentation Strategy

# Multi-Hotel Presentation Strategy for Hotel PMS Dashboard

This document outlines the recommended strategy for presenting reservation metrics on the Hotel PMS Dashboard when a user (e.g., administrator, regional manager) has access to multiple properties. The goal is to provide both a high-level overview of the entire portfolio and easy access to detailed information for individual properties.

## 1. Overall Dashboard Philosophy

*   **Flexibility and Clarity:** The dashboard should offer a seamless experience, allowing users to switch between an aggregated (all-hotel) view and individual hotel views with ease.
*   **Actionable Insights:** Both views should be designed to provide actionable insights appropriate to their scope (portfolio-level trends vs. property-specific details).
*   **Performance:** UI transitions and data loading between views should be optimized for a smooth user experience.
*   **Clear Indication of Scope:** The current view (aggregated vs. specific hotel) must be clearly and prominently indicated at all times.

---

## 2. Aggregated (Portfolio) View

*   **Default Display:** This view should be the default upon login for users managing multiple hotels, unless a user-specific default hotel is set (see section 4). It can also be accessed via a clear "All Hotels" or "Portfolio View" option in the main navigation or hotel selection mechanism.
    *   **Current Implementation Note:** The reporting section (`frontend/src/pages/Reporting/ReportingMainPage.vue` via `frontend/src/pages/Reporting/components/ReportingTopMenu.vue`) allows selection of multiple hotels to view aggregated data in components like `frontend/src/pages/Reporting/components/ReportingSingleMonthAllHotels.vue`. A specific "default to portfolio view on login" is not yet implemented.
*   **Metrics Displayed:**
    *   **Total Reservations Made Today (Count & Value):** Sum of counts and values across all hotels.
    *   **Total Check-ins Expected Today:** Sum of counts across all hotels.
    *   **Total Check-outs Expected Today:** Sum of counts across all hotels.
    *   **Total New Cancellations Today (Count & Value):** Sum of counts and lost values across all hotels.
    *   **Average Occupancy Rate (Portfolio):** Weighted average occupancy across all hotels (e.g., `(Sum of all occupied rooms across all hotels) / (Sum of all available rooms across all hotels) * 100%`). Alternatively, a simple average of individual hotel occupancy rates can be shown, but this should be clearly labeled.
        *   **Current Implementation Note:** `ReportingSingleMonthAllHotels.vue` displays aggregated Occupancy, ADR, and RevPAR for selected hotels (using `hotel_id=0` data from `ReportingMainPage.vue` which represents totals, effectively leading to weighted averages for rates).
    *   **Average RevPAR (Portfolio):** Weighted average RevPAR (e.g., `Total Portfolio Room Revenue / Total Portfolio Available Rooms`).
        *   **Current Implementation Note:** Implemented in `ReportingSingleMonthAllHotels.vue` as described above.
    *   **Average ALOS (Portfolio):** Weighted average ALOS, likely based on departed stays for portfolio-wide historical view, or new bookings for a forward-looking view.
    *   **Average Lead Time (Portfolio):** Weighted average lead time for new bookings across all hotels.
*   **Rationale:** This view provides a quick, consolidated snapshot of the overall business performance across the entire hotel group or managed portfolio. It helps in identifying broad trends, overall revenue generation, and occupancy levels at a glance.
*   **Visualisation:** Consider using summary cards or a dashboard overview that highlights these key aggregated figures. Charts showing trends (e.g., portfolio occupancy over the last 7 days) can also be very effective here.
    *   **Current Implementation Note:** `ReportingSingleMonthAllHotels.vue` uses KPI cards for aggregated ADR/RevPAR and includes charts comparing individual hotels within the selected portfolio for revenue and occupancy. The main `Dashboard.vue` is planned to have portfolio-level KPI cards for "today-focused" metrics.

---

## 3. Individual Hotel View

*   **Selection Mechanism:**
    *   **Primary Recommendation:** A prominent, clearly labeled dropdown menu, perhaps titled "Select Hotel" or showing the currently selected hotel's name, located in a consistent position in the dashboard header (e.g., top navigation bar).
        *   **Current Implementation Note:** A hotel selector is available in `frontend/src/pages/MainPage/components/TopMenu.vue` which sets the context for `Dashboard.vue`. The reporting section uses `frontend/src/pages/Reporting/components/ReportingTopMenu.vue` for its hotel selection (single or multiple).
    *   This dropdown should list all hotels the user has access to, plus an "All Hotels" or "Portfolio View" option to switch back to the aggregated view.
        *   **Current Implementation Note:** The selector in `ReportingTopMenu.vue` allows selecting multiple hotels, implicitly creating a portfolio view for reports like `ReportingSingleMonthAllHotels.vue`. A specific "All Hotels" option to view aggregated dashboard KPIs is part of the enhancement plan for `Dashboard.vue`.
    *   **Alternative/Complementary:** For users managing a smaller number of properties, a quickly accessible sidebar or a section on the dashboard could list the hotels, each clickable to filter the view.
*   **Behavior:**
    *   Upon selecting a specific hotel, the entire dashboard context switches to that property.
        *   **Current Implementation Note:** This is the behavior for `Dashboard.vue` (reacts to `selectedHotelId` from `useHotelStore`) and for single-hotel reports like `ReportingSingleMonthHotel.vue`.
    *   All metrics defined in `key_reservation_metrics_recommendations.md` (Reservations Made Today, Check-ins, Check-outs, Cancellations, Occupancy, Avg. Lead Time, RevPAR, ALOS) should be displayed for this single selected hotel.
        *   **Current Implementation Note:** Some of these (Occupancy, RevPAR, ADR) are present in `ReportingSingleMonthHotel.vue`. The "today-focused" metrics are planned additions to `Dashboard.vue`. ALOS and a single aggregated Lead Time metric (for general users, over a period like 30 days) are planned for the reporting views.
    *   The name of the currently selected hotel should be prominently displayed (e.g., "Now Viewing: [Hotel Name] Dashboard") to avoid confusion.
        *   **Current Implementation Note:** Reporting components display the hotel name. `Dashboard.vue` is planned to have a dynamic title.
    *   If the user navigates to other sections of the PMS (e.g., reservations list, reporting) after selecting a hotel, the PMS should ideally retain the context of that selected hotel until explicitly changed.
        *   **Current Implementation Note:** The hotel context from `TopMenu.vue` is generally maintained across `MainPage` views. The reporting section has its own context.
*   **Data Display:** The metrics displayed should be identical in definition to those in `key_reservation_metrics_recommendations.md`, but calculated only for the selected property.
    *   **Current Implementation Note:** This is the case for metrics like Occupancy and RevPAR in `ReportingSingleMonthHotel.vue`.

---

## 4. User-Specific Default Hotel

*   **Functionality:**
    *   Users who manage multiple hotels should have an option within their user profile or application settings to designate one specific hotel as their "default hotel."
    *   This setting should be optional. If no default is set, the user will see the Aggregated (Portfolio) View upon login.
*   **Behavior upon Login:**
    *   If a user has set a default hotel, the PMS dashboard should load directly into the Individual Hotel View for that property upon login.
    *   The hotel selection mechanism (e.g., dropdown) should still be readily available, allowing the user to easily switch to the Aggregated (Portfolio) View or to any other hotel they have access to.
*   **Benefit:** Improves efficiency and convenience for users (e.g., a General Manager of one specific hotel who also has regional oversight) who primarily focus on a single property but occasionally need to view others or the aggregated summary.
*   **Setting Management:** The interface for setting the default hotel should be intuitive, perhaps a simple dropdown list of their accessible hotels within their user profile page.

---

## 5. Comparative Hotel View (Optional Enhancement)

*   **Concept:** An advanced feature, potentially a separate tab, report, or a configurable widget on the main dashboard, designed for side-by-side comparison of key performance indicators (KPIs) across multiple selected hotels.
*   **Functionality:**
    *   Users should be able to select which hotels to compare (e.g., via checkboxes from their list of accessible hotels, or by selecting a pre-defined group like "City Center Hotels").
    *   Users should be able to select which KPIs to display in the comparison (e.g., Occupancy Rate, RevPAR, ADR, Reservations Today, Cancellation Rate).
    *   The view would typically present data in a tabular format, with each row representing a KPI and each column representing a hotel (or vice-versa).
*   **Use Case:** Extremely valuable for regional managers, portfolio managers, and owners to:
    *   Identify top and bottom-performing properties.
    *   Analyze regional trends and disparities.
    *   Compare the impact of specific strategies or events across different hotels.
    *   Facilitate data-driven decision-making for resource allocation or targeted support.
*   **Metrics for Comparison:**
    *   Occupancy Rate
    *   RevPAR
    *   Average Daily Rate (ADR - this would be implicitly part of RevPAR calculation but could be shown separately)
    *   Reservations Made Today (Count/Value)
    *   Cancellation Rate (Number of cancellations / Number of bookings)
    *   Average Lead Time
    *   ALOS
*   **Visualisation:** While tables are primary, options for comparative bar charts or line graphs for selected metrics could also be considered.

---

## 6. General Considerations for Multi-Hotel Views

*   **Performance:**
    *   Aggregating data across many hotels can be resource-intensive. Queries and backend data structures should be optimized for speed.
    *   Consider asynchronous loading for large datasets or complex calculations in the aggregated or comparative views.
    *   Caching strategies for frequently accessed portfolio views might be beneficial.
*   **Clarity and Visual Distinction:**
    *   The UI must make it unequivocally clear whether the user is viewing aggregated data, data for a single property, or a comparative view. This can be achieved through:
        *   Prominent titles (e.g., "Portfolio Overview", "[Hotel Name] Dashboard", "Hotel Comparison").
        *   Consistent placement of the hotel selector.
        *   Subtle visual cues (e.g., different background shades or header colors for different views, though this should be used sparingly to avoid clutter).
*   **Permissions and Accessibility:**
    *   The list of hotels in selectors and comparative views must strictly adhere to the user's access permissions. Users should only see data for hotels they are authorized to view.
*   **Data Consistency:**
    *   Ensure that metric definitions and calculation logic are applied consistently across all hotels to allow for meaningful aggregation and comparison. Time zone handling for "today" and other date-sensitive metrics must be robust for each property.
*   **User Experience (UX):**
    *   The process of switching between views should be intuitive and require minimal clicks.
    *   Retain user context where appropriate (e.g., if viewing a specific report type for one hotel, switching to another hotel should ideally keep the user in the same report type).