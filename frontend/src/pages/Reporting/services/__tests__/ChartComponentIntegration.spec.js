// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ChartConfigurationService from '../ChartConfigurationService';

// Mock ECharts
vi.mock('echarts/core', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: vi.fn(() => false)
  })),
  use: vi.fn(),
  graphic: {
    LinearGradient: class MockLinearGradient {
      constructor(x, y, x2, y2, colorStops) {
        this.x = x;
        this.y = y;
        this.x2 = x2;
        this.y2 = y2;
        this.colorStops = colorStops;
      }
    }
  }
}));

// Mock ECharts components
vi.mock('echarts/components', () => ({
  TitleComponent: {},
  TooltipComponent: {},
  GridComponent: {},
  LegendComponent: {},
  DatasetComponent: {},
  TransformComponent: {}
}));

vi.mock('echarts/charts', () => ({
  BarChart: {},
  GaugeChart: {}
}));

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {}
}));

describe('Chart Component Integration with ChartConfigurationService', () => {
  beforeEach(() => {
    // Mock DOM methods
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true
    });
    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true
    });
  });

  describe('ChartConfigurationService Integration', () => {
    it('should generate consistent configurations for all chart types', () => {
      // Test data
      const revenueData = {
        total_forecast_revenue: 1000000,
        total_period_accommodation_revenue: 1200000,
        total_prev_year_accommodation_revenue: 900000
      };

      const occupancyData = {
        total_sold_rooms: 80,
        total_available_rooms: 100,
        total_fc_sold_rooms: 75,
        total_fc_available_rooms: 100
      };

      const hotelRevenueData = [
        {
          hotel_name: 'Hotel A',
          forecast_revenue: 500000,
          accommodation_revenue: 600000
        },
        {
          hotel_name: 'Hotel B',
          forecast_revenue: 400000,
          accommodation_revenue: 350000
        }
      ];

      const hotelOccupancyData = [
        {
          hotel_id: 1,
          hotel_name: 'Hotel A',
          fc_sold_rooms: 75,
          fc_total_rooms: 100,
          sold_rooms: 80,
          total_rooms: 100
        },
        {
          hotel_id: 2,
          hotel_name: 'Hotel B',
          fc_sold_rooms: 60,
          fc_total_rooms: 80,
          sold_rooms: 55,
          total_rooms: 80
        }
      ];

      // Generate configurations using the service
      const revenueConfig = ChartConfigurationService.getRevenuePlanVsActualConfig(revenueData);
      const occupancyConfig = ChartConfigurationService.getOccupancyGaugeConfig(occupancyData);
      const hotelRevenueConfig = ChartConfigurationService.getAllHotelsRevenueConfig(hotelRevenueData);
      const hotelOccupancyConfig = ChartConfigurationService.getAllHotelsOccupancyConfig(hotelOccupancyData);

      // Verify all configurations are valid
      expect(revenueConfig).toBeDefined();
      expect(revenueConfig.title.text).toBe('売上 (計画 vs 実績・予約)');
      expect(revenueConfig.series).toHaveLength(2);

      expect(occupancyConfig).toBeDefined();
      expect(occupancyConfig.series).toHaveLength(1);
      expect(occupancyConfig.series[0].type).toBe('gauge');

      expect(hotelRevenueConfig).toBeDefined();
      expect(hotelRevenueConfig.series).toHaveLength(3);
      expect(hotelRevenueConfig.yAxis.data).toEqual(['Hotel A', 'Hotel B']);

      expect(hotelOccupancyConfig).toBeDefined();
      expect(hotelOccupancyConfig.series).toHaveLength(3);
      expect(hotelOccupancyConfig.yAxis.data).toHaveLength(2);
    });

    it('should handle serialization of all chart configurations', () => {
      const testData = {
        revenue: {
          total_forecast_revenue: 1000000,
          total_period_accommodation_revenue: 1200000,
          total_prev_year_accommodation_revenue: 900000
        },
        occupancy: {
          total_sold_rooms: 80,
          total_available_rooms: 100,
          total_fc_sold_rooms: 75,
          total_fc_available_rooms: 100
        }
      };

      // Generate and serialize configurations
      const revenueConfig = ChartConfigurationService.getRevenuePlanVsActualConfig(testData.revenue);
      const occupancyConfig = ChartConfigurationService.getOccupancyGaugeConfig(testData.occupancy);

      const revenueSerialized = ChartConfigurationService.serializeConfig(revenueConfig);
      const occupancySerialized = ChartConfigurationService.serializeConfig(occupancyConfig);

      // Verify serialization worked
      expect(revenueSerialized.type).toBe('chart-config');
      expect(revenueSerialized.chartType).toBe('bar');
      expect(revenueSerialized.functions.length).toBeGreaterThan(0); // Should have formatter functions

      expect(occupancySerialized.type).toBe('chart-config');
      expect(occupancySerialized.chartType).toBe('gauge');
      expect(occupancySerialized.functions.length).toBeGreaterThan(0); // Should have formatter functions
      expect(occupancySerialized.gradients.length).toBeGreaterThan(0); // Should have gradient

      // Test deserialization
      const revenueDeserialized = ChartConfigurationService.deserializeConfig(revenueSerialized);
      const occupancyDeserialized = ChartConfigurationService.deserializeConfig(occupancySerialized);

      expect(revenueDeserialized.title.text).toBe(revenueConfig.title.text);
      expect(occupancyDeserialized.series[0].type).toBe('gauge');
    });

    it('should maintain consistent color schemes across all chart types', () => {
      const testData = {
        revenue: {
          total_forecast_revenue: 1000000,
          total_period_accommodation_revenue: 1200000,
          total_prev_year_accommodation_revenue: 900000
        },
        hotelRevenue: [
          {
            hotel_name: 'Hotel A',
            forecast_revenue: 500000,
            accommodation_revenue: 600000
          }
        ],
        hotelOccupancy: [
          {
            hotel_id: 1,
            hotel_name: 'Hotel A',
            fc_sold_rooms: 75,
            fc_total_rooms: 100,
            sold_rooms: 80,
            total_rooms: 100
          }
        ]
      };

      const revenueConfig = ChartConfigurationService.getRevenuePlanVsActualConfig(testData.revenue);
      const hotelRevenueConfig = ChartConfigurationService.getAllHotelsRevenueConfig(testData.hotelRevenue);
      const hotelOccupancyConfig = ChartConfigurationService.getAllHotelsOccupancyConfig(testData.hotelOccupancy);

      // Extract colors from different chart types
      const revenueColors = revenueConfig.series[1].data.map(item => item.itemStyle?.color).filter(Boolean);
      const hotelRevenueColors = hotelRevenueConfig.series.map(series => series.itemStyle?.color).filter(Boolean);
      const hotelOccupancyColors = hotelOccupancyConfig.series.map(series => series.itemStyle?.color).filter(Boolean);

      // Verify that forecast and actual colors are consistent across chart types
      const forecastColorInRevenue = revenueConfig.series[1].data[0].itemStyle.color;
      const actualColorInRevenue = revenueConfig.series[1].data[2].itemStyle.color;

      const forecastColorInHotelRevenue = hotelRevenueConfig.series[0].itemStyle.color;
      const actualColorInHotelRevenue = hotelRevenueConfig.series[1].itemStyle.color;

      const forecastColorInHotelOccupancy = hotelOccupancyConfig.series[0].itemStyle.color;
      const actualColorInHotelOccupancy = hotelOccupancyConfig.series[1].itemStyle.color;

      // Colors should be consistent across chart types
      expect(forecastColorInRevenue).toBe(forecastColorInHotelRevenue);
      expect(forecastColorInRevenue).toBe(forecastColorInHotelOccupancy);
      expect(actualColorInRevenue).toBe(actualColorInHotelRevenue);
      expect(actualColorInRevenue).toBe(actualColorInHotelOccupancy);
    });
  });
});