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
