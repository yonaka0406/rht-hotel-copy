# OTA Waitlist Strategy

## Problem Statement

When processing reservations from Online Travel Agencies (OTAs) through XML integration, we encounter an issue where:

1. Multiple reservations are received in a single XML file
2. The system processes these reservations sequentially
3. If a reservation fails (typically due to no available rooms in the PMS), the entire transaction is rolled back
4. The OTA's inventory is not updated to reflect the actual room availability
5. As a result, the OTA continues to show availability and accept bookings for rooms that are actually unavailable

## Selected Solution: OTA Room Closure

### Implementation Overview

1. **XML Pre-processing**
   - Parse all reservations from the incoming XML file
   - Validate each reservation against current PMS availability
   - Identify which reservations would fail due to room unavailability
   - Group failed reservations by room type and date

2. **OTA Status Update**
   - For each room/date combination with failed reservations:
     - Set the OTA's `salesStatus` to "Not for Sale"
     - This prevents new reservations from being accepted for those specific room types/dates
   - The existing OTA inventory update mechanism will be used, requiring minimal changes

3. **UI Enhancements**
   - Add a new status option (ID: 3) to the existing `statusOptions` array:
     ```javascript
     const statusOptions = [
         { id: 0, value: '未設定' },
         { id: 1, value: '販売中' },
         { id: 2, value: '売り止め' },
         { id: 3, value: 'Not for Sale' }  // New status
     ];
     ```
   - Update the `getStatusClass` function to include styling for the new status:
     ```javascript
     const getStatusClass = (statusId) => {
         switch(statusId) {
             case 1: return 'status-available';
             case 2: return 'status-sold-out';
             case 3: return 'status-not-for-sale';
             default: return 'status-default';
         }
     };
     ```
   - Add corresponding CSS for the new status:
     ```css
     .status-not-for-sale {
         background-color: #ffebee;
         color: #c62828;
         padding: 0.25rem 0.5rem;
         border-radius: 4px;
         font-weight: 500;
     }
     ```

4. **PMS User Alerts**
   - Add visual indicators in the PMS reservation calendar for dates with failed OTA reservations
   - Display a warning banner when users attempt to create reservations for affected dates
   - Include details about the OTA conflict in the reservation details view
   - Example implementation in the calendar view:
     ```vue
     <div v-if="hasOTAReservationConflict(date, roomType)" 
          class="ota-conflict-warning"
          :title="'Conflicting OTA reservation on ' + formatDate(date)">
         <i class="pi pi-exclamation-triangle"></i>
         <span>OTA Conflict</span>
     </div>
     ```
     ```css
     .ota-conflict-warning {
         background-color: #fff3e0;
         border-left: 3px solid #ffa000;
         padding: 4px 8px;
         margin: 2px 0;
         font-size: 0.85em;
         color: #e65100;
     }
     ```

5. **User Notification**
   - Display toast notifications when rooms are automatically marked as "Not for Sale"
   - Include a summary of affected room types and dates
   - Provide a direct link to the OTA inventory screen for review
   - Send email alerts to relevant staff members for critical conflicts

6. **Manual Override**
   - Require manager approval for reservations on dates with OTA conflicts
   - Implement a confirmation dialog explaining the conflict risk
   - Allow staff to manually change the status back to available when resolved
   - Maintain an audit log of all automatic status changes and overrides
   - Add a notes field to document the reason for manual overrides

## Implementation Plan

