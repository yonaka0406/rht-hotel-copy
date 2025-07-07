# Waitlist Feature: Implementation Strategy & UX Rationale

## Executive Summary

This document outlines the comprehensive implementation strategy for a waitlist feature in the Hotel Management System, providing detailed technical specifications for AI agent implementation and justifying the UX design decisions.

## Why This UX Strategy is Effective

### 1. Reduces Revenue Loss from Turn-Aways
- **Problem**: Hotels lose potential revenue when fully booked rooms turn away interested customers. This also applies when specific room preferences (e.g., smoking vs. non-smoking, specific view, accessibility features) are unavailable, even if other rooms of the general type exist.
- **Solution**: Waitlist captures demand that would otherwise be lost, converting it into bookings when cancellations occur or preferred room types become available.
- **Impact**: Studies show hotels can recover 15-25% of lost bookings through effective waitlist management. Capturing preference-specific demand can further enhance this.

### 2. Enhances Customer Experience
- **Proactive Communication**: Customers appreciate being notified of availability (including preferred room types) rather than having to repeatedly check.
- **Reduced Friction**: Seamless transition from "unavailable" or "preference unavailable" to "book now" eliminates search restart.
- **Builds Loyalty**: Shows hotel values customer interest and specific preferences even when unable to immediately accommodate.
- **Accommodates Specific Needs**: Allows guests to wait for rooms that meet their specific requirements (e.g., smoking, non-smoking, accessible room), rather than settling for a less desirable option or booking elsewhere.

### 3. Operational Efficiency
- **Automated Matching**: System automatically finds best waitlist candidates when rooms become available
- **Staff Productivity**: Reduces manual work of tracking interested customers and making availability calls
- **Data-Driven Insights**: Provides visibility into unmet demand patterns for capacity planning

### 4. Competitive Advantage
- **Superior Service**: Many hotels still handle waitlists manually or not at all
- **Professional Image**: Sophisticated waitlist system signals operational excellence
- **Customer Retention**: Keeps customers engaged with property rather than losing them to competitors

## Technical Implementation Strategy

### Phase 1: Database Foundation ✅ IMPLEMENTED

#### Database Schema Details ✅ IMPLEMENTED
```sql
-- Waitlist entries table
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER,
    requested_check_in_date DATE NOT NULL,
    requested_check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    number_of_rooms INTEGER NOT NULL DEFAULT 1 CHECK (number_of_rooms > 0),
    status TEXT NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
    notes TEXT,
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    contact_email TEXT,
    contact_phone TEXT,
    communication_preference TEXT NOT NULL DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone')),
    preferred_smoking_status TEXT NOT NULL DEFAULT 'any' CHECK (preferred_smoking_status IN ('any', 'smoking', 'non_smoking')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    -- Composite foreign key for room_types (partitioned table)
    FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id),
    
    -- Business logic constraints
    CONSTRAINT chk_dates CHECK (requested_check_out_date > requested_check_in_date),
    CONSTRAINT chk_token_expiry CHECK (
        (status = 'notified' AND confirmation_token IS NOT NULL AND token_expires_at IS NOT NULL) 
        OR (status != 'notified')
    )
);

-- Indexes for performance
CREATE INDEX idx_waitlist_hotel_status ON waitlist_entries(hotel_id, status);
CREATE INDEX idx_waitlist_dates ON waitlist_entries(requested_check_in_date, requested_check_out_date);
CREATE INDEX idx_waitlist_room_type ON waitlist_entries(room_type_id, hotel_id);
CREATE INDEX idx_waitlist_token ON waitlist_entries(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_waitlist_expiry ON waitlist_entries(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX idx_waitlist_client_id ON waitlist_entries(client_id);
CREATE INDEX idx_waitlist_created_at ON waitlist_entries(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_waitlist_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waitlist_entries_updated_at
    BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_waitlist_entries_updated_at();
```

