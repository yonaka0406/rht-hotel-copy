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
*   **Metrics Displayed:**
    *   **Total Reservations Made Today (Count & Value):** Sum of counts and values across all hotels.
    *   **Total Check-ins Expected Today:** Sum of counts across all hotels.
    *   **Total Check-outs Expected Today:** Sum of counts across all hotels.
    *   **Total New Cancellations Today (Count & Value):** Sum of counts and lost values across all hotels.
    *   **Average Occupancy Rate (Portfolio):** Weighted average occupancy across all hotels (e.g., `(Sum of all occupied rooms across all hotels) / (Sum of all available rooms across all hotels) * 100%`). Alternatively, a simple average of individual hotel occupancy rates can be shown, but this should be clearly labeled.
    *   **Average RevPAR (Portfolio):** Weighted average RevPAR (e.g., `Total Portfolio Room Revenue / Total Portfolio Available Rooms`).
    *   **Average ALOS (Portfolio):** Weighted average ALOS, likely based on departed stays for portfolio-wide historical view, or new bookings for a forward-looking view.
    *   **Average Lead Time (Portfolio):** Weighted average lead time for new bookings across all hotels.
*   **Rationale:** This view provides a quick, consolidated snapshot of the overall business performance across the entire hotel group or managed portfolio. It helps in identifying broad trends, overall revenue generation, and occupancy levels at a glance.
*   **Visualisation:** Consider using summary cards or a dashboard overview that highlights these key aggregated figures. Charts showing trends (e.g., portfolio occupancy over the last 7 days) can also be very effective here.

---

## 3. Individual Hotel View

*   **Selection Mechanism:**
    *   **Primary Recommendation:** A prominent, clearly labeled dropdown menu, perhaps titled "Select Hotel" or showing the currently selected hotel's name, located in a consistent position in the dashboard header (e.g., top navigation bar).
    *   This dropdown should list all hotels the user has access to, plus an "All Hotels" or "Portfolio View" option to switch back to the aggregated view.
    *   **Alternative/Complementary:** For users managing a smaller number of properties, a quickly accessible sidebar or a section on the dashboard could list the hotels, each clickable to filter the view.
*   **Behavior:**
    *   Upon selecting a specific hotel, the entire dashboard context switches to that property.
    *   All metrics defined in `key_reservation_metrics_recommendations.md` (Reservations Made Today, Check-ins, Check-outs, Cancellations, Occupancy, Avg. Lead Time, RevPAR, ALOS) should be displayed for this single selected hotel.
    *   The name of the currently selected hotel should be prominently displayed (e.g., "Now Viewing: [Hotel Name] Dashboard") to avoid confusion.
    *   If the user navigates to other sections of the PMS (e.g., reservations list, reporting) after selecting a hotel, the PMS should ideally retain the context of that selected hotel until explicitly changed.
*   **Data Display:** The metrics displayed should be identical in definition to those in `key_reservation_metrics_recommendations.md`, but calculated only for the selected property.

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
