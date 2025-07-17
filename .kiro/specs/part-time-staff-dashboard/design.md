# Design Document

## Overview

The hotel staff dashboard is a simplified, focused interface designed specifically for front desk, cleaning, and kitchen staff who need quick access to essential operational information. Unlike the comprehensive management dashboard, this interface prioritizes clarity and speed for task-oriented work.

The dashboard will display only the most relevant information for hotel staff duties: guest check-ins/check-outs for the current week, room status for cleaning preparation, meal quantities for kitchen staff, and parking information when available.

## Architecture

### Component Structure
- **HotelStaffDashboard.vue** - Main dashboard component with simplified layout
- **WeeklyCheckInOutWidget.vue** - Check-in/check-out display for current week
- **RoomStatusWidget.vue** - Room cleaning and preparation status
- **MealQuantityWidget.vue** - Meal preparation information (when available)
- **ParkingInfoWidget.vue** - Parking-related information (when available)
- **AutoRefreshMixin.js** - Handles automatic data refresh functionality

### Data Flow
1. Dashboard loads with current week's data scope
2. Multiple API endpoints fetch focused datasets
3. Real-time updates via Socket.io for status changes
4. Auto-refresh every 5 minutes with visual indicators
5. Error handling for network connectivity issues

### User Experience Design
- Clean, card-based layout optimized for quick scanning
- Large, readable fonts and clear visual hierarchy
- Color-coded status indicators for immediate recognition
- Minimal navigation to reduce cognitive load
- Mobile-responsive design for tablet/phone access

## Components and Interfaces

### API Endpoints

#### New Endpoints Required
```javascript
// Hotel staff specific data aggregation
GET /api/hotel-staff/weekly-summary
- Parameters: hotel_id, week_start_date
- Returns: Aggregated check-ins, check-outs, room status, meal quantities

GET /api/hotel-staff/room-cleaning-status
- Parameters: hotel_id, date
- Returns: Rooms needing cleaning, preparation status, priority levels

GET /api/hotel-staff/meal-quantities
- Parameters: hotel_id, date_range
- Returns: Daily meal counts by type (breakfast, lunch, dinner)
```

#### Existing Endpoints to Leverage
```javascript
// Reservation data (filtered for hotel staff needs)
GET /api/reservations/reserved-rooms
- Enhanced to include guest meal preferences and special requests

// Room status information
GET /api/rooms/status
- Enhanced to include cleaning priority and estimated time
```

### Frontend Components

#### HotelStaffDashboard.vue
```vue
<template>
  <div class="hotel-staff-dashboard">
    <header class="dashboard-header">
      <h1>スタッフダッシュボード</h1>
      <div class="week-selector">
        <!-- Current week display with navigation -->
      </div>
      <div class="refresh-indicator">
        <!-- Auto-refresh status -->
      </div>
    </header>
    
    <div class="dashboard-grid">
      <WeeklyCheckInOutWidget />
      <RoomStatusWidget />
      <MealQuantityWidget />
      <ParkingInfoWidget />
    </div>
  </div>
</template>
```

#### WeeklyCheckInOutWidget.vue
```vue
<template>
  <div class="check-inout-widget">
    <h2>今週のチェックイン・アウト</h2>
    <div class="daily-schedule">
      <!-- Day-by-day breakdown with guest names, room numbers, times -->
    </div>
  </div>
</template>
```

#### RoomStatusWidget.vue
```vue
<template>
  <div class="room-status-widget">
    <h2>客室状況</h2>
    <div class="room-grid">
      <!-- Visual room status with cleaning priorities -->
    </div>
  </div>
</template>
```

### Data Models

#### Hotel Staff Data Structure
```javascript
// Weekly summary data model
{
  weekStart: "2025-01-13",
  weekEnd: "2025-01-19",
  dailySummary: [
    {
      date: "2025-01-13",
      checkIns: [
        {
          guestName: "田中太郎",
          roomNumber: "101",
          checkInTime: "15:00",
          numberOfGuests: 2,
          mealRequests: ["breakfast", "dinner"],
          specialRequests: ["late check-in"]
        }
      ],
      checkOuts: [
        {
          guestName: "佐藤花子",
          roomNumber: "205",
          checkOutTime: "11:00",
          roomCleaningPriority: "high"
        }
      ],
      mealQuantities: {
        breakfast: 12,
        lunch: 8,
        dinner: 15
      }
    }
  ]
}
```

#### Room Status Data Model
```javascript
// Room cleaning status
{
  rooms: [
    {
      roomNumber: "101",
      status: "needs_cleaning", // "occupied", "clean", "needs_cleaning", "maintenance"
      priority: "high", // "low", "medium", "high"
      estimatedCleaningTime: 45, // minutes
      lastCheckOut: "2025-01-13T11:00:00Z",
      nextCheckIn: "2025-01-13T15:00:00Z",
      specialNotes: "Extra towels requested"
    }
  ]
}
```

## Error Handling

### Network Connectivity
- Display clear offline indicators when connection is lost
- Cache last known data for continued operation
- Retry mechanism with exponential backoff
- User-friendly error messages in Japanese

### Data Validation
- Validate date ranges and hotel_id parameters
- Handle missing or incomplete data gracefully
- Fallback to default values when data is unavailable
- Log errors for system monitoring

### User Experience
- Loading states for all data fetching operations
- Skeleton screens during initial load
- Progressive enhancement for slower connections
- Graceful degradation when features are unavailable

## Testing Strategy

### Unit Testing
- Component rendering with mock data
- Data transformation and formatting functions
- Auto-refresh mechanism behavior
- Error handling scenarios

### Integration Testing
- API endpoint integration
- Real-time update functionality via Socket.io
- Cross-browser compatibility
- Mobile responsiveness

### User Acceptance Testing
- Usability testing with actual hotel staff
- Performance testing under typical hotel WiFi conditions
- Accessibility testing for various screen sizes
- Japanese language display and formatting

## Implementation Considerations

### Data Availability
Some required information may not be currently parameterized in the system:
- **Meal quantities**: May need to be calculated from reservation meal preferences
- **Parking information**: Requires new data model if not currently tracked
- **Room cleaning priorities**: May need enhancement to existing room status system
- **Special guest requests**: May require extraction from reservation comments

### Performance Optimization
- Implement data caching for frequently accessed information
- Use database views for complex aggregations
- Minimize API calls through efficient data bundling
- Optimize for mobile device performance

### Localization
- All text in Japanese for hotel staff
- Date/time formatting according to Japanese conventions
- Cultural considerations for information presentation
- Clear iconography that transcends language barriers

### Security Considerations
- Role-based access control for hotel staff users
- Limited data exposure (only essential information)
- Secure API endpoints with appropriate authentication
- Audit logging for data access patterns