#### AI Agent Implementation Notes: ✅ IMPLEMENTED
- **Connection Pooling**: Use existing `getPool(requestId)` pattern for all database operations
- **Transaction Safety**: Wrap multi-table operations in transactions
- **Error Handling**: Implement comprehensive error handling for constraint violations
- **Audit Trail**: Always populate `created_by` and `updated_by` fields

### Phase 2: Backend API Implementation

#### Model Layer (`api/models/waitlist.js`) ✅ IMPLEMENTED
```javascript
// Key functions for AI agent to implement:

const WaitlistEntry = {
    // ✅ IMPLEMENTED: Create new waitlist entry
    async create(requestId, data, userId) {
        // Validate required fields: client_id, hotel_id, room_type_id, dates, guests, contact_email
        // Generate UUID for id if not provided
        // Use prepared statements for SQL injection prevention
        // Return created entry with all fields
    },

    // ❌ NOT YET IMPLEMENTED: Find matching entries for availability notifications
    async findMatching(requestId, criteria) {
        // criteria: { hotel_id, room_type_id, check_in_date, check_out_date }
        // Return entries where:
        //   - status = 'waiting'
        //   - requested dates overlap with available dates
        //   - Order by created_at ASC (FIFO)
        // Complex date overlap logic: 
        //   (requested_check_in_date <= available_check_out_date) AND 
        //   (requested_check_out_date >= available_check_in_date)
    },

    // ✅ IMPLEMENTED: Get entries with filtering and pagination
    async getByHotel(requestId, hotelId, filters = {}) {
        // filters: { status, startDate, endDate, roomTypeId, limit, offset }
        // Join with clients table for client name
        // Join with room_types table for room type name
        // Support dynamic WHERE clause building
        // Return { entries: [], total: number }
    },

    // ✅ IMPLEMENTED: Update entry status and related fields
    async updateStatus(requestId, id, status, additionalData = {}, userId) {
        // additionalData: { confirmation_token, token_expires_at, updated_by }
        // Validate status transitions (waiting -> notified -> confirmed/expired)
        // Clear token fields when status changes to non-notified states
        // Return updated entry
    },

    // ✅ IMPLEMENTED: Token-based operations
    async findByToken(requestId, token, validateExpiry = true) {
        // Find entry by confirmation_token
        // Optionally check token_expires_at > CURRENT_TIMESTAMP
        // Return entry or null
    },

    // ❌ NOT YET IMPLEMENTED: Cleanup expired tokens (background job)
    async expireOldTokens(requestId, hotelId = null) {
        // Find entries with status 'notified' and token_expires_at < CURRENT_TIMESTAMP
        // Update status to 'expired'
        // Optionally trigger next waitlist entry notification
    },

    // ✅ IMPLEMENTED: Additional implemented functions
    async findById(requestId, id) { /* ... */ },
    async cancelEntry(requestId, id, userId, cancelReason = '') { /* ... */ }
};
```

