# Strategy: Fix Missing Reservation Rates for OTA Reservations

## 1. Problem Description
We have identified a data integrity issue where certain OTA reservations are successfully created and linked to a plan (`plan_id` is present), but fail to generate corresponding records in the `reservation_rates` table. This results in reservations with a total price of 0 or missing breakdown, affecting billing and reporting.

## 2. Identified Data
We have isolated examples of "bad" (missing rates) and "good" (correct) reservations for comparison.

### Bad Reservation (Missing Rates)
*   **Reservation ID:** `62df8012-1de2-4936-9788-ffbe3e0e6635`
*   **OTA Reservation ID:** `RYa0m6e3zw`
*   **Hotel ID:** 10
*   **Check-In:** 2026-01-19
*   **Plan ID:** 2 (Hotel Specific)

### Good Reservation (Has Rates)
*   **Reservation ID:** `16b07ef8-bffc-4dba-bf15-bae3bbe0f23f`
*   **OTA Reservation ID:** `RYa0kay7fr_3`
*   **Hotel ID:** 10
*   **Plan ID:** 2 (Hotel Specific)

## 3. Data Analysis
The raw data for these reservations is stored in the `ota_reservation_queue` table.

For the problematic reservation (`RYa0m6e3zw`), the `reservation_data` JSON contains a `RoomAndRoomRateInformation` section which **does** contain rate information:

```json
"RoomAndRoomRateInformation": [
  {
    "RoomInformation": { ... },
    "RoomRateInformation": {
      "RoomDate": "2026-01-19",
      "PerPaxRate": "10000",
      ...
    }
  },
  {
    "RoomInformation": { ... },
    "RoomRateInformation": {
      "RoomDate": "2026-01-20",
      "PerPaxRate": "10000",
      ...
    }
  }
]
```

Since the data is present in the source but missing in the final table, the issue lies in the parsing or insertion logic.

## 4. Code Location
The core logic for processing OTA reservations is located in:
*   **Controller:** `api/ota/xmlController.js` (Function: `processQueuedReservations`)
*   **Model:** `api/models/reservations/main.js` (Function: `addOTAReservation`)

The function `addOTAReservation` is responsible for parsing the JSON and inserting into `reservations`, `reservation_details`, and `reservation_rates`.

## 5. Investigation Strategy

### Step 1: Code Review
Analyze `api/models/reservations/main.js`, specifically searching for how `RoomAndRoomRateInformation` is processed.
*   Check if it correctly handles `RoomAndRoomRateInformation` being an **Array** vs an **Object**. XML-to-JSON conversion often results in a single object if there's only one child, and an array if there are multiple. If the code expects one and gets the other, it might fail silently or skip the loop.
*   Check for the insertion logic into `reservation_rates`.

### Step 2: Reproduction Test
Create a standalone test file (e.g., `api/tests/reproduce_ota_rates.js`) to replicate the issue before making changes.
*   **Methodology:**
    1.  Read the `reservation_data` (JSON derived from the original XML) from the `ota_reservation_queue` table for both the "bad" (`RYa0m6e3zw`) and "good" (`RYa0kay7fr_3`) examples.
    2.  Invoke the `addOTAReservation` function directly with this data.
    3.  Capture and log the results for the `reservations`, `reservation_details`, and `reservation_rates` tables to the console.
*   **Goal:** Confirm that we can replicate the missing rates error for the "bad" reservation and successful rate creation for the "good" reservation in a controlled environment.

### Step 3: Debugging
*   Add logging in `addOTAReservation` to inspect the structure of `RoomAndRoomRateInformation` just before iteration.
*   Verify if the code is entering the loop that inserts rates.

### Step 4: Fix Implementation
*   Modify `addOTAReservation` to robustly handle both Array and Object formats for `RoomAndRoomRateInformation` and `RoomRateInformation`.
*   Ensure that missing or malformed rate data logs a clear error rather than failing silently.

## 6. Remediation (Data Fix)
Once the code is fixed for new reservations, we need to fix the existing ones.
1.  Identify all reservations with `type='ota'`, `plan_id IS NOT NULL`, and `NO reservation_rates`.
2.  Retrieve their original `reservation_data` from `ota_reservation_queue` using `ota_reservation_id`.
3.  Create a script (e.g., `api/scripts/fix_ota_rates.js`) that:
    *   Iterates through these bad reservations.
    *   Parses the `reservation_data`.
    *   Extracts the rate info.
    *   Inserts the missing rows into `reservation_rates`.
    *   Recalculates the total price on `reservation_details` if necessary.

## 7. Next Steps
1.  Open `api/models/reservations/main.js` and examine the parsing logic.
2.  Apply the fix.
3.  Run the remediation script.
