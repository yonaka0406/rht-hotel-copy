# OTA Stock Trace Strategy

## 1. Problem Statement
**Issue:** Sometimes, room stock availability updates are not sent to the OTA (TL-Lincoln) channel manager even when a discrepancy exists or a reservation changes.
**Symptom:** No error appears in the `ota_xml_queue` or standard error logs ("在庫調整依頼ステータス"). The system seemingly "silently skips" the update.
**Goal:** Create a comprehensive audit trail (traceability) for **every** stock calculation event for a specific hotel and date, explaining *why* an update was sent or skipped.

---

## 2. Root Cause Hypothesis
The current logic in `api/ota/xmlController.js` likely performs a "Pre-Check" to save API calls:
1.  Calculate Local Stock.
2.  (Optional) Fetch Current OTA Stock (`checkOTAStock`).
3.  Compare `Local` vs `OTA`.
4.  **If `Local == OTA`:** Abort and return (Silent Skip).
5.  **If `Local != OTA`:** Enqueue XML to `ota_xml_queue`.

If step 4 happens, no record exists in the database to prove the system checked. If the logic in Step 1 (Local Calculation) is flawed (e.g., ignoring a specific block ID), the system "correctly" decides to do nothing based on incorrect data.

---

## 3. Implementation Strategy

### Phase 1: Create the Audit Ledger Table
We need a permanent log of "Stock Decisions," distinct from the "XML Request Log."

**New Table:** `ota_stock_audit_log`

```sql
CREATE TABLE ota_stock_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hotel_id UUID NOT NULL,
    target_date DATE NOT NULL,
    room_type_id VARCHAR(50), -- Local Room Type ID
    
    -- Stock Values
    local_stock_count INT,      -- What our DB says we have
    remote_stock_count INT,     -- What TL-Lincoln says (if checked)
    
    -- Context
    trigger_source VARCHAR(50), -- e.g., 'reservation_created', 'cron_sync', 'manual_check'
    trigger_reference_id VARCHAR(100), -- e.g., reservation UUID
    
    -- The Decision
    decision VARCHAR(50),       -- 'UPDATE_QUEUED', 'SKIPPED_MATCH', 'SKIPPED_ERROR'
    decision_reason TEXT        -- Human readable explanation
);

-- Index for fast lookup by date/hotel
CREATE INDEX idx_ota_stock_audit_lookup ON ota_stock_audit_log(hotel_id, target_date);
```

### Phase 2: Inject Logging Logic
Modify `api/ota/xmlController.js` (specifically around lines 1200-1260 where `NetStockBulkAdjustmentService` logic resides).

**Current Logic (Simplified):**
```javascript
if (currentRemainingStock === expectedRemainingCount) {
    return res.status(200).send({ message: 'No update needed.' });
}
```

**New Logic:**
```javascript
if (currentRemainingStock === expectedRemainingCount) {
    await logStockDecision({
        hotel_id, 
        date, 
        room_type,
        local: expectedRemainingCount,
        remote: currentRemainingStock,
        decision: 'SKIPPED_MATCH',
        reason: 'Local inventory matches Remote.'
    });
    return res.status(200).send({ message: 'No update needed.' });
} else {
    await logStockDecision({ ..., decision: 'UPDATE_QUEUED' });
    // ... proceed to send XML
}
```

### Phase 3: Trace the Trigger Points
We must identify *who* calls the update logic. Common triggers to instrument:
1.  **Reservation Creation/Cancel:** `api/controllers/reservationsController.js`
2.  **Room Maintenance Blocks:** `api/controllers/hotel/roomMaintenance.js` (or similar)
3.  **Nightly Sync Job:** `api/jobs/otaReservationJob.js` (?)

**Action:** Ensure the `requestId` or a specialized `traceId` is passed from the Trigger -> Controller -> Audit Log to group related events.

---

## 4. Investigation Tools (How to use this)

Once implemented, we can debug the "Missing Update" on a specific day (e.g., 2025-01-21) using this SQL query:

```sql
SELECT 
    created_at,
    trigger_source,
    room_type_id,
    local_stock_count,
    remote_stock_count,
    decision,
    decision_reason
FROM ota_stock_audit_log
WHERE 
    hotel_id = 'TARGET_HOTEL_ID' 
    AND target_date = '2025-01-21'
ORDER BY created_at DESC;
```

**What this reveals:**
*   **Scenario A:** No rows exist. -> The event trigger (Reservation Create) failed to even call the OTA controller. *Fix the Reservation Controller.*
*   **Scenario B:** Row exists, Decision = 'SKIPPED_MATCH', but `local_stock_count` is wrong. -> The `inventoryUtils` calculation logic is buggy.
*   **Scenario C:** Row exists, Decision = 'UPDATE_QUEUED', but no XML sent. -> The `ota_xml_queue` insertion failed (Database transaction issue).

---

## 5. Immediate Next Steps
1.  Approve this strategy.
2.  I will generate the Migration file for `ota_stock_audit_log`.
3.  I will modify `api/ota/xmlController.js` to write to this log.