### Phase 1: Core Implementation (Week 1)
- [ ] **Backend Services**
  - [ ] Create conflict detection service
    ```javascript
    // New service: otaConflictService.js
    const detectOTAConflicts = async (requestId, hotelId, checkInDate, checkOutDate, roomTypeId, client = null) => {
      // 1. Get available rooms for the date range
      // 2. Check against OTA inventory for potential conflicts
      // 3. Return conflict details if any
    };
    
    const getOTAConflictDetails = async (requestId, hotelId, dateRange) => {
      // Get detailed conflict information for UI display
    };
    ```
    - [ ] Add conflict detection before reservation operations in `getOTAReservations`:
      ```javascript
      // In getOTAReservations function
      for (const reservation of formattedReservations) {
        // 1. Extract reservation details (dates, room type, etc.)
        // 2. Call detectOTAConflicts()
        // 3. If conflicts found, mark as failed and collect conflict details
      }
      ```
  
  - [ ] Update OTA inventory service
    - Add new status codes for "Not for Sale" state
    - Implement status change logging for audit trail
    - Add retry mechanism for failed status updates
    - Add hotel-agnostic notification support to NotificationsDrawer.vue:
    ```vue
    // In NotificationsDrawer.vue
    <template>
      <!-- Existing template -->
      <div v-for="notification in otaConflictNotifications" :key="notification.id" 
           class="notification-item ota-conflict"
           :class="{ 'high-priority': isHighPriority(notification) }">
        <div class="notification-header">
          <span class="notification-title">
            <i class="pi pi-exclamation-triangle"></i>
            OTA Conflict Detected
          </span>
          <small class="notification-time">{{ formatTime(notification.timestamp) }}</small>
        </div>
        <div class="notification-body">
          <p v-if="notification.hotelName">
            <strong>{{ notification.hotelName }}</strong> - 
            {{ notification.roomType }} on {{ formatDate(notification.date) }}
          </p>
          <p v-else>
            {{ notification.roomType }} on {{ formatDate(notification.date) }}
          </p>
          <div class="notification-actions">
            <button @click.stop="viewOtaConflict(notification)" 
                    class="btn btn-sm btn-outline-primary">
              View Details
            </button>
            <button @click.stop="dismissNotification(notification.id)" 
                    class="btn btn-sm btn-link text-muted">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </template>
    
    <script>
    export default {
      data() {
        return {
          otaConflictNotifications: [],
          // Store dismissed notification IDs to prevent duplicates
          dismissedNotificationIds: new Set()
        };
      },
      mounted() {
        // Listen for OTA conflict events from any hotel
        this.$socket.on('ota:conflict:global', this.handleOtaConflict);
        
        // Load any existing conflicts from the server
        this.fetchActiveOTAConflicts();
      },
      methods: {
        isHighPriority(notification) {
          // All OTA conflicts are high priority
          return notification.type === 'ota_conflict';
        },
        async fetchActiveOTAConflicts() {
          try {
            const response = await this.$api.get('/api/ota/conflicts/active');
            response.data.forEach(conflict => {
              if (!this.dismissedNotificationIds.has(conflict.id)) {
                this.addOtaConflictNotification(conflict);
              }
            });
          } catch (error) {
            console.error('Failed to fetch active OTA conflicts:', error);
          }
        },
        handleOtaConflict(conflict) {
          // Skip if this notification was already dismissed
          if (this.dismissedNotificationIds.has(conflict.id)) {
            return;
          }
          this.addOtaConflictNotification(conflict.data);
          
          // Show toast with sound for high-priority conflicts
          this.$toast.warning('New OTA conflict detected', {
            position: 'top-right',
            duration: 5000,
            className: 'ota-conflict-toast',
            icon: 'pi pi-exclamation-triangle',
            // Optional: Play sound
            onMount: () => {
              const audio = new Audio('/sounds/alert.mp3');
              audio.play().catch(e => console.warn('Could not play sound:', e));
            }
          });
        },
        addOtaConflictNotification(conflict) {
          this.otaConflictNotifications = [
            {
              id: conflict.id || `conflict-${Date.now()}`,
              type: 'ota_conflict',
              priority: 'high',
              timestamp: new Date(conflict.timestamp || Date.now()),
              ...conflict
            },
            ...this.otaConflictNotifications
          ];
        },
        dismissNotification(notificationId) {
          this.otaConflictNotifications = this.otaConflictNotifications.filter(
            n => n.id !== notificationId
          );
          this.dismissedNotificationIds.add(notificationId);
          
          // Optionally mark as read on the server
          this.$api.post(`/api/notifications/${notificationId}/dismiss`)
            .catch(e => console.error('Failed to dismiss notification:', e));
        },
        viewOtaConflict(conflict) {
          // Store the current hotel context if available
          const currentHotel = this.$store.getters['auth/currentHotel'];
          
          // Navigate to OTA conflict resolution page
          this.$router.push({
            name: 'ota-conflict-details',
            params: { 
              id: conflict.reservationId,
              // Include hotel ID in params if available
              ...(currentHotel && { hotelId: currentHotel.id })
            }
          });
          
          // Mark as read when viewed
          this.dismissNotification(conflict.id);
        }
      }
    };
    ```
  
  - [ ] Enhance error handling
    - Add specific error types for OTA conflicts
    - Include detailed conflict information in error responses
    - Implement proper transaction rollback on conflicts

