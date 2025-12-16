import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import chartPrintAdapter, { ChartPrintAdapter } from '../chartPrintAdapter.js';

// Mock lodash.clonedeep
vi.mock('lodash.clonedeep', () => ({
  default: vi.fn((obj) => {
    // Simple deep clone mock that handles most cases but not functions
    return JSON.parse(JSON.stringify(obj));
  })
}));

// Mock ECharts instance
const createMockChartInstance = (options = {}) => {
  const mockOption = {
    animation: true,
    animationDuration: 1000,
    color: ['#5470c6', '#91cc75', '#fac858'],
    series: [
      {
        type: 'bar',
        data: [10, 20, 30],
        itemStyle: { color: '#5470c6' },
        animation: true
      }
    ],
    xAxis: {
      type: 'category',
      data: ['A', 'B', 'C'],
      axisLabel: { fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 12 }
    },
    legend: {
      textStyle: { fontSize: 12 }
    },
    ...options
  };

  const mockContainer = {
    classList: {
      add: vi.fn(),
      remove: vi.fn()
    },
    style: {}
  };

  return {
    getOption: vi.fn(() => JSON.parse(JSON.stringify(mockOption))),
    setOption: vi.fn(),
    getDom: vi.fn(() => mockContainer),
    _mockOption: mockOption,
    _mockContainer: mockContainer
  };
};

