# Design Document

## Overview

This design document outlines the implementation of visual indicators for the calendar view that help hotel staff quickly identify flexible clients and provide a comprehensive legend for all calendar icons. The solution will enhance the existing ReservationsCalendar.vue component with new visual indicators and filtering capabilities while maintaining the current functionality.

## Architecture

The implementation will follow the existing Vue.js component architecture with the following key components:

- **ReservationsCalendar.vue**: Main calendar component (existing) - will be enhanced with new indicators
- **CalendarLegend.vue**: New component for displaying the comprehensive legend
- **FlexibilityIndicators.vue**: New component for rendering client flexibility indicators
- **CalendarFilters.vue**: New component for filtering based on client flexibility

The solution will integrate with the existing data flow:
- **useReservationStore**: Enhanced to include client flexibility data
- **API endpoints**: New endpoints to fetch client flexibility information
- **Database**: New fields or computed properties to determine client flexibility

## Components and Interfaces

### 1. Enhanced ReservationsCalendar.vue

**New Props:**
- `showFlexibilityIndicators: Boolean` (default: true)
- `enableFlexibilityFilters: Boolean` (default: true)

**New Data Properties:**
```javascript
const flexibilityFilters = ref({
  showMovableRooms: true,
  showNoRoomPreference: true,
  showAll: true
});
const legendVisible = ref(false);
```

**New Computed Properties:**
```javascript
const filteredReservations = computed(() => {
  // Filter reservations based on flexibility criteria
});
const flexibilityIndicators = computed(() => {
  // Map reservations to their flexibility indicators
});
```

### 2. CalendarLegend.vue (New Component)

**Props:**
```javascript
interface LegendProps {
  visible: boolean;
  position?: 'modal' | 'sidebar' | 'inline';
}
```

**Data Structure:**
```javascript
const legendCategories = ref([
  {
    category: 'Reservation Status',
    items: [
      { icon: 'pi pi-pause', color: 'bg-yellow-100', label: '保留中（仮押さえ）' },
      { icon: 'pi pi-clock', color: 'bg-cyan-200', label: '仮予約' },
      // ... existing status indicators
    ]
  },
  {
    category: 'Client Flexibility',
    items: [
      { icon: 'pi pi-arrows-alt', color: 'text-green-500', label: 'Room movable' },
      { icon: 'pi pi-home', color: 'text-blue-500', label: 'No room preference' },
      // ... new flexibility indicators
    ]
  }
]);
```

### 3. FlexibilityIndicators.vue (New Component)

**Props:**
```javascript
interface FlexibilityProps {
  reservation: Object;
  showTooltips?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

**Methods:**
```javascript
const getFlexibilityIndicators = (reservation) => {
  const indicators = [];
  if (reservation.can_move_room) {
    indicators.push({
      icon: 'pi pi-arrows-alt',
      color: 'text-green-500',
      tooltip: 'Room can be moved'
    });
  }
  if (reservation.no_room_preference) {
    indicators.push({
      icon: 'pi pi-home',
      color: 'text-blue-500',
      tooltip: 'No specific room type preference'
    });
  }
  return indicators;
};
```

### 4. CalendarFilters.vue (New Component)

**Props:**
```javascript
interface FilterProps {
  modelValue: Object;
  availableFilters: Array;
}
```

**Emits:**
```javascript
const emit = defineEmits(['update:modelValue', 'filter-change']);
```

## Data Models

### Enhanced Reservation Data Structure

The existing reservation data will be enhanced with flexibility information:

```javascript
// Enhanced reservation object
const reservationWithFlexibility = {
  // ... existing reservation fields
  flexibility: {
    can_move_room: boolean,
    no_room_preference: boolean,
    flexibility_notes: string,
    last_updated: timestamp
  }
};
```

### Client Flexibility Database Schema

**Option 1: Add fields to existing clients table**
```sql
ALTER TABLE clients ADD COLUMN room_movable_preference BOOLEAN DEFAULT NULL;
ALTER TABLE clients ADD COLUMN room_type_preference TEXT DEFAULT NULL;
ALTER TABLE clients ADD COLUMN flexibility_notes TEXT DEFAULT NULL;
```

**Option 2: Create new client_preferences table**
```sql
CREATE TABLE client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  hotel_id UUID REFERENCES hotels(id),
  room_movable BOOLEAN DEFAULT FALSE,
  room_type_preference TEXT,
  flexibility_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Data Structure