### Phase 2: OTA Integration (Week 2)
- [ ] **XML Processing Updates**
  - [ ] Enhance `getOTAReservations` in `xmlController.js`:
    ```javascript
    // New pre-validation step
    const validateReservationBatch = async (reservations) => {
      const validationResults = {
        valid: [],
        conflicts: [],
        errors: []
      };
      
      for (const res of reservations) {
        try {
          const conflicts = await detectOTAConflicts(
            requestId,
            hotel_id,
            res.checkInDate,
            res.checkOutDate,
            res.roomTypeId,
            client
          );
          
          if (conflicts.length > 0) {
            validationResults.conflicts.push({
              reservation: res,
              conflicts
            });
          } else {
            validationResults.valid.push(res);
          }
        } catch (error) {
          validationResults.errors.push({
            reservation: res,
            error: error.message
          });
        }
      }
      
      return validationResults;
    };
    ```
    
  - [ ] Implement batch processing for OTA status updates:
    ```javascript
    // New function in otaInventoryService.js
    const updateOTAInventoryStatus = async (requestId, updates) => {
      const results = [];
      
      for (const update of updates) {
        try {
          // Use same mechanism as otaInventory.vue
          const result = await updateTLInventory(
            update.hotelId,
            update.roomTypeId,
            update.date,
            '3' // Not for Sale status
          );
          results.push({ ...update, success: true, result });
        } catch (error) {
          results.push({ ...update, success: false, error });
        }
      }
      
      return results;
    };
    ```
    
  - [ ] Add error handling and retry logic:
    ```javascript
    const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
          }
        }
      }
      
      throw lastError;
    };
    ```

- [ ] **Reservation Flow Updates**
  - [ ] Update `addOTAReservation` function:
    ```javascript
    // In addOTAReservation function
    const addOTAReservation = async (requestId, hotel_id, data, client = null) => {
      // 1. Extract reservation details
      const { checkInDate, checkOutDate, roomTypeId } = extractReservationDetails(data);
      
      // 2. Check for conflicts
      const conflicts = await detectOTAConflicts(
        requestId,
        hotel_id,
        checkInDate,
        checkOutDate,
        roomTypeId,
        client
      );
      
      if (conflicts.length > 0) {
        // 3. If conflicts found, mark OTA inventory as "Not for Sale"
        await updateOTAInventoryStatus(requestId, [{
          hotelId: hotel_id,
          roomTypeId,
          date: checkInDate,
          status: '3' // Not for Sale
        }]);
        
        throw new OTAReservationConflictError({
          message: 'OTA reservation conflict detected',
          conflicts,
          reservation: data
        });
      }
      
      // 4. Proceed with reservation if no conflicts
      // ... existing reservation logic ...
    };
    ```
    
  - [ ] Update `editOTAReservation` and `cancelOTAReservation`:
    ```javascript
    // Similar conflict detection as addOTAReservation
    // For cancels, we may want to update OTA inventory back to available
    const handleCancel = async (requestId, reservationId) => {
      // 1. Get reservation details
      const reservation = await getReservationDetails(reservationId);
      
      // 2. Process cancellation
      await cancelReservationInPMS(reservationId);
      
      // 3. Update OTA inventory if needed
      if (isOTAreservation(reservation)) {
        await updateOTAInventoryStatus(requestId, [{
          hotelId: reservation.hotel_id,
          roomTypeId: reservation.room_type_id,
          date: reservation.check_in_date,
          status: '1' // Available
        }]);
      }
    };
    ```

