# Design Document

## Overview

This document describes the technical architecture for refactoring the ReservationsCalendar component into a modular, maintainable, and performant system. The design emphasizes separation of concerns, testability, and enhanced user experience through composable architecture and dedicated components.

## Architecture

The refactored calendar follows a simplified composable architecture focusing on the most impactful separations:

```
ReservationsCalendar.vue (Main Container)
├── CalendarCell.vue (Individual cells)
└── CalendarHeader.vue (Navigation & controls)

Core Composables:
├── useCalendarState.js (Centralized state & interactions)
├── useCalendarSocket.js (Real-time updates)
└── calendarConfig.js (Constants & configuration)
```

This simplified approach reduces complexity while maintaining the key benefits of modularity and testability.

## Components and Interfaces

### Simplified Component Structure

**ReservationsCalendar.vue** (Main Container)
- Manages overall calendar state using `useCalendarState` composable
- Renders the calendar grid and coordinates child components
- Handles high-level interactions and state updates

**CalendarCell.vue** (Individual Cell)
- Renders a single calendar cell with reservation data
- Handles cell-specific interactions (click, drag, hover)
- Props: `reservation`, `room`, `date`, `isSelected`, `isDragTarget`
- Emits: `cell-click`, `drag-start`, `drag-end`

**CalendarHeader.vue** (Navigation & Controls)
- Date navigation (previous/next month, date picker)
- View controls (room filter, date range selector)
- Simple, focused interface without complex mode switching

### Core Composables

**useCalendarState** (Centralized State Management)
```javascript
interface CalendarState {
  // Data
  dateRange: Ref<Date[]>
  selectedRooms: Ref<Room[]>
  reservations: Ref<Reservation[]>
  
  // UI State
  loading: Ref<boolean>
  selectedCells: Ref<CalendarCell[]>
  dragState: Ref<{ isDragging: boolean, source: CalendarCell | null }>
  
  // Actions
  selectCell: (cell: CalendarCell) => void
  moveReservation: (reservation: Reservation, newDate: Date) => Promise<void>
  updateDateRange: (start: Date, end: Date) => void
  
  // Computed
  visibleReservations: ComputedRef<Reservation[]>
}
```

**useCalendarSocket** (Real-time Updates)
```javascript
interface SocketComposable {
  isConnected: Ref<boolean>
  onReservationUpdate: (callback: (reservation: Reservation) => void) => void
  onReservationDelete: (callback: (id: string) => void) => void
}
```

## Data Models

### Simplified State Structure
```javascript
// All state consolidated in useCalendarState
interface CalendarData {
  dateRange: Date[]
  selectedRooms: Room[]
  reservations: Reservation[]
  loading: boolean
  selectedCells: CalendarCell[]
  dragState: { isDragging: boolean, source: CalendarCell | null }
}
```

## Error Handling

Simple error handling approach:
- Try-catch blocks around async operations with toast notifications
- Loading states managed in `useCalendarState`
- Basic validation before reservation operations
- No complex error composable - keep it simple

## Testing Strategy

### Unit Testing
- All composables are tested in isolation with mock dependencies
- Component testing focuses on props, events, and user interactions
- Utility functions have comprehensive test coverage

### Integration Testing
- Calendar component integration with real data
- Drag and drop workflow testing
- WebSocket connection and real-time updates
- Keyboard navigation and accessibility features

### Performance Testing
- Virtual scrolling with large datasets
- Memory usage monitoring for long-running sessions
- Render performance optimization validation

## Key Design Decisions

1. **Composable-First Architecture**: Business logic is extracted into reusable composables for better testability and maintainability

2. **Prop-Based Communication**: Components communicate through well-defined props and events rather than direct state mutation

3. **Error Boundary Pattern**: Centralized error handling prevents cascading failures and provides consistent user feedback

4. **Progressive Enhancement**: Core functionality works without advanced features, with enhanced interactions layered on top

5. **Accessibility-First**: ARIA labels, keyboard navigation, and screen reader support are built into the foundation

6. **Performance Optimization**: Virtual scrolling, memoization, and debounced events ensure smooth performance with large datasets 