#### Controller Layer (`api/controllers/waitlistController.js`) ✅ MOSTLY IMPLEMENTED
```javascript
// Key endpoints for AI agent to implement:

const waitlistController = {
    // ✅ IMPLEMENTED: POST /api/waitlist - Create new entry
    async create(req, res) {
        // Validate request body using validationUtils
        // Check client exists or create new client
        // Verify hotel and room type exist
        // Validate date range and guest count
        // Call WaitlistEntry.create()
        // Return 201 with created entry
    },

    // ✅ IMPLEMENTED: GET /api/waitlist/hotel/:hotelId - List entries
    async getByHotel(req, res) {
        // Extract hotelId from params
        // Parse query parameters for filtering
        // Validate user has access to hotel
        // Call WaitlistEntry.getByHotel()
        // Return 200 with entries and pagination info
    },

    // ❌ NOT YET IMPLEMENTED: PUT /api/waitlist/:id/status - Update entry status
    async updateStatus(req, res) {
        // Validate status transition
        // Check user permissions
        // Call WaitlistEntry.updateStatus()
        // Return 200 with updated entry
    },

    // ❌ NOT YET IMPLEMENTED: DELETE /api/waitlist/:id - Remove entry
    async delete(req, res) {
        // Check entry exists and user has permission
        // Soft delete by updating status to 'cancelled'
        // Return 204
    },

    // ✅ IMPLEMENTED: POST /api/waitlist/confirm/:token - Client confirmation
    async confirmReservation(req, res) {
        const { token } = req.params;
        
        // Find waitlist entry by token
        const entry = await WaitlistEntry.findByToken(req.requestId, token);
        if (!entry || entry.status !== 'notified') {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }
        
        // Pre-fill reservation data
        const prefillData = {
            hotel_id: entry.hotel_id,
            room_type_id: entry.room_type_id,
            client_id: entry.client_id,
            check_in: entry.requested_check_in_date,
            check_out: entry.requested_check_out_date,
            number_of_people: entry.number_of_guests,
            // Include client details for auto-population
            client: await getClientById(req.requestId, entry.client_id)
        };
        
        // Update waitlist status to 'confirmed'
        await WaitlistEntry.updateStatus(req.requestId, entry.id, 'confirmed');
        
        // Redirect to reservation page with pre-filled data
        res.json({ 
            success: true, 
            redirectUrl: `/reservations/new?prefill=${encodeURIComponent(JSON.stringify(prefillData))}` 
        });
    },

    // ✅ IMPLEMENTED: Additional implemented endpoints
    async getConfirmationDetails(req, res) { /* ... */ },
    async sendManualNotificationEmail(req, res) { /* ... */ },
    async cancelEntry(req, res) { /* ... */ },
    async checkVacancy(req, res) { /* ... */ },

    // ❌ NOT YET IMPLEMENTED: Internal function called by reservation cancellation
    async handleCancellation(requestId, cancellationData) {
        const matchingEntries = await WaitlistEntry.findMatching(requestId, cancellationData);
        
        for (const entry of matchingEntries) {
            if (entry.communication_preference === 'phone') {
                // Create staff notification
                await createStaffNotification({
                    type: 'waitlist_call_required',
                    hotel_id: entry.hotel_id,
                    client_name: entry.client_name,
                    client_phone: entry.contact_phone,
                    room_type: entry.room_type_name,
                    check_in: entry.requested_check_in_date,
                    check_out: entry.requested_check_out_date,
                    priority: 'high'
                });
                
                // Update status to 'notified'
                await WaitlistEntry.updateStatus(requestId, entry.id, 'notified');
            } else {
                // Send email notification (existing logic)
                await sendEmailNotification(entry);
            }
        }
    }
};
```

#### AI Agent Critical Implementation Details:

1. **Date Overlap Logic**: ❌ NOT YET IMPLEMENTED - Implement precise date range matching for waitlist notifications
2. **Token Security**: ✅ IMPLEMENTED - Use crypto.randomBytes(32).toString('hex') for tokens
3. **Email Integration**: ✅ IMPLEMENTED - Call existing email utilities with waitlist-specific templates
4. **Error Recovery**: ✅ IMPLEMENTED - Handle email failures gracefully, possibly queuing for retry
5. **Race Conditions**: ❌ NOT YET IMPLEMENTED - Use database transactions for cancellation → notification flow

### Phase 3: Frontend Implementation ✅ MOSTLY IMPLEMENTED

