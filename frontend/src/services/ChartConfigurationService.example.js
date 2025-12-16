/**
 * Example usage of ChartConfigurationService
 * 
 * This file demonstrates how to integrate the ChartConfigurationService
 * into existing Vue chart components for consistent styling.
 */

import ChartConfigurationService from './ChartConfigurationService.js';

// Example 1: Revenue Plan vs Actual Chart Integration
export function integrateRevenuePlanVsActualChart() {
  // Sample data that would come from props
  const revenueData = {
    total_forecast_revenue: 1000000,
    total_period_accommodation_revenue: 1200000,
    total_prev_year_accommodation_revenue: 900000
  };

  // Instead of defining chartOptions in the component,
  // use the centralized service
  const chartOptions = ChartConfigurationService.getRevenuePlanVsActualConfig(revenueData);
  
  console.log('Revenue Chart Config:', chartOptions);
  return chartOptions;
}

// Example 2: Occupancy Gauge Chart Integration
export function integrateOccupancyGaugeChart() {
  const occupancyData = {
    total_sold_rooms: 80,
    total_available_rooms: 100,
    total_fc_sold_rooms: 75,
    total_fc_available_rooms: 100
  };

  const options = {
    previousYearOccupancy: 0.72 // 72%
  };

  const chartOptions = ChartConfigurationService.getOccupancyGaugeConfig(occupancyData, options);
  
  console.log('Occupancy Gauge Config:', chartOptions);
  return chartOptions;
}

// Example 3: All Hotels Revenue Chart Integration
export function integrateAllHotelsRevenueChart() {
  const revenueData = [
    {
      hotel_name: 'Hotel Tokyo',
      forecast_revenue: 500000,
      accommodation_revenue: 600000
    },
    {
      hotel_name: 'Hotel Osaka',
      forecast_revenue: 400000,
      accommodation_revenue: 350000
    },
    {
      hotel_name: 'Hotel Kyoto',
      forecast_revenue: 300000,
      accommodation_revenue: 320000
    }
  ];

  const chartOptions = ChartConfigurationService.getAllHotelsRevenueConfig(revenueData);
  
  console.log('All Hotels Revenue Config:', chartOptions);
  return chartOptions;
}

// Example 4: All Hotels Occupancy Chart Integration
export function integrateAllHotelsOccupancyChart() {
  const occupancyData = [
    {
      hotel_id: 1,
      hotel_name: 'Hotel Tokyo',
      fc_sold_rooms: 75,
      fc_total_rooms: 100,
      sold_rooms: 80,
      total_rooms: 100
    },
    {
      hotel_id: 2,
      hotel_name: 'Hotel Osaka',
      fc_sold_rooms: 60,
      fc_total_rooms: 80,
      sold_rooms: 55,
      total_rooms: 80
    }
  ];

  const chartOptions = ChartConfigurationService.getAllHotelsOccupancyConfig(occupancyData);
  
  console.log('All Hotels Occupancy Config:', chartOptions);
  return chartOptions;
}

// Example 5: Serialization for PDF Generation
export function demonstrateSerialization() {
  const revenueData = {
    total_forecast_revenue: 1000000,
    total_period_accommodation_revenue: 1200000,
    total_prev_year_accommodation_revenue: 900000
  };

  // Get chart configuration
  const chartConfig = ChartConfigurationService.getRevenuePlanVsActualConfig(revenueData);
  
  // Serialize for transmission to backend
  const serializedConfig = ChartConfigurationService.serializeConfig(chartConfig);
  
  console.log('Serialized Config:', serializedConfig);
  
  // This serialized config can be sent to the backend PDF generator
  // The backend can then deserialize it to get the exact same chart configuration
  
  // Demonstrate deserialization
  const deserializedConfig = ChartConfigurationService.deserializeConfig(serializedConfig);
  
  console.log('Deserialized Config matches original:', 
    JSON.stringify(chartConfig) === JSON.stringify(deserializedConfig)
  );
  
  return {
    original: chartConfig,
    serialized: serializedConfig,
    deserialized: deserializedConfig
  };
}

// Example Vue Component Integration Pattern
export const vueComponentIntegrationExample = `
// In your Vue component:
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, shallowRef, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import ChartConfigurationService from '@/services/ChartConfigurationService';

const props = defineProps({
  revenueData: {
    type: Object,
    required: true,
  },
  height: {
    type: String,
    default: '450px',
  },
});

const chartContainer = ref(null);
const chartInstance = shallowRef(null);

// Replace the existing chartOptions computed property with this:
const chartOptions = computed(() => {
  return ChartConfigurationService.getRevenuePlanVsActualConfig(props.revenueData);
});

// The rest of the component remains the same...
const initOrUpdateChart = () => {
  if (chartContainer.value) {
    if (!chartInstance.value || chartInstance.value.isDisposed?.()) {
      chartInstance.value = echarts.init(chartContainer.value);
    }
    chartInstance.value.setOption(chartOptions.value, true);
    chartInstance.value.resize();
  }
};

// ... rest of component lifecycle methods
</script>
`;

console.log('ChartConfigurationService examples loaded. Run the functions to see the output.');