# Plan Categories Deployment Guide

## Overview

This deployment adds **plan categories** to the existing system without breaking any current functionality. It's a safe, additive change that:

- ✅ Keeps all existing plans_global functionality intact
- ✅ Adds categories as optional metadata to plans_hotel
- ✅ Doesn't require immediate frontend changes
- ✅ Provides foundation for future plan management improvements

## What Gets Added

### New Tables
- `plan_type_categories` - Categories like 素泊まり, 1食, 2食, 3食
- `plan_package_categories` - Package types like スタンダード, マンスリー

### New Columns in plans_hotel
- `plan_type_category_id` (nullable) - Links to plan type
- `plan_package_category_id` (nullable) - Links to package type  
- `display_order` - For custom plan ordering
- `is_active` - Enable/disable plans
- `available_from` / `available_until` - Date-based availability

## Pre-Deployment Checklist

- [ ] **Database backup completed** (automatic in script)
- [ ] **Verify plans_hotel table exists**
- [ ] **Test database connection**
- [ ] **Confirm low-traffic time window**

## Deployment Steps

### 1. Run Deployment Script
```bash
# Set environment variables
export DB_HOST=your_host
export DB_NAME=your_database  
export DB_USER=your_user
export DB_PASSWORD=your_password

# Run deployment
npm run deploy:plan-categories
```

### 2. Verify Deployment
The script automatically verifies:
- Category tables created with data
- New columns added to plans_hotel
- Existing plans linked to categories
- No data loss occurred

### 3. Test Critical Paths
- [ ] **Plan Management**: Admin can view/edit plans
- [ ] **Reservations**: New reservations work normally
- [ ] **Existing Data**: Historical reservations display correctly

## Expected Results

After deployment, you should see:
- **5+ type categories** (seeded from existing plans_global)
- **2 package categories** (スタンダード, マンスリー)
- **All existing plans_hotel records** have category assignments
- **Zero downtime** - existing functionality unchanged

## Rollback Plan

If issues occur:
```bash
npm run rollback:plan-categories
```

This removes:
- New category tables
- New columns from plans_hotel
- Returns system to exact previous state

## Post-Deployment

### Immediate (Optional)
- Update admin interface to show plan categories
- Add category filtering to plan lists

### Future Enhancements
- Category-based plan management
- Advanced plan ordering and grouping
- Category-specific reporting

## Monitoring

Watch for:
- **Error logs** related to plan queries
- **Admin interface** plan management functionality
- **Reservation creation** success rates
- **Database performance** (new indexes added)

## Technical Details

### Database Changes
```sql
-- New tables created
CREATE TABLE plan_type_categories (...)
CREATE TABLE plan_package_categories (...)

-- New columns added (all nullable, non-breaking)
ALTER TABLE plans_hotel ADD COLUMN plan_type_category_id INT
ALTER TABLE plans_hotel ADD COLUMN plan_package_category_id INT
-- ... other columns

-- Indexes created for performance
CREATE INDEX idx_plans_hotel_type_category ON plans_hotel(hotel_id, plan_type_category_id)
-- ... other indexes
```

### Backward Compatibility
- All existing API endpoints continue working
- Frontend can ignore new category fields
- plans_global remains fully functional
- No changes to reservation_details table

## Support

If you encounter issues:
1. Check deployment script output for specific errors
2. Verify database connection and permissions
3. Run rollback script if needed
4. Contact development team with error logs

---

**This is a safe, incremental improvement that adds value without risk.**