#### Store Layer (`frontend/src/composables/useWaitlistStore.js`) ✅ IMPLEMENTED
```javascript
// Pinia-style composable for AI agent to implement:

export const useWaitlistStore = () => {
    const state = reactive({
        entries: [],
        loading: false,
        error: null,
        filters: {
            status: '',
            startDate: '',
            endDate: '',
            roomTypeId: ''
        },
        pagination: {
            page: 1,
            size: 20,
            total: 0
        }
    });

    const actions = {
        // ✅ IMPLEMENTED: Fetch entries
        async fetchEntries(hotelId) {
            // Call GET /api/waitlist/hotel/:hotelId with current filters
            // Update state.entries and pagination
            // Handle loading and error states
        },

        // ✅ IMPLEMENTED: Add entry
        async addEntry(entryData) {
            // Call POST /api/waitlist
            // Add new entry to state.entries
            // Show success toast notification
        },

        // ❌ NOT YET IMPLEMENTED: Update entry status
        async updateEntryStatus(id, status) {
            // Call PUT /api/waitlist/:id/status
            // Update entry in state.entries array
            // Show success/error notification
        },

        // ✅ IMPLEMENTED: Delete entry
        async deleteEntry(id) {
            // Call DELETE /api/waitlist/:id
            // Remove entry from state.entries
            // Show confirmation
        },

        // ✅ IMPLEMENTED: Set filters
        async setFilters(newFilters) {
            // Update state.filters
            // Reset pagination to page 1
            // Trigger fetchEntries()
        },

        // ✅ IMPLEMENTED: Clear error
        async clearError() {
            // Reset state.error to null
        },

        // ✅ IMPLEMENTED: Additional implemented functions
        async sendManualNotification(entryId) { /* ... */ },
        async cancelEntry(entryId, cancelReason = '') { /* ... */ }
    };

    return { ...toRefs(state), ...actions };
};
```

#### UI Components for AI Agent ✅ MOSTLY IMPLEMENTED

1. **WaitlistManagementPage.vue** ✅ IMPLEMENTED:
   ```vue
   <!-- Key requirements for AI agent:
   - ✅ Use PrimeVue DataTable with server-side pagination
   - ✅ Implement column sorting and filtering
   - ✅ Action buttons: View Details, Change Status, Delete
   - ✅ Status badge styling with Tailwind classes
   - ✅ Japanese text throughout UI
   - ❌ Real-time updates via WebSocket (optional)
   - ✅ Export functionality for reporting
   -->
   ```

2. **WaitlistEntryDialog.vue** ✅ IMPLEMENTED:
   ```vue
   <!-- Modal for creating/editing entries:
   - ✅ Client selection with autocomplete
   - ✅ Hotel and room type dropdowns (cascading)
   - ✅ Date range picker with validation
   - ✅ Guest count input with limits
   - ✅ Fields for specific preferences (e.g., smoking/non-smoking, view, floor)
   - ✅ Contact information fields
   - ✅ Notes textarea
   - ✅ Form validation with error display
   -->
   <div class="col-span-2">
     <label class="font-semibold mb-2 block">連絡方法</label>
     <div class="flex gap-4">
       <div class="flex items-center">
         <RadioButton
           v-model="communicationPreference"
           value="email"
           :inputId="'email-pref'"
         />
         <label for="email-pref" class="ml-2">メール</label>
       </div>
       <div class="flex items-center">
         <RadioButton
           v-model="communicationPreference"
           value="phone"
           :inputId="'phone-pref'"
         />
         <label for="phone-pref" class="ml-2">電話</label>
       </div>
     </div>
   </div>

   <!-- Conditional fields based on preference -->
   <div v-if="communicationPreference === 'email'" class="col-span-2">
     <FloatLabel>
       <InputText v-model="contactEmail" type="email" required />
       <label>メールアドレス</label>
     </FloatLabel>
   </div>

   <div v-if="communicationPreference === 'phone'" class="col-span-2">
     <FloatLabel>
       <InputText v-model="contactPhone" type="tel" required />
       <label>電話番号</label>
     </FloatLabel>
   </div>
   ```

3. **WaitlistConfirmationPage.vue** ✅ IMPLEMENTED:
   ```vue
   <!-- Token-based confirmation page:
   - ✅ Extract token from route params
   - ✅ Validate token on mount
   - ✅ Display reservation summary
   - ✅ Confirm/Decline action buttons
   - ✅ Loading and error states
   - ✅ Success/failure messaging
   - ✅ Redirect after confirmation
   -->
   ```

