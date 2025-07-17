# Design: Calendar Refactor

## Overview

This document describes the technical architecture, component structure, and key design decisions for the ReservationsCalendar refactor.

## Component Breakdown

### 1. ReservationsCalendar.vue
- Parent container for the calendar view
- Handles high-level state, provides props to child components

### 2. CalendarCell.vue
- Renders individual calendar cells
- Handles cell-specific logic, icons, tooltips, and drag state

### 3. Composables
- **useCalendarDragDrop.js**: Encapsulates all drag & drop logic and state
- **useCalendarSocket.js**: Manages WebSocket connection and events
- **useCalendarDateRange.js**: Handles date range generation, extension, and centering
- **useDebouncedScroll.js**: Provides debounced scroll event handling

### 4. Config
- **calendarConfig.js**: Centralizes constants, icon mappings, drag modes, and settings

## Key Design Decisions

- All business logic is separated from UI rendering for testability
- Async operations are wrapped in try-catch with user feedback via toast
- All event listeners and sockets are cleaned up in onUnmounted
- CalendarCell is responsible for all cell-level rendering and feedback
- Accessibility and keyboard navigation are considered from the start

## Data Flow
- Parent passes reservation, room, date, and drag state as props to CalendarCell
- Composables expose clear APIs for use in parent and child components

## References
- See requirements.md and tasks.md for implementation and tracking 