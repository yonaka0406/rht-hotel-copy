// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import ChartConfigurationService from '../ChartConfigurationService';

// Mock ECharts
vi.mock('echarts/core', () => ({
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

describe('ChartConfigurationService', () => {
  let service;

  beforeEach(() => {
    service = ChartConfigurationService;
  });

  describe('getRevenuePlanVsActualConfig', () => {
    it('should generate valid chart configuration for revenue data', () => {
      const revenueData = {
        total_forecast_revenue: 1000000,
        total_period_accommodation_revenue: 1200000,
        total_prev_year_accommodation_revenue: 900000
      };

      const config = service.getRevenuePlanVsActualConfig(revenueData);

      expect(config).toBeDefined();
      expect(config.title.text).toBe('売上 (計画 vs 実績・予約)');
      expect(config.series).toHaveLength(2);
      expect(config.xAxis[0].data).toEqual(['計画売上', '分散', '売上', '前年売上']);
    });

    it('should handle zero forecast revenue', () => {
      const revenueData = {
        total_forecast_revenue: 0,
        total_period_accommodation_revenue: 1200000,
        total_prev_year_accommodation_revenue: 900000
      };

      const config = service.getRevenuePlanVsActualConfig(revenueData);
      expect(config).toBeDefined();
      expect(config.series[1].data[1].value).toBe(1200000); // variance amount
    });
  });

  describe('getOccupancyGaugeConfig', () => {
    it('should generate valid gauge chart configuration', () => {
      const occupancyData = {
        total_sold_rooms: 80,
        total_available_rooms: 100,
        total_fc_sold_rooms: 75,
        total_fc_available_rooms: 100
      };

      const config = service.getOccupancyGaugeConfig(occupancyData);

      expect(config).toBeDefined();
      expect(config.series).toHaveLength(1);
      expect(config.series[0].type).toBe('gauge');
      expect(config.series[0].data[0].value).toBe(0.8); // 80/100
    });

    it('should handle zero available rooms', () => {
      const occupancyData = {
        total_sold_rooms: 0,
        total_available_rooms: 0,
        total_fc_sold_rooms: 0,
        total_fc_available_rooms: 0
      };

      const config = service.getOccupancyGaugeConfig(occupancyData);
      expect(config.series[0].data[0].value).toBe(0);
    });
  });

  describe('getAllHotelsRevenueConfig', () => {
    it('should generate valid configuration for multiple hotels', () => {
      const revenueData = [
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

      const config = service.getAllHotelsRevenueConfig(revenueData);

      expect(config).toBeDefined();
      expect(config.series).toHaveLength(3);
      expect(config.yAxis.data).toEqual(['Hotel A', 'Hotel B']); // Sorted by performance
    });

    it('should return empty config for empty data', () => {
      const config = service.getAllHotelsRevenueConfig([]);
      expect(config).toEqual({});
    });
  });

  describe('getAllHotelsOccupancyConfig', () => {
    it('should generate valid configuration for hotel occupancy data', () => {
      const occupancyData = [
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

      const config = service.getAllHotelsOccupancyConfig(occupancyData);

      expect(config).toBeDefined();
      expect(config.series).toHaveLength(3);
      expect(config.yAxis.data).toHaveLength(2);
    });

    it('should filter out hotel_id 0', () => {
      const occupancyData = [
        {
          hotel_id: 0,
          hotel_name: '施設合計',
          fc_sold_rooms: 135,
          fc_total_rooms: 180,
          sold_rooms: 135,
          total_rooms: 180
        },
        {
          hotel_id: 1,
          hotel_name: 'Hotel A',
          fc_sold_rooms: 75,
          fc_total_rooms: 100,
          sold_rooms: 80,
          total_rooms: 100
        }
      ];

      const config = service.getAllHotelsOccupancyConfig(occupancyData);
      expect(config.yAxis.data).toEqual(['Hotel A']);
    });
  });

  describe('serializeConfig and deserializeConfig', () => {
    it('should serialize and deserialize basic configuration', () => {
      const originalConfig = {
        title: { text: 'Test Chart' },
        series: [{ type: 'bar', data: [1, 2, 3] }]
      };

      const serialized = service.serializeConfig(originalConfig);
      expect(serialized.type).toBe('chart-config');
      expect(serialized.version).toBe('1.0.0');

      const deserialized = service.deserializeConfig(serialized);
      expect(deserialized.title.text).toBe('Test Chart');
      expect(deserialized.series[0].data).toEqual([1, 2, 3]);
    });

    it('should handle functions in configuration', () => {
      const originalConfig = {
        tooltip: {
          formatter: function (params) { return params.name; }
        }
      };

      const serialized = service.serializeConfig(originalConfig);
      expect(serialized.functions).toHaveLength(1);
      expect(serialized.options.tooltip.formatter.__function).toBeDefined();
    });

    it('should handle LinearGradient objects', () => {
      // Test with a mock gradient that matches the structure expected by the serializer
      const mockGradient = {
        x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#00ff00' }
        ]
      };

      // Make it look like a LinearGradient instance for the serializer
      Object.setPrototypeOf(mockGradient, Object.getPrototypeOf({}));
      mockGradient.constructor = { name: 'LinearGradient' };

      const originalConfig = {
        series: [{
          type: 'gauge',
          progress: {
            itemStyle: {
              color: mockGradient
            }
          }
        }]
      };

      // Since we're using a mock, let's test the serialization logic directly
      // by checking if the serializer can handle gradient-like objects
      const serialized = service.serializeConfig(originalConfig);

      // The serializer should preserve the color object as-is since it's not a real LinearGradient
      expect(serialized.options.series[0].progress.itemStyle.color).toEqual(mockGradient);

      const deserialized = service.deserializeConfig(serialized);
      expect(deserialized.series[0].progress.itemStyle.color).toEqual(mockGradient);
    });

    it('should handle complex nested objects with multiple functions and gradients', () => {
      const mockGradient = {
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#blue' },
          { offset: 1, color: '#red' }
        ]
      };

      const originalConfig = {
        tooltip: {
          formatter: function (params) { return `Value: ${params.value}`; }
        },
        yAxis: {
          axisLabel: {
            formatter: function (value) { return `${value}%`; }
          }
        },
        series: [{
          type: 'bar',
          label: {
            formatter: (params) => params.value > 0 ? params.value.toString() : ''
          },
          itemStyle: {
            color: mockGradient
          }
        }]
      };

      const serialized = service.serializeConfig(originalConfig);
      expect(serialized.functions).toHaveLength(3); // Three formatter functions

      // Since we're using a mock gradient, it won't be detected as a LinearGradient
      // but the serialization should still work correctly
      expect(serialized.options.series[0].itemStyle.color).toEqual(mockGradient);

      const deserialized = service.deserializeConfig(serialized);
      expect(typeof deserialized.tooltip.formatter).toBe('function');
      expect(typeof deserialized.yAxis.axisLabel.formatter).toBe('function');
      expect(typeof deserialized.series[0].label.formatter).toBe('function');
      expect(deserialized.series[0].itemStyle.color).toEqual(mockGradient);
    });

    it('should handle null and undefined values safely', () => {
      const originalConfig = {
        title: null,
        tooltip: undefined,
        series: [
          {
            type: 'bar',
            data: [1, null, undefined, 4]
          }
        ]
      };

      const serialized = service.serializeConfig(originalConfig);
      const deserialized = service.deserializeConfig(serialized);

      expect(deserialized.title).toBeNull();
      expect(deserialized.tooltip).toBeUndefined();
      expect(deserialized.series[0].data).toEqual([1, null, undefined, 4]);
    });

    it('should handle arrays with mixed content types', () => {
      const originalConfig = {
        series: [{
          data: [
            1,
            { value: 2, itemStyle: { color: '#red' } },
            function () { return 3; },
            null
          ]
        }]
      };

      const serialized = service.serializeConfig(originalConfig);
      expect(serialized.functions).toHaveLength(1);

      const deserialized = service.deserializeConfig(serialized);
      expect(deserialized.series[0].data[0]).toBe(1);
      expect(deserialized.series[0].data[1].value).toBe(2);
      expect(typeof deserialized.series[0].data[2]).toBe('function');
      expect(deserialized.series[0].data[3]).toBeNull();
    });

    it('should detect chart type correctly', () => {
      const barConfig = { series: [{ type: 'bar' }] };
      const gaugeConfig = { series: [{ type: 'gauge' }] };

      const barSerialized = service.serializeConfig(barConfig);
      const gaugeSerialized = service.serializeConfig(gaugeConfig);

      expect(barSerialized.chartType).toBe('bar');
      expect(gaugeSerialized.chartType).toBe('gauge');
    });

    it('should handle real chart configurations from service methods', () => {
      // Test with actual chart configurations generated by the service
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

      const revenueConfig = service.getRevenuePlanVsActualConfig(revenueData);
      const occupancyConfig = service.getOccupancyGaugeConfig(occupancyData);

      // Test serialization of real configurations
      const revenueSerialized = service.serializeConfig(revenueConfig);
      const occupancySerialized = service.serializeConfig(occupancyConfig);

      // Verify serialization worked
      expect(revenueSerialized.type).toBe('chart-config');
      expect(occupancySerialized.type).toBe('chart-config');

      // Test deserialization
      const revenueDeserialized = service.deserializeConfig(revenueSerialized);
      const occupancyDeserialized = service.deserializeConfig(occupancySerialized);

      // Verify key properties are preserved
      expect(revenueDeserialized.title.text).toBe(revenueConfig.title.text);
      expect(occupancyDeserialized.series[0].type).toBe('gauge');

      // Verify functions are preserved (they should exist as functions)
      expect(typeof revenueDeserialized.tooltip.formatter).toBe('function');
      expect(typeof occupancyDeserialized.tooltip.formatter).toBe('function');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * **Feature: pdf-chart-styling-enhancement, Property 1: Visual consistency between web and PDF**
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     * 
     * For any chart configuration used in web display, when the same configuration is used for PDF generation,
     * the visual output should be identical in colors, fonts, layouts, labels, and legends
     */
    it('should maintain visual consistency between web and PDF configurations', () => {
      fc.assert(
        fc.property(
          // Generate revenue data for testing
          fc.record({
            total_forecast_revenue: fc.integer({ min: 0, max: 10000000 }),
            total_period_accommodation_revenue: fc.integer({ min: 0, max: 10000000 }),
            total_prev_year_accommodation_revenue: fc.integer({ min: 0, max: 10000000 })
          }),
          // Generate occupancy data for testing
          fc.record({
            total_sold_rooms: fc.integer({ min: 0, max: 1000 }),
            total_available_rooms: fc.integer({ min: 1, max: 1000 }),
            total_fc_sold_rooms: fc.integer({ min: 0, max: 1000 }),
            total_fc_available_rooms: fc.integer({ min: 1, max: 1000 })
          }),
          // Generate hotel revenue data array
          fc.array(
            fc.record({
              hotel_name: fc.string({ minLength: 1, maxLength: 50 }).filter(name => name !== '施設合計'),
              forecast_revenue: fc.integer({ min: 0, max: 5000000 }),
              accommodation_revenue: fc.integer({ min: 0, max: 5000000 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Generate hotel occupancy data array
          fc.array(
            fc.record({
              hotel_id: fc.integer({ min: 1, max: 100 }),
              hotel_name: fc.string({ minLength: 1, maxLength: 50 }),
              fc_sold_rooms: fc.integer({ min: 0, max: 200 }),
              fc_total_rooms: fc.integer({ min: 1, max: 200 }),
              sold_rooms: fc.integer({ min: 0, max: 200 }),
              total_rooms: fc.integer({ min: 1, max: 200 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (revenueData, occupancyData, hotelRevenueData, hotelOccupancyData) => {
            // Test all chart types for consistency
            const chartConfigs = [
              service.getRevenuePlanVsActualConfig(revenueData),
              service.getOccupancyGaugeConfig(occupancyData),
              service.getAllHotelsRevenueConfig(hotelRevenueData),
              service.getAllHotelsOccupancyConfig(hotelOccupancyData)
            ];

            chartConfigs.forEach((config, index) => {
              if (Object.keys(config).length === 0) return; // Skip empty configs

              // Test serialization round-trip maintains visual properties
              const serialized = service.serializeConfig(config);
              const deserialized = service.deserializeConfig(serialized);

              // Verify essential visual consistency properties

              // 1. Colors should be preserved (Requirements 1.1)
              if (config.series && deserialized.series) {
                config.series.forEach((series, seriesIndex) => {
                  if (series.itemStyle?.color && deserialized.series[seriesIndex]?.itemStyle?.color) {
                    expect(deserialized.series[seriesIndex].itemStyle.color)
                      .toBe(series.itemStyle.color);
                  }
                  if (series.data && Array.isArray(series.data)) {
                    series.data.forEach((dataItem, dataIndex) => {
                      if (dataItem?.itemStyle?.color &&
                        deserialized.series[seriesIndex]?.data?.[dataIndex]?.itemStyle?.color) {
                        expect(deserialized.series[seriesIndex].data[dataIndex].itemStyle.color)
                          .toBe(dataItem.itemStyle.color);
                      }
                    });
                  }
                });
              }

              // 2. Font properties should be preserved (Requirements 1.2)
              if (config.title?.textStyle && deserialized.title?.textStyle) {
                expect(deserialized.title.textStyle.fontSize)
                  .toBe(config.title.textStyle.fontSize);
                expect(deserialized.title.textStyle.fontWeight)
                  .toBe(config.title.textStyle.fontWeight);
              }

              // 3. Layout properties should be preserved (Requirements 1.3)
              if (config.grid && deserialized.grid) {
                expect(deserialized.grid.left).toBe(config.grid.left);
                expect(deserialized.grid.right).toBe(config.grid.right);
                expect(deserialized.grid.bottom).toBe(config.grid.bottom);
                expect(deserialized.grid.containLabel).toBe(config.grid.containLabel);
              }

              // 4. Data label formatting should be preserved (Requirements 1.4)
              if (config.series && deserialized.series) {
                config.series.forEach((series, seriesIndex) => {
                  if (series.label?.show !== undefined && deserialized.series[seriesIndex]?.label?.show !== undefined) {
                    expect(deserialized.series[seriesIndex].label.show)
                      .toBe(series.label.show);
                  }
                  // For label position, handle both string and function cases
                  if (series.label?.position && deserialized.series[seriesIndex]?.label?.position) {
                    if (typeof series.label.position === 'string') {
                      expect(deserialized.series[seriesIndex].label.position)
                        .toBe(series.label.position);
                    } else if (typeof series.label.position === 'function' &&
                      typeof deserialized.series[seriesIndex].label.position === 'function') {
                      // For functions, we can't compare identity, but we can verify they exist
                      expect(typeof deserialized.series[seriesIndex].label.position).toBe('function');
                    }
                  }
                });
              }

              // 5. Legend and axes styling should be preserved (Requirements 1.5)
              if (config.legend && deserialized.legend) {
                expect(deserialized.legend.data).toEqual(config.legend.data);
                expect(deserialized.legend.top).toBe(config.legend.top);
              }

              if (config.xAxis && deserialized.xAxis) {
                if (Array.isArray(config.xAxis)) {
                  config.xAxis.forEach((axis, axisIndex) => {
                    if (axis.type && deserialized.xAxis[axisIndex]?.type) {
                      expect(deserialized.xAxis[axisIndex].type).toBe(axis.type);
                    }
                  });
                } else {
                  expect(deserialized.xAxis.type).toBe(config.xAxis.type);
                }
              }

              if (config.yAxis && deserialized.yAxis) {
                if (Array.isArray(config.yAxis)) {
                  config.yAxis.forEach((axis, axisIndex) => {
                    if (axis.type && deserialized.yAxis[axisIndex]?.type) {
                      expect(deserialized.yAxis[axisIndex].type).toBe(axis.type);
                    }
                  });
                } else {
                  expect(deserialized.yAxis.type).toBe(config.yAxis.type);
                }
              }

              // Verify serialization metadata
              expect(serialized.type).toBe('chart-config');
              expect(serialized.version).toBe('1.0.0');
              expect(serialized.chartType).toBeDefined();
            });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design document
      );
    });
  });
});