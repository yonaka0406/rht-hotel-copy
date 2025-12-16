# ChartConfigurationService

A centralized service for managing chart configurations across web components and PDF generation, ensuring consistent styling and behavior.

## Overview

The `ChartConfigurationService` provides a unified approach to chart configuration management, eliminating duplicate chart option logic between Vue components and PDF generation services. It ensures pixel-perfect consistency between web displays and PDF outputs.

## Features

- **Unified Configuration**: Single source of truth for all chart styling
- **Consistent Styling**: Uses existing `colorScheme` and `formatUtils` for consistency
- **Serialization Support**: Safe serialization/deserialization for backend transmission
- **Multiple Chart Types**: Supports Revenue, Occupancy, and Hotel comparison charts
- **PDF Integration Ready**: Designed for seamless PDF generation integration

## Supported Chart Types

### 1. Revenue Plan vs Actual Chart
```javascript
const config = ChartConfigurationService.getRevenuePlanVsActualConfig(revenueData);
```

### 2. Occupancy Gauge Chart
```javascript
const config = ChartConfigurationService.getOccupancyGaugeConfig(occupancyData, options);
```

### 3. All Hotels Revenue Chart
```javascript
const config = ChartConfigurationService.getAllHotelsRevenueConfig(revenueData);
```

### 4. All Hotels Occupancy Chart
```javascript
const config = ChartConfigurationService.getAllHotelsOccupancyConfig(occupancyData);
```

## Usage in Vue Components

Replace existing chart configuration logic with service calls:

```javascript
// Before (in component)
const chartOptions = computed(() => {
  // Complex chart configuration logic...
  return { /* chart config */ };
});

// After (using service)
const chartOptions = computed(() => {
  return ChartConfigurationService.getRevenuePlanVsActualConfig(props.revenueData);
});
```

## Serialization for PDF Generation

The service provides serialization capabilities for transmitting chart configurations to backend PDF generators:

```javascript
// Serialize configuration
const serialized = ChartConfigurationService.serializeConfig(chartConfig);

// Send to backend...
// Backend can deserialize to get identical configuration
const deserialized = ChartConfigurationService.deserializeConfig(serialized);
```

## Data Formats

### Revenue Data Format
```javascript
{
  total_forecast_revenue: number,
  total_period_accommodation_revenue: number,
  total_prev_year_accommodation_revenue: number
}
```

### Occupancy Data Format
```javascript
{
  total_sold_rooms: number,
  total_available_rooms: number,
  total_fc_sold_rooms: number,
  total_fc_available_rooms: number
}
```

### Hotel Revenue Data Format
```javascript
[
  {
    hotel_name: string,
    forecast_revenue: number,
    accommodation_revenue: number
  }
  // ... more hotels
]
```

### Hotel Occupancy Data Format
```javascript
[
  {
    hotel_id: number,
    hotel_name: string,
    fc_sold_rooms: number,
    fc_total_rooms: number,
    sold_rooms: number,
    total_rooms: number
  }
  // ... more hotels
]
```

## Dependencies

- `echarts/core`: For chart rendering and gradient support
- `@/utils/formatUtils`: For consistent number and currency formatting
- `@/utils/reportingUtils`: For consistent color schemes

## Testing

The service includes comprehensive unit tests covering:
- Chart configuration generation for all chart types
- Data validation and edge cases
- Serialization/deserialization functionality
- Error handling

Run tests with:
```bash
npm test -- ChartConfigurationService.spec.js --run
```

## Integration Benefits

1. **Consistency**: Ensures identical styling between web and PDF
2. **Maintainability**: Single place to update chart configurations
3. **Extensibility**: Easy to add new chart types
4. **Reliability**: Comprehensive test coverage
5. **Performance**: Optimized serialization for backend transmission

## Next Steps

1. Update existing Vue chart components to use the service
2. Integrate with PDF generation backend
3. Add validation and error handling enhancements
4. Extend support for additional chart types as needed