# Plan Key Extraction Scripts

This directory contains SQL scripts to fix the `sc_tl_plans` table by extracting correct plan IDs from the `plan_key` field.

## Problem Description

The `sc_tl_plans` table has records where both `plans_global_id` and `plans_hotel_id` are `NULL`, but the `plan_key` field contains valid plan information that can be parsed to extract the correct IDs.

Example problematic records:
```sql
-- Before fix:
plan_key: "h169", plans_global_id: NULL, plans_hotel_id: NULL

-- After fix:  
plan_key: "h169", plans_global_id: NULL, plans_hotel_id: 169
```

## Scripts Overview

### 1. `test_plan_key_extraction.sql` 
**Run this FIRST**
- Tests the extraction logic with various plan_key formats
- Validates that the parsing function works correctly
- Must show "ALL TESTS PASSED ✓" before proceeding

### 2. `fix_sc_tl_plans_ids_from_plan_key_safe.sql`
**Recommended for production**
- Creates automatic backup table
- Includes extensive validation and reporting
- Only updates records where extraction succeeds
- Preserves existing valid data
- Provides rollback instructions

### 3. `fix_sc_tl_plans_ids_from_plan_key.sql`
**Basic version**
- Simpler script without backup creation
- Good for development/testing environments
- Less verbose output

## Plan Key Formats Supported

| Format | Example | Extracted IDs |
|--------|---------|---------------|
| `h###` | `h169` | `plans_hotel_id: 169, plans_global_id: NULL` |
| `#h#` | `1h1` | `plans_global_id: 1, plans_hotel_id: 1` |
| `#h#` | `3h2` | `plans_global_id: 3, plans_hotel_id: 2` |
| `#h` | `1h` | `plans_global_id: 1, plans_hotel_id: NULL` |

## Usage Instructions

### Step 1: Test the Extraction Logic
```sql
\i api/scripts/test_plan_key_extraction.sql
```
Verify all tests pass before proceeding.

### Step 2: Run the Safe Update Script
```sql
\i api/scripts/fix_sc_tl_plans_ids_from_plan_key_safe.sql
```

### Step 3: Verify Results
Check specific records that were mentioned in the original issue:
```sql
SELECT hotel_id, plangroupcode, plangroupname, plan_key, plans_global_id, plans_hotel_id 
FROM sc_tl_plans 
WHERE plangroupcode IN ('11', '12', '15') AND hotel_id = 10;
```

Expected results:
- plangroupcode '11' with plan_key 'h169' should have plans_hotel_id = 169
- plangroupcode '12' with plan_key 'h177' should have plans_hotel_id = 177

## Safety Features

### Backup Creation
The safe script automatically creates `sc_tl_plans_backup_20260129` before making changes.

### Rollback Procedure
If something goes wrong, you can rollback:
```sql
-- Create temp backup of current state
CREATE TABLE sc_tl_plans_rollback_temp AS SELECT * FROM sc_tl_plans;

-- Restore from backup
DELETE FROM sc_tl_plans;
INSERT INTO sc_tl_plans SELECT * FROM sc_tl_plans_backup_20260129;
```

### Data Preservation
- Only updates records where BOTH `plans_global_id` AND `plans_hotel_id` are NULL
- Uses `COALESCE` to preserve any existing valid data
- Only applies updates where extraction succeeds

## Validation Checks

The scripts include multiple validation steps:

1. **Pre-update analysis**: Shows current state and what will be updated
2. **Extraction preview**: Shows what IDs will be extracted for each record  
3. **Method validation**: Confirms extraction methods work correctly
4. **Post-update verification**: Validates the results
5. **Test case validation**: Checks specific known cases
6. **Remaining issues report**: Identifies any records that still need attention

## Expected Impact

Based on the original issue data, this should fix records like:

| plangroupcode | plan_key | Before | After |
|---------------|----------|---------|-------|
| 11 | h169 | plans_hotel_id: NULL | plans_hotel_id: 169 |
| 12 | h177 | plans_hotel_id: NULL | plans_hotel_id: 177 |
| 15 | h169 | plans_hotel_id: NULL | plans_hotel_id: 169 |
| 5 | h9 | plans_hotel_id: NULL | plans_hotel_id: 9 |
| 6 | h10 | plans_hotel_id: NULL | plans_hotel_id: 10 |
| 9 | h177 | plans_hotel_id: NULL | plans_hotel_id: 177 |
| 10 | h169 | plans_hotel_id: NULL | plans_hotel_id: 169 |

## Post-Execution Steps

After running the scripts:

1. **Test OTA reservations**: Verify that OTA reservation processing now works correctly
2. **Monitor logs**: Check application logs for plan ID resolution issues
3. **Frontend fix**: Ensure the frontend fix is deployed to prevent future occurrences
4. **Data monitoring**: Set up monitoring to catch similar issues early

## Troubleshooting

### If tests fail:
- Review the extraction function logic
- Check for unexpected plan_key formats in your data
- Modify the regex patterns if needed

### If update fails:
- Check PostgreSQL logs for specific errors
- Verify database permissions
- Use the rollback procedure if necessary

### If some records aren't updated:
- Check the "REMAINING ISSUES" section of the output
- These may need manual review and correction
- Consider if new plan_key formats need to be supported

## Related Files

- `frontend/src/pages/Admin/OTA/otaPlanMaster.vue` - Frontend fix for the root cause
- `OTAプラン連携の調査戦略.md` - Complete problem analysis and resolution documentation
- `api/models/reservations/main.js` - Where the plan ID lookup occurs in OTA reservation processing