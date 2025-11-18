# Parking Capacity Module - Deployment Guide

## Overview
This guide covers the deployment of the parking capacity management features, including real-time availability checking, capacity blocking, and improved reservation flow.

## Prerequisites
- PostgreSQL database access
- Node.js backend running
- Vue.js frontend deployed
- Admin access to the system

## Deployment Steps

### 1. Backend Deployment

#### Update Backend Code
```bash
# Pull latest changes
git pull origin main

# Install dependencies (if any new ones)
cd api
npm install

# Restart backend service
npm restart
```

#### Key Files Updated
- `api/models/parking/main.js` - Core parking model with capacity logic
- `api/controllers/parking/services/parkingAddonService.js` - Parking service with block awareness
- `api/controllers/parking/main.js` - Parking API endpoints
- `api/controllers/parking/utils/capacityValidation.js` - Capacity validation utilities

### 2. Frontend Deployment

#### Update Frontend Code
```bash
# Pull latest changes
cd frontend
npm install

# Build for production
npm run build

# Deploy build artifacts to web server
```

#### Key Components Updated
- `ReservationsNewCombo.vue` - New reservation flow with parking capacity
- `ParkingSpotSelector.vue` - Parking selection with block awareness
- `ParkingAddonDialog.vue` - Parking addon management
- `ManageParkingCalendar.vue` - Admin interface for blocking capacity
- `useParkingStore.js` - Parking state management

### 3. Database Verification

#### Verify Tables Exist
```sql
-- Check parking_blocks table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'parking_blocks'
);

-- Verify parking_spots structure
\d parking_spots

-- Check for any existing blocks
SELECT COUNT(*) FROM parking_blocks;
```

### 4. Configuration

#### Environment Variables
No new environment variables required. Existing configuration is sufficient.

#### Feature Flags
The system maintains backward compatibility. No feature flags needed.

## Testing Checklist

### Backend API Tests
- [ ] Test `POST /api/parking/real-time-availability/:hotelId/:vehicleCategoryId`
- [ ] Test `POST /api/parking/capacity/block`
- [ ] Test `GET /api/parking/capacity/blocks`
- [ ] Test `DELETE /api/parking/capacity/blocks/:blockId`
- [ ] Test `POST /api/parking/reservations` with multiple spots

### Frontend Tests
- [ ] Create new reservation with parking spots
- [ ] Verify parking availability updates when dates change
- [ ] Test parking capacity blocking in admin interface
- [ ] Verify blocked capacity shows in availability display
- [ ] Test editing existing parking reservations

### Integration Tests
- [ ] Create reservation with 5+ parking spots
- [ ] Block parking capacity and verify availability reduces
- [ ] Remove block and verify availability restores
- [ ] Test timezone handling (dates should be consistent)
- [ ] Verify parking spots assigned correctly to reservation_details

## Rollback Procedures

### If Issues Occur

#### Backend Rollback
```bash
# Revert to previous version
git checkout <previous-commit-hash>
cd api
npm install
npm restart
```

#### Frontend Rollback
```bash
# Revert to previous version
git checkout <previous-commit-hash>
cd frontend
npm install
npm run build
# Deploy previous build
```

#### Database Rollback
No database schema changes were made. Existing data remains intact.
If parking_blocks table needs to be cleared:
```sql
-- Clear all blocks (if needed)
DELETE FROM parking_blocks;
```

## Monitoring

### Key Metrics to Monitor
- API response times for parking availability checks
- Number of parking blocks created/removed
- Parking assignment success rate
- Database query performance on parking-related tables

### Log Files to Watch
- Backend logs: Look for `[saveParkingAssignments]` and `[checkRealTimeAvailability]` entries
- Frontend console: Look for `[ReservationsNewCombo]` and `[ParkingSpotSelector]` logs

### Common Issues

#### Issue: Parking spots not assigned
**Symptoms:** Reservation created but no parking spots assigned
**Solution:** Check that reservation_details exist for the parking dates
**Logs:** Look for "No reservation details found" warnings

#### Issue: Availability shows 0 when spots exist
**Symptoms:** UI shows 0 available spots but spots are actually free
**Solution:** Verify date format consistency (YYYY-MM-DD)
**Logs:** Check `dateAvailability` in API response

#### Issue: Blocked capacity not reflected
**Symptoms:** Blocks created but availability doesn't decrease
**Solution:** Verify parking_blocks table has correct data
**Query:** `SELECT * FROM parking_blocks WHERE hotel_id = X`

## Post-Deployment Verification

### Smoke Tests
1. Log in as admin user
2. Navigate to parking calendar management
3. Create a test capacity block
4. Verify block appears in the list
5. Create a new reservation with parking
6. Verify parking spots are assigned
7. Remove the test block

### Performance Verification
- Check API response times < 500ms for availability checks
- Verify database queries use proper indexes
- Monitor memory usage on backend server

## Additional Resources
- [Parking Capacity API Documentation](../api/endpoints/parking-capacity.md)
- [Troubleshooting Guide](troubleshooting.md)
- [Deployment Guide](deployment-guide.md)
