# Reporting & Analytics

This section contains documentation for the reporting and analytics features of the hotel management system.

## Overview

The reporting system provides comprehensive insights into hotel operations, including occupancy statistics, revenue analysis, and guest demographics. The system ensures data consistency across all reporting interfaces.

## Features

### Dashboard Reporting
- Real-time check-in/check-out statistics
- Daily and weekly operational summaries
- Gender-based guest analytics
- Room occupancy metrics

### Room Indicator
- Visual room status display
- Effective check-in/check-out tracking
- Reservation timeline visualization
- Room change detection

### Data Alignment
- Consistent counting logic across all interfaces
- Accurate handling of room changes and cancellations
- Real-time data synchronization

## Documentation

### Implementation Guides
- [Dashboard Data Alignment](./dashboard-data-alignment.md) - Implementation details for consistent check-in/check-out statistics across Dashboard and Room Indicator

### API References
- Check-in/Check-out Report API: `GET /api/report/checkin-checkout`
- Room Indicator API: `GET /api/reservations/rooms/indicator`

## Key Components

### Backend Models
- `api/models/report/main.js` - Main reporting functions
- `api/models/reservations/rooms.js` - Room-specific reporting logic

### Frontend Components
- `DashboardDialog.vue` - Dashboard statistics display
- `RoomIndicator.vue` - Visual room status interface
- `SummaryMetricsPanel.vue` - Aggregated metrics display

## Data Flow

```
Database (reservation_details)
    ↓
Backend Models (CTE-based queries)
    ↓
API Endpoints (formatted responses)
    ↓
Frontend Components (user interface)
```

## Performance Considerations

- Optimized CTE queries for large datasets
- Materialized views for complex aggregations
- Indexed lookups for date-range queries
- Parallel query execution for better response times

## Related Documentation

- [Backend Service Architecture](../../backend/service-architecture.md)
- [Database Schema](../../backend/database-schema.md)
- [Frontend Component Library](../../frontend/component-library.md)