describe('ChartPrintAdapter', () => {
  let adapter;
  let mockChart1, mockChart2;

  beforeEach(() => {
    adapter = new ChartPrintAdapter();
    mockChart1 = createMockChartInstance();
    mockChart2 = createMockChartInstance({
      series: [
        {
          type: 'line',
          data: [5, 15, 25],
          lineStyle: { color: '#91cc75' }
        }
      ]
    });
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(adapter.originalChartStates.size).toBe(0);
      expect(adapter.printColorScheme).toBeDefined();
      expect(adapter.printColorScheme.series).toBeInstanceOf(Array);
    });

    it('should create print color scheme with required properties', () => {
      const colorScheme = adapter.getPrintColorScheme();
      
      expect(colorScheme).toHaveProperty('primary');
      expect(colorScheme).toHaveProperty('series');
      expect(colorScheme).toHaveProperty('forecast');
      expect(colorScheme).toHaveProperty('actual');
      expect(colorScheme.series).toHaveLength(8);
    });
  });

  describe('Single Chart Optimization', () => {
    it('should optimize a single chart for print', async () => {
      const result = await adapter.optimizeChartForPrint(mockChart1);
      
      expect(result).toBe(true);
      expect(mockChart1.getOption).toHaveBeenCalled();
      expect(mockChart1.setOption).toHaveBeenCalled();
      expect(adapter.originalChartStates.has(mockChart1)).toBe(true);
    });

    it('should handle invalid chart instance', async () => {
      const result = await adapter.optimizeChartForPrint(null);
      expect(result).toBe(false);
      
      const result2 = await adapter.optimizeChartForPrint({});
      expect(result2).toBe(false);
    });

    it('should store original chart state', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      const originalState = adapter.originalChartStates.get(mockChart1);
      expect(originalState).toBeDefined();
      expect(originalState.option).toBeDefined();
      expect(originalState.container).toBe(mockChart1._mockContainer);
    });

    it('should optimize chart container', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      const container = mockChart1._mockContainer;
      expect(container.classList.add).toHaveBeenCalledWith('chart-print-optimized');
      expect(container.style.pageBreakInside).toBe('avoid');
    });
  });

  describe('Multiple Charts Optimization', () => {
    it('should optimize multiple charts successfully', async () => {
      const charts = [mockChart1, mockChart2];
      const result = await adapter.preparePrintCharts(charts);
      
      expect(result).toBe(true);
      expect(adapter.originalChartStates.size).toBe(2);
      expect(mockChart1.setOption).toHaveBeenCalled();
      expect(mockChart2.setOption).toHaveBeenCalled();
    });

    it('should handle empty array', async () => {
      const result = await adapter.preparePrintCharts([]);
      expect(result).toBe(true);
    });

    it('should handle invalid input', async () => {
      const result = await adapter.preparePrintCharts(null);
      expect(result).toBe(false);
      
      const result2 = await adapter.preparePrintCharts('not an array');
      expect(result2).toBe(false);
    });

    it('should return false if any chart optimization fails', async () => {
      const invalidChart = { getOption: null };
      const charts = [mockChart1, invalidChart];
      
      const result = await adapter.preparePrintCharts(charts);
      expect(result).toBe(false);
    });
  });

  describe('Animation Disabling', () => {
    it('should disable all animations in chart option', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      const setOptionCall = mockChart1.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.animation).toBe(false);
      expect(optimizedOption.animationDuration).toBe(0);
      expect(optimizedOption.series[0].animation).toBe(false);
      expect(optimizedOption.series[0].animationDuration).toBe(0);
    });

    it('should disable tooltip animations', async () => {
      const chartWithTooltip = createMockChartInstance({
        tooltip: { animation: true, animationDuration: 500 }
      });
      
      await adapter.optimizeChartForPrint(chartWithTooltip);
      
      const setOptionCall = chartWithTooltip.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.tooltip.animation).toBe(false);
      expect(optimizedOption.tooltip.animationDuration).toBe(0);
    });
  });

  describe('Color Conversion', () => {
    it('should convert colors to print-friendly alternatives', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      const setOptionCall = mockChart1.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.color).toEqual(adapter.printColorScheme.series);
      expect(optimizedOption.series[0].itemStyle.color).toBe(adapter.printColorScheme.series[0]);
    });

    it('should handle series without existing itemStyle', async () => {
      const chartWithoutItemStyle = createMockChartInstance({
        series: [{ type: 'bar', data: [1, 2, 3] }]
      });
      
      await adapter.optimizeChartForPrint(chartWithoutItemStyle);
      
      const setOptionCall = chartWithoutItemStyle.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.series[0].itemStyle).toBeDefined();
      expect(optimizedOption.series[0].itemStyle.color).toBe(adapter.printColorScheme.series[0]);
    });

    it('should convert line and area styles', async () => {
      const chartWithLineArea = createMockChartInstance({
        series: [
          {
            type: 'line',
            lineStyle: { color: '#ff0000' },
            areaStyle: { color: '#00ff00' }
          }
        ]
      });
      
      await adapter.optimizeChartForPrint(chartWithLineArea);
      
      const setOptionCall = chartWithLineArea.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.series[0].lineStyle.color).toBe(adapter.printColorScheme.series[0]);
      expect(optimizedOption.series[0].areaStyle.color).toBe(adapter.printColorScheme.series[0]);
    });
  });

  describe('Size Optimization', () => {
    it('should optimize chart dimensions for print', () => {
      const containerDimensions = { width: 1000, height: 600 };
      const optimized = adapter.optimizeChartSizes(containerDimensions);
      
      expect(optimized.width).toBeLessThanOrEqual(700); // Max print width
      expect(optimized.height).toBeLessThanOrEqual(500); // Max print height
      expect(optimized.aspectRatio).toBeDefined();
    });

    it('should maintain aspect ratio when optimizing', () => {
      // Test with dimensions that don't exceed constraints
      const smallDimensions = { width: 600, height: 300 };
      const optimizedSmall = adapter.optimizeChartSizes(smallDimensions);
      
      const originalRatio = smallDimensions.width / smallDimensions.height;
      
      // When dimensions fit within constraints, aspect ratio should be preserved
      expect(optimizedSmall.aspectRatio).toBe(originalRatio);
      expect(optimizedSmall.width).toBe(600);
      expect(optimizedSmall.height).toBe(300);
      
      // Test with dimensions that exceed constraints
      const largeDimensions = { width: 800, height: 400 };
      const optimizedLarge = adapter.optimizeChartSizes(largeDimensions);
      
      // When dimensions exceed constraints, they should be adjusted to fit
      expect(optimizedLarge.width).toBeLessThanOrEqual(700); // maxPrintWidth
      expect(optimizedLarge.height).toBeLessThanOrEqual(500); // maxPrintHeight
      expect(Number.isFinite(optimizedLarge.aspectRatio)).toBe(true);
    });

    it('should handle small dimensions', () => {
      const containerDimensions = { width: 200, height: 100 };
      const optimized = adapter.optimizeChartSizes(containerDimensions);
      
      expect(optimized.width).toBe(200);
      expect(optimized.height).toBe(100);
    });

    it('should handle zero and invalid dimensions', () => {
      // Test zero dimensions
      const zeroDimensions = { width: 0, height: 0 };
      const optimizedZero = adapter.optimizeChartSizes(zeroDimensions);
      
      expect(optimizedZero.width).toBeGreaterThan(0);
      expect(optimizedZero.height).toBeGreaterThan(0);
      expect(Number.isFinite(optimizedZero.aspectRatio)).toBe(true);
      
      // Test negative dimensions
      const negativeDimensions = { width: -100, height: -50 };
      const optimizedNegative = adapter.optimizeChartSizes(negativeDimensions);
      
      expect(optimizedNegative.width).toBeGreaterThan(0);
      expect(optimizedNegative.height).toBeGreaterThan(0);
      
      // Test NaN dimensions
      const nanDimensions = { width: NaN, height: NaN };
      const optimizedNaN = adapter.optimizeChartSizes(nanDimensions);
      
      expect(Number.isFinite(optimizedNaN.width)).toBe(true);
      expect(Number.isFinite(optimizedNaN.height)).toBe(true);
      expect(Number.isFinite(optimizedNaN.aspectRatio)).toBe(true);
      
      // Test Infinity dimensions
      const infinityDimensions = { width: Infinity, height: Infinity };
      const optimizedInfinity = adapter.optimizeChartSizes(infinityDimensions);
      
      expect(Number.isFinite(optimizedInfinity.width)).toBe(true);
      expect(Number.isFinite(optimizedInfinity.height)).toBe(true);
      expect(Number.isFinite(optimizedInfinity.aspectRatio)).toBe(true);
    });

    it('should handle division by zero scenarios', () => {
      // Test height = 0 (would cause division by zero)
      const zeroHeight = { width: 800, height: 0 };
      const optimized = adapter.optimizeChartSizes(zeroHeight);
      
      expect(optimized.height).toBeGreaterThan(0);
      expect(Number.isFinite(optimized.aspectRatio)).toBe(true);
      expect(optimized.aspectRatio).not.toBe(Infinity);
      
      // Test width = 0
      const zeroWidth = { width: 0, height: 400 };
      const optimizedWidth = adapter.optimizeChartSizes(zeroWidth);
      
      expect(optimizedWidth.width).toBeGreaterThan(0);
      expect(Number.isFinite(optimizedWidth.aspectRatio)).toBe(true);
    });
  });

  describe('Text Enhancement', () => {
    it('should enhance text for print readability', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      const setOptionCall = mockChart1.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.xAxis.axisLabel.color).toBe(adapter.printColorScheme.text);
      expect(optimizedOption.yAxis.axisLabel.color).toBe(adapter.printColorScheme.text);
      expect(optimizedOption.xAxis.axisLabel.fontSize).toBe(9);
      expect(optimizedOption.yAxis.axisLabel.fontSize).toBe(9);
    });

    it('should preserve falsy values in grid configuration', async () => {
      const chartWithGrid = createMockChartInstance({
        grid: {
          left: 0,        // Should be preserved (falsy but valid)
          right: '5%',    // Should be preserved
          top: undefined, // Should get default
          bottom: null    // Should be preserved (null is not undefined)
        }
      });
      
      await adapter.optimizeChartForPrint(chartWithGrid);
      
      const setOptionCall = chartWithGrid.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.grid.left).toBe(0);        // Preserved falsy value
      expect(optimizedOption.grid.right).toBe('5%');    // Preserved existing value
      expect(optimizedOption.grid.top).toBe('15%');     // Got default for undefined
      expect(optimizedOption.grid.bottom).toBe(null);   // Preserved null value
      expect(optimizedOption.grid.containLabel).toBe(true);
    });

    it('should handle multiple axes', async () => {
      const chartWithMultipleAxes = createMockChartInstance({
        xAxis: [
          { type: 'category', axisLabel: { fontSize: 12 } },
          { type: 'category', axisLabel: { fontSize: 14 } }
        ],
        yAxis: [
          { type: 'value', axisLabel: { fontSize: 12 } },
          { type: 'value', axisLabel: { fontSize: 14 } }
        ]
      });
      
      await adapter.optimizeChartForPrint(chartWithMultipleAxes);
      
      const setOptionCall = chartWithMultipleAxes.setOption.mock.calls[0];
      const optimizedOption = setOptionCall[0];
      
      expect(optimizedOption.xAxis[0].axisLabel.fontSize).toBe(9);
      expect(optimizedOption.xAxis[1].axisLabel.fontSize).toBe(9);
      expect(optimizedOption.yAxis[0].axisLabel.fontSize).toBe(9);
      expect(optimizedOption.yAxis[1].axisLabel.fontSize).toBe(9);
    });
  });

  describe('State Restoration', () => {
    it('should restore original chart states', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      await adapter.optimizeChartForPrint(mockChart2);
      
      expect(adapter.originalChartStates.size).toBe(2);
      
      adapter.restoreOriginalStates([mockChart1, mockChart2]);
      
      expect(adapter.originalChartStates.size).toBe(0);
      expect(mockChart1.setOption).toHaveBeenCalledTimes(2); // Once for optimize, once for restore
      expect(mockChart2.setOption).toHaveBeenCalledTimes(2);
    });

    it('should remove print-specific styles from containers', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      adapter.restoreOriginalStates([mockChart1]);
      
      const container = mockChart1._mockContainer;
      expect(container.classList.remove).toHaveBeenCalledWith('chart-print-optimized');
      expect(container.style.pageBreakInside).toBe('');
    });

    it('should handle restoration with empty array', () => {
      expect(() => adapter.restoreOriginalStates([])).not.toThrow();
    });

    it('should handle charts not in original states', () => {
      const newChart = createMockChartInstance();
      expect(() => adapter.restoreOriginalStates([newChart])).not.toThrow();
    });
  });

  describe('Status and Utility Methods', () => {
    it('should check if chart is optimized for print', async () => {
      expect(adapter.isChartOptimizedForPrint(mockChart1)).toBe(false);
      
      await adapter.optimizeChartForPrint(mockChart1);
      
      expect(adapter.isChartOptimizedForPrint(mockChart1)).toBe(true);
    });

    it('should return correct status information', async () => {
      let status = adapter.getStatus();
      expect(status.optimizedChartsCount).toBe(0);
      expect(status.hasOptimizedCharts).toBe(false);
      
      await adapter.optimizeChartForPrint(mockChart1);
      
      status = adapter.getStatus();
      expect(status.optimizedChartsCount).toBe(1);
      expect(status.hasOptimizedCharts).toBe(true);
      expect(status.printColorScheme).toBeDefined();
    });

    it('should clean up resources on destroy', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      expect(adapter.originalChartStates.size).toBe(1);
      
      adapter.destroy();
      expect(adapter.originalChartStates.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in chart optimization gracefully', async () => {
      const errorChart = {
        getOption: vi.fn(() => { throw new Error('Test error'); }),
        getDom: vi.fn(),
        setOption: vi.fn()
      };
      
      const result = await adapter.optimizeChartForPrint(errorChart);
      expect(result).toBe(false);
    });

    it('should handle errors in state restoration gracefully', async () => {
      await adapter.optimizeChartForPrint(mockChart1);
      
      // Mock setOption to throw error
      mockChart1.setOption.mockImplementation(() => {
        throw new Error('Restore error');
      });
      
      expect(() => adapter.restoreOriginalStates([mockChart1])).not.toThrow();
    });
  });
});