#### AI Agent UI Implementation Notes: ✅ MOSTLY IMPLEMENTED
- **Responsive Design**: ✅ Use Tailwind's responsive utilities for mobile compatibility
- **Accessibility**: ✅ Include proper ARIA labels and keyboard navigation
- **Loading States**: ✅ Show skeletons/spinners during API calls
- **Error Handling**: ✅ Display user-friendly error messages in Japanese
- **Real-time Updates**: ❌ Implement WebSocket listeners for live status changes

### Phase 4: Integration Points

#### Reservation System Integration ❌ NOT YET IMPLEMENTED
```javascript
// Modify existing reservationsController.js:

const cancelReservation = async (req, res) => {
    try {
        // Existing cancellation logic...
        
        // NEW: Trigger waitlist notification
        const cancellationData = {
            hotel_id: reservation.hotel_id,
            room_type_id: reservation.room_type_id,
            check_in_date: reservation.check_in_date,
            check_out_date: reservation.check_out_date
        };
        
        // Call waitlist handler (fire-and-forget or await based on requirements)
        waitlistController.handleCancellation(req.requestId, cancellationData)
            .catch(error => {
                // Log error but don't fail the cancellation
                console.error('Waitlist notification failed:', error);
            });
        
        // Continue with existing response...
    } catch (error) {
        // Existing error handling...
    }
};
```

#### Email System Integration ✅ IMPLEMENTED
```javascript
// Extend existing emailUtils.js or create notificationService.js:

const emailTemplates = {
    waitlistAdded: {
        subject: '順番待ちリスト登録完了のお知らせ',
        template: `
            <h2>順番待ちリスト登録完了</h2>
            <p>{{clientName}}様</p>
            <p>下記の内容で順番待ちリストに登録いたしました：</p>
            <ul>
                <li>ホテル: {{hotelName}}</li>
                <li>部屋タイプ: {{roomTypeName}}</li>
                <li>チェックイン: {{checkInDate}}</li>
                <li>チェックアウト: {{checkOutDate}}</li>
                <li>宿泊人数: {{guestCount}}名</li>
            </ul>
            <p>空室が出次第、ご連絡いたします。</p>
        `
    },
    
    waitlistAvailable: {
        subject: 'ご希望のお部屋に空きが出ました！',
        template: `
            <h2>お部屋のご案内</h2>
            <p>{{clientName}}様</p>
            <p>お待たせいたしました。ご希望のお部屋に空きが出ました：</p>
            <div class="reservation-details">
                <!-- Room details -->
            </div>
            <p><strong>このオファーは{{expiryDate}}まで有効です。</strong></p>
            <a href="{{confirmationLink}}" class="confirm-button">予約を確定する</a>
        `
    }
};
```

### Phase 5: Background Jobs & Maintenance

#### Token Expiry Cleanup ❌ NOT YET IMPLEMENTED
```javascript
// Create scheduled job (cron or similar):

const cleanupExpiredTokens = async () => {
    try {
        const expiredEntries = await WaitlistEntry.expireOldTokens();
        
        // For each expired entry, try to notify next person on waitlist
        for (const entry of expiredEntries) {
            await waitlistController.handleCancellation(
                'system', // system requestId
                {
                    hotel_id: entry.hotel_id,
                    room_type_id: entry.room_type_id,
                    check_in_date: entry.requested_check_in_date,
                    check_out_date: entry.requested_check_out_date
                }
            );
        }
    } catch (error) {
        console.error('Cleanup job failed:', error);
    }
};

// Schedule to run every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
```

### Phase 6: Security Considerations ✅ IMPLEMENTED

#### Token Security ✅ IMPLEMENTED
- ✅ Use cryptographically secure random tokens
- ✅ Consider token hashing in database
- ✅ Implement rate limiting on confirmation endpoint
- ✅ Add CSRF protection for public confirmation page

#### Data Privacy ✅ IMPLEMENTED
- ✅ Ensure GDPR compliance for waitlist data
- ✅ Implement data retention policies
- ✅ Allow customers to remove themselves from waitlist
- ✅ Audit trail for all waitlist operations

