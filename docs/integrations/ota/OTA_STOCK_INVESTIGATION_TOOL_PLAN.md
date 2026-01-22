# OTA Stock Investigation Tool Plan

## 1. Objective
Build a diagnostic tool to allow administrators to investigate "Silent Skip" issues where OTA inventory updates are allegedly not sent to TL-Lincoln despite local PMS changes.

## 2. User Experience (Frontend)
**Location:** New Tab in `ManageOTAPage.vue` or a new component `otaStockInvestigator.vue` accessible from the OTA dashboard.
**Inputs:**
*   **Hotel:** (Already selected in context)
*   **Target Date:** Date Picker (The specific day stock is suspected to be wrong).

**Outputs (The Report):**
1.  **Current State Snapshot:**
    *   **Total Rooms:** (from Master)
    *   **Blocks/Maintenance:** (Count)
    *   **Reservations:** (Count)
    *   **Calculated Available Stock:** (The number we *think* we have).
    *   **TL-Lincoln Stock:** (Real-time fetch result via `NetStockSearchService` if possible, otherwise N/A).

2.  **Event Correlation Timeline (The Core Feature):**
    *   A chronological list merging two data sources:
        *   **PMS Events:** creation/update timestamps of Reservations/Blocks that affect the `Target Date`.
        *   **OTA Events:** `ota_xml_queue` entries (type `NetStock...`) that *contain* the `Target Date` in their payload.
    *   **Visual Gaps:** This allows the user to see:
        *   *10:00 AM* - Reservation Created (User X)
        *   *10:00 AM* - **[MISSING XML]** (We expect an XML here)
        *   *12:00 PM* - Reservation Created (User Y)
        *   *12:01 PM* - OTA XML Sent (Status: Completed)

## 3. Technical Implementation

### Backend: `api/controllers/ota/investigationController.js` (New)
*   **Endpoint:** `GET /api/ota/investigate-stock`
*   **Parameters:** `hotelId`, `date`
*   **Logic:**
    1.  **Fetch PMS Data:**
        *   Query `reservations` table for records overlapping `date`.
        *   Query `room_maintenance` for records overlapping `date`.
        *   Collect `created_at` and `updated_at` timestamps.
    2.  **Fetch OTA Log Data:**
        *   Query `ota_xml_queue` for `NetStockAdjustmentService` or `NetStockBulkAdjustmentService`.
        *   **Filtering:** Since we can't query XML content efficiently in SQL, fetch the last N (e.g., 200) completed/pending requests.
        *   **Parsing:** In Node.js, parse the `xml_body` to check if the `date` is present in the update payload.
    3.  **Real-time Check (Optional):**
        *   Trigger a `NetStockSearchService` call to get the *actual* current stock on TL-Lincoln (Live Debugging).

### Frontend: `frontend/src/pages/Admin/OTA/components/StockInvestigator.vue`
*   **UI:**
    *   Split view or Timeline list.
    *   "Run Investigation" button.
    *   Table showing the correlated events.

## 4. Execution Steps
1.  **Backend:** Create the controller and route.
    *   Need a helper to parse the XML body for dates.
2.  **Frontend:** Add the UI component to the OTA Admin section.
3.  **Verify:** Test with a known date.

## 5. Limitations
*   **XML Parsing:** Scanning `ota_xml_queue` is heavy. We will limit to the last 3-5 days of logs or max 500 records.
*   **Update History:** `reservations` table `updated_at` only shows the *last* modification, not the full history. We can't see "intermediate" changes if a reservation was modified multiple times. *However*, `created_at` is permanent.