### Phase 3: Automation & Notifications (Week 3)
- [ ] **Automated Status Updates**
  - [ ] Create scheduled job for OTA status synchronization:
    ```javascript
    // New service: otaSyncService.js
    const { CronJob } = require('cron');
    
    // Run every 5 minutes
    const syncJob = new CronJob('*/5 * * * *', async () => {
      try {
        // 1. Get pending status updates
        const pendingUpdates = await getPendingOTAStatusUpdates();
        
        // 2. Process in batches
        const batchSize = 10;
        for (let i = 0; i < pendingUpdates.length; i += batchSize) {
          const batch = pendingUpdates.slice(i, i + batchSize);
          await processStatusUpdateBatch(batch);
        }
      } catch (error) {
        logger.error('OTA sync job failed', { error });
      }
    });
    
    const processStatusUpdateBatch = async (updates) => {
      const results = [];
      
      for (const update of updates) {
        try {
          // Use exponential backoff for retries
          const result = await withRetry(
            () => updateOTAInventoryStatus(update.requestId, [update]),
            3, // max retries
            1000 // initial delay
          );
          
          await markUpdateAsProcessed(update.id, 'completed');
          results.push({ ...update, status: 'completed' });
        } catch (error) {
          await markUpdateAsFailed(update.id, error.message);
          results.push({ ...update, status: 'failed', error });
        }
      }
      
      return results;
    };
    ```

- [ ] **User Notifications**
  - [ ] Implement real-time alerts:
    ```javascript
    // In notificationService.js
    const sendOTANotification = async (type, data) => {
      switch (type) {
        case 'CONFLICT_DETECTED':
          // Send real-time notification
          io.to(`hotel:${data.hotelId}`).emit('ota:conflict', {
            type: 'CONFLICT_DETECTED',
            timestamp: new Date(),
            data: {
              roomType: data.roomType,
              date: data.date,
              reservationId: data.reservationId
            }
          });
          
          // Send email for critical issues
          if (isCriticalConflict(data)) {
            await sendEmail({
              to: getHotelStaffEmails(data.hotelId),
              subject: 'Critical OTA Conflict Detected',
              template: 'ota-conflict-alert',
              data: {
                ...data,
                dashboardUrl: buildDashboardUrl(data.hotelId)
              }
            });
          }
          break;
          
        // Other notification types...
      }
    };
    ```

### Phase 4: Testing & Deployment (Week 4)
- [ ] **Testing Strategy**
  ```javascript
  // test/ota/conflictDetection.test.js
  describe('OTA Conflict Detection', () => {
    let testHotelId;
    let testRoomTypeId;
    
    beforeAll(async () => {
      // Setup test data
      testHotelId = await createTestHotel();
      testRoomTypeId = await createTestRoomType(testHotelId);
    });
    
    it('should detect OTA conflicts', async () => {
      // 1. Create test reservation
      const reservation = await createTestReservation({
        hotelId: testHotelId,
        roomTypeId: testRoomTypeId,
        checkIn: '2025-08-01',
        checkOut: '2025-08-05'
      });
      
      // 2. Simulate OTA conflict
      const conflicts = await detectOTAConflicts(
        'test-request',
        testHotelId,
        '2025-08-01',
        '2025-08-05',
        testRoomTypeId
      );
      
      // 3. Verify conflict detection
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('OTA_CONFLICT');
    });
    
    // More test cases...
  });
  ```

- [ ] **Deployment Plan**
  1. **Pre-Deployment**
     - [ ] Database migrations for new tables
     - [ ] Configuration updates
     - [ ] Backup current OTA inventory settings
   
  2. **Deployment**
     - [ ] Deploy backend services with feature flags
     - [ ] Enable for test hotel first
     - [ ] Monitor error rates and performance
     
  3. **Post-Deployment**
     - [ ] Verify OTA inventory updates
     - [ ] Test conflict scenarios
     - [ ] Monitor system logs for errors
     
  4. **Rollback Plan**
     - [ ] Disable new conflict detection
     - [ ] Revert to previous OTA inventory settings
     - [ ] Clear any pending status updates

- [ ] **Documentation**
  - [ ] API documentation for new endpoints
  - [ ] Admin guide for conflict resolution
  - [ ] Operational runbook for support team

## Technical Considerations

1. **Performance**
   - Batch processing of XML files should be efficient
   - Implement caching for PMS availability checks
   - Consider rate limiting for OTA API calls

2. **Data Consistency**
   - Ensure atomic operations when updating multiple systems
   - Implement proper transaction management
   - Design for idempotency in case of retries

3. **Error Handling**
   - Comprehensive error logging
   - Automatic retry mechanisms for transient failures
   - Clear error messages for hotel staff

## Next Steps

1. Review and finalize the preferred solution (1 or 2)
2. Create detailed technical specifications
3. Estimate development effort and timeline
4. Schedule implementation in upcoming sprints
