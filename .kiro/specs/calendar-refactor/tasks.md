# Tasks: Calendar Refactor

## High Priority

- [ ] Extract drag & drop logic into useCalendarDragDrop composable
- [ ] Move WebSocket handling into useCalendarWebSocket composable
- [ ] Move date range logic into useCalendarDateRange composable
- [ ] Create CalendarCell.vue for cell rendering
- [ ] Create CalendarTable.vue for main table structure and scroll/hover events
- [ ] Create CalendarHeader.vue for header controls and date navigation
- [ ] Create DragModeControls.vue for mode switching and context menus
- [ ] Add try-catch and error handling to all async operations (use useCalendarErrors composable)
- [ ] Refactor scroll handler into useDebouncedScroll composable
- [ ] Centralize calendar state in useCalendarStore (Pinia)
- [ ] Implement simplified interaction model (unified modes: view, move, select)
- [ ] Add clear visual indicators for current interaction mode
- [ ] Implement progressive disclosure: basic view, detailed view, advanced operations
- [ ] Add visual feedback overlays for drag/move/select modes
- [ ] Add loading states and PrimeVue Spinner to all async operations
- [ ] Implement keyboard navigation (useKeyboardNavigation composable)
- [ ] Implement contextual actions and smart context menus for cells
- [ ] Add validation and error prevention before reservation actions
- [ ] Improve information hierarchy and visual clarity of the calendar header (implement two-row header layout or collapsible sections for usability)
- [ ] Add table-level loading overlay for enhanced loading state (not just skeletons for empty cells)
- [ ] Consolidate accessibility improvements: Add ARIA labels, keyboard navigation, screen reader support for drag-and-drop, focus management for table navigation, and improve color contrast (covering all accessibility and ARIA-related tasks)
- [ ] Consolidate responsive design improvements: Use responsive units and breakpoints for cell/table sizing (e.g., w-20 h-12 sm:w-32 sm:h-16 md:w-36 md:h-18), implement touch-friendly targets, responsive table layout, and gesture support for mobile
- [ ] Implement a consistent color token system for status colors (replace hardcoded and mixed Tailwind classes)
- [ ] Enhance visual feedback for drag operations: add ghost elements and improved drop zone indicators
- [ ] Extract sub-components: CalendarHeader.vue, CalendarCell.vue, ReservationCard.vue, ReservationStatus.vue, EmptyRoomIndicator.vue
- [ ] Extract logic into composable functions: useCalendarDragDrop, useReservationStatus, etc.
- [ ] Consolidate configuration and utility file tasks: Move configuration objects to separate files (e.g., config/reservationConfig.js, calendarConfig.js, status config, etc.), and create utility functions in utils/dateHelpers.js and utils/reservationHelpers.js
- [ ] Improve code clarity by using better variable names (e.g., dateIndex → dayIndex, roomIndex → roomColumnIndex, dragMode → currentDragMode or editMode)
- [ ] Add JSDoc comments to all major functions and composables
- [ ] Extract complex conditions into computed properties or helper functions
- [ ] Use constants for magic numbers (e.g., calendar config for sticky header height, cell sizes, etc.)
- [ ] Implement virtual scrolling for large date ranges
- [ ] Use memoization (computed) for expensive calculations
- [ ] Use event delegation to minimize event listeners
- [ ] Align file structure to suggested modular layout (components/ReservationsCalendar/components, composables, config, etc.)

## Medium Priority

- [ ] Ensure cleanup of all listeners and sockets in onUnmounted
- [ ] Implement centralized event bus with useCalendarEvents composable
- [ ] Implement optimistic UI updates for performance UX
- [ ] Add progressive onboarding and interactive tutorial for new users

## Low Priority

- [ ] Add unit and integration tests for new composables/components (see example test structures)
- [ ] Add onboarding tooltips or help modal
- [ ] Add service worker for offline support (optional)
- [ ] Add feature flags for progressive feature introduction

## Testing Structure

- [ ] Write component tests for CalendarCell, CalendarTable, DragModeControls, etc.
- [ ] Write composable tests for useCalendarDragDrop, useCalendarWebSocket, useCalendarDateRange, useCalendarEvents, useCalendarErrors, useKeyboardNavigation, useGestures, useReservationStatus

## References
- See requirements.md and design.md for context and details.
- See the detailed breakdown in the refactoring plan and UX recommendations for implementation guidance. 