**New API endpoint response:**
```javascript
// GET /api/reservation/flexibility/{hotel_id}/{start_date}/{end_date}
{
  "reservations": [
    {
      "reservation_id": "uuid",
      "client_id": "uuid",
      "client_name": "string",
      "room_id": "uuid",
      "date": "date",
      "flexibility": {
        "can_move_room": boolean,
        "no_room_preference": boolean,
        "flexibility_score": number, // 0-100 scale
        "notes": "string"
      }
    }
  ]
}
```

## Error Handling

### Client-Side Error Handling

1. **API Failures**: Graceful degradation when flexibility data is unavailable
2. **Invalid Data**: Default to non-flexible state when data is malformed
3. **Network Issues**: Cache flexibility data locally with fallback indicators

```javascript
const handleFlexibilityDataError = (error) => {
  console.warn('Flexibility data unavailable:', error);
  // Show calendar without flexibility indicators
  showFlexibilityIndicators.value = false;
  toast.add({
    severity: 'warn',
    summary: 'Notice',
    detail: 'Client flexibility information temporarily unavailable',
    life: 3000
  });
};
```

### Server-Side Error Handling

1. **Database Connection Issues**: Return empty flexibility data
2. **Missing Client Data**: Default to non-flexible status
3. **Permission Issues**: Filter out unauthorized flexibility information

## Testing Strategy

### Unit Tests

1. **FlexibilityIndicators.vue**
   - Test indicator rendering for different flexibility states
   - Test tooltip functionality
   - Test accessibility compliance

2. **CalendarLegend.vue**
   - Test legend item rendering
   - Test category organization
   - Test responsive behavior

3. **CalendarFilters.vue**
   - Test filter state management
   - Test filter application logic
   - Test filter persistence

### Integration Tests

1. **Calendar with Flexibility Data**
   - Test indicator display in calendar cells
   - Test filter functionality with real data
   - Test legend integration

2. **API Integration**
   - Test flexibility data fetching
   - Test error handling scenarios
   - Test data caching behavior

### End-to-End Tests

1. **User Workflows**
   - Staff can identify flexible clients visually
   - Staff can use filters to focus on specific client types
   - Staff can access and understand the legend
   - Indicators work correctly across different calendar views

### Accessibility Tests

1. **Screen Reader Compatibility**
   - All indicators have proper ARIA labels
   - Legend is navigable with keyboard
   - Color information is supplemented with text/icons

2. **Color Contrast**
   - All indicators meet WCAG AA standards
   - High contrast mode compatibility
   - Color-blind friendly design

### Performance Tests

1. **Large Dataset Handling**
   - Test with 1000+ reservations
   - Measure rendering performance impact
   - Test filter performance with large datasets

2. **Memory Usage**
   - Monitor memory consumption with indicators
   - Test for memory leaks in filter operations

## Implementation Phases

### Phase 1: Core Indicator System
- Add flexibility data structure to reservation store
- Create FlexibilityIndicators component
- Integrate indicators into calendar cells
- Basic tooltip functionality

### Phase 2: Legend System
- Create CalendarLegend component
- Integrate with existing calendar
- Auto-update legend with new indicators
- Responsive design implementation

### Phase 3: Filtering System
- Create CalendarFilters component
- Implement filter logic
- Add filter persistence
- Performance optimization

### Phase 4: API Integration
- Create flexibility data endpoints
- Implement data fetching in store
- Add error handling and caching
- Database schema updates

### Phase 5: Testing and Polish
- Comprehensive test suite
- Accessibility improvements
- Performance optimization
- Documentation updates

## Technical Considerations

### Performance Optimization

1. **Virtual Scrolling**: For large date ranges with many indicators
2. **Memoization**: Cache flexibility calculations
3. **Lazy Loading**: Load flexibility data on demand
4. **Debounced Filtering**: Prevent excessive re-renders during filter changes

### Accessibility

1. **ARIA Labels**: All indicators have descriptive labels
2. **Keyboard Navigation**: Legend and filters are keyboard accessible
3. **Screen Reader Support**: Proper semantic markup
4. **High Contrast**: Alternative styling for accessibility modes

### Browser Compatibility

1. **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
2. **Fallback Behavior**: Graceful degradation for older browsers
3. **Mobile Responsiveness**: Touch-friendly indicators and controls

### Security Considerations

1. **Data Privacy**: Client flexibility data access control
2. **Input Validation**: Sanitize all flexibility-related inputs
3. **Permission Checks**: Verify user permissions for flexibility features