### Phase 7: Performance Optimization ✅ PARTIALLY IMPLEMENTED

#### Database Optimization ✅ IMPLEMENTED
- ✅ Partition waitlist_entries by hotel_id for large deployments
- ✅ Index optimization for common query patterns
- ✅ Connection pooling for background jobs
- ✅ Query result caching for hotel/room type lookups

#### Frontend Optimization ✅ IMPLEMENTED
- ✅ Lazy loading for waitlist management page
- ❌ Virtual scrolling for large entry lists
- ✅ Debounced search and filtering
- ✅ Optimistic updates for better UX

## Success Metrics

### Business Metrics
- **Conversion Rate**: Percentage of waitlist entries that convert to bookings
- **Revenue Recovery**: Revenue generated from waitlist conversions
- **Customer Satisfaction**: Feedback scores on waitlist experience
- **Operational Efficiency**: Reduction in manual waitlist management time

### Technical Metrics
- **Response Time**: API endpoint performance (< 200ms target)
- **Email Delivery**: Notification email success rate (> 99%)
- **System Uptime**: Availability during peak booking periods
- **Error Rate**: Application error frequency (< 0.1%)

## Risk Mitigation

### Technical Risks
- **Email Delivery Failures**: ✅ Implement retry mechanisms and alternative notification methods
- **Token Expiry Edge Cases**: ❌ Comprehensive testing of timing-sensitive operations
- **Database Deadlocks**: ✅ Use appropriate isolation levels and transaction ordering
- **Race Conditions**: ❌ Atomic operations for critical state changes

### Business Risks
- **Customer Expectations**: ✅ Clear communication about waitlist process and timelines
- **Overbooking**: ❌ Careful integration with existing inventory management
- **Staff Training**: ✅ Comprehensive training on new waitlist features
- **System Complexity**: ✅ Gradual rollout with fallback to manual processes

## Current Implementation Status Summary

### ✅ IMPLEMENTED FEATURES:
1. **Database Schema**: Complete with all required tables, indexes, and constraints
2. **Basic CRUD Operations**: Create, read, update, delete waitlist entries
3. **Frontend UI**: Management interface, entry dialog, display modal
4. **Manual Notifications**: Staff can manually send notification emails
5. **Token-based Confirmation**: Secure confirmation system with expiry
6. **Vacancy Checking**: Real-time availability checking for waitlist entries
7. **Email Integration**: Waitlist-specific email templates and sending
8. **Security**: Token generation, validation, and authentication middleware
9. **Background Jobs**: Basic expiration job for past check-in dates
10. **Public Confirmation Page**: Frontend page for token-based confirmations with full reservation creation flow

### ❌ NOT YET IMPLEMENTED FEATURES:
1. **Automatic Notifications**: Automatic triggering when rooms become available
2. **Reservation Integration**: Automatic waitlist processing when reservations are cancelled
3. **Advanced Matching Logic**: Complex date overlap and preference matching algorithms
4. **Token Cleanup**: Background job for expired notification tokens
5. **Real-time Updates**: WebSocket integration for live status changes
6. **Advanced Filtering**: More sophisticated search and filter options
7. **Bulk Operations**: Mass actions on multiple waitlist entries

## Conclusion

This waitlist strategy provides a comprehensive, technically sound approach to capturing and converting unmet demand in the hotel management system. The phased implementation allows for careful testing and refinement while delivering immediate value to both customers and hotel operators.

The UX design prioritizes simplicity and automation while maintaining professional communication standards. The technical architecture ensures scalability, security, and integration with existing systems.

**Current Status**: The core waitlist functionality is implemented and operational, with manual notification capabilities and basic management features. The next phase should focus on implementing automatic notification triggers and deeper integration with the reservation system.

Success depends on careful attention to edge cases, thorough testing, and ongoing monitoring of both technical and business metrics.