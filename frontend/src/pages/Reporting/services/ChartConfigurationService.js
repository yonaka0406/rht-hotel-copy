/**
 * Centralized Chart Configuration Service
 * 
 * This service provides unified chart configurations for both web components and PDF generation.
 * It ensures consistent styling, colors, fonts, and layouts across all chart outputs.
 * Supports dark mode theming for better user experience.
 */

import * as echarts from 'echarts/core';
import {
  formatYenInTenThousands,
  formatYenInTenThousandsNoDecimal,
  formatPercentage,
} from '@/utils/formatUtils';
import { colorScheme } from '@/utils/reportingUtils';

class ChartConfigurationService {
  /**
   * Detect if dark mode is currently active
   * @returns {boolean} True if dark mode is active
   */
  _isDarkMode() {
    // Check for dark class on html or body element
    return document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark') ||
      // Check for CSS custom property or media query
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Get theme-aware text colors
   * @returns {Object} Text color configuration for current theme
   */
  _getTextColors() {
    const isDark = this._isDarkMode();
    return {
      title: isDark ? '#f3f4f6' : '#374151',        // gray-100 : gray-700
      axisLabel: isDark ? '#d1d5db' : '#6b7280',     // gray-300 : gray-500
      axisName: isDark ? '#e5e7eb' : '#4b5563',      // gray-200 : gray-600
      legend: isDark ? '#f9fafb' : '#111827',        // gray-50 : gray-900
      tooltip: {
        backgroundColor: isDark ? '#374151' : '#ffffff',  // gray-700 : white
        textColor: isDark ? '#f9fafb' : '#111827',         // gray-50 : gray-900
        borderColor: isDark ? '#6b7280' : '#e5e7eb'        // gray-500 : gray-200
      }
    };
  }

  /**
   * Get theme-aware grid and axis line colors
   * @returns {Object} Grid color configuration for current theme
   */
  _getGridColors() {
    const isDark = this._isDarkMode();
    return {
      splitLine: isDark ? '#4b5563' : '#e5e7eb',     // gray-600 : gray-200
      axisLine: isDark ? '#6b7280' : '#d1d5db',      // gray-500 : gray-300
    };
  }
  /**
   * Get configuration for Revenue Plan vs Actual chart
   * @param {Object} revenueData - Revenue data object
   * @param {Object} options - Additional options (height, etc.)
   * @returns {Object} ECharts configuration object
   */
  getRevenuePlanVsActualConfig(revenueData, options = {}) {
    const {
      total_forecast_revenue,
      total_period_accommodation_revenue,
      total_prev_year_accommodation_revenue
    } = revenueData;

    const varianceAmount = total_period_accommodation_revenue - total_forecast_revenue;
    const prevYearAmount = total_prev_year_accommodation_revenue || 0;

    let displayVariancePercent;
    if (total_forecast_revenue === 0 || total_forecast_revenue === null) {
      displayVariancePercent = (total_period_accommodation_revenue === 0 || total_period_accommodation_revenue === null) ? "0.00%" : "N/A";
    } else {
      const percent = (varianceAmount / total_forecast_revenue) * 100;
      displayVariancePercent = `${percent.toFixed(2)}%`;
    }

    const variancePositiveColor = '#4CAF50';
    const varianceNegativeColor = '#F44336';
    const prevYearColor = '#909399';

    // Get theme-aware colors
    const textColors = this._getTextColors();
    const gridColors = this._getGridColors();

    return {
      title: {
        text: '売上 (計画 vs 実績・予約)',
        left: 'center',
        top: '0%',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: textColors.title
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: textColors.tooltip.backgroundColor,
        borderColor: textColors.tooltip.borderColor,
        textStyle: {
          color: textColors.tooltip.textColor
        },
        formatter: (params) => {
          const valueParam = params.find(p => p.seriesName === '売上');
          if (!valueParam) return '';

          let tooltipText = `${valueParam.name}<br/>`;
          if (valueParam.name === '分散') {
            tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(varianceAmount)}<br/>`;
            tooltipText += `率: ${displayVariancePercent}`;
          } else {
            tooltipText += `${valueParam.marker || ''} 金額: ${formatYenInTenThousands(valueParam.value)}`;
          }
          return tooltipText;
        },
      },
      grid: {
        left: '3%',
        right: '10%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: [{
        type: 'category',
        data: ['計画売上', '分散', '実績・予約売上', '前年実績'],
        splitLine: { show: false },
        axisLabel: {
          interval: 0,
          color: textColors.axisLabel
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        }
      }],
      yAxis: [{
        type: 'value',
        name: '金額 (万円)',
        nameTextStyle: {
          color: textColors.axisName
        },
        axisLabel: {
          formatter: (value) => `${(value / 10000).toLocaleString('ja-JP')}`,
          color: textColors.axisLabel
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: gridColors.splitLine
          }
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        }
      }],
      series: [
        {
          name: 'PlaceholderBase',
          type: 'bar',
          stack: 'total',
          barWidth: '60%',
          itemStyle: { borderColor: 'transparent', color: 'transparent' },
          emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
          data: [
            0,
            varianceAmount >= 0 ? total_forecast_revenue : total_period_accommodation_revenue,
            0,
            0,
          ],
        },
        {
          name: '売上',
          type: 'bar',
          stack: 'total',
          barWidth: '60%',
          label: {
            show: true,
            color: textColors.axisLabel,
            formatter: (params) => {
              if (params.name === '分散') {
                return displayVariancePercent;
              }
              return formatYenInTenThousandsNoDecimal(params.value);
            },
          },
          data: [
            {
              value: total_forecast_revenue,
              itemStyle: { color: colorScheme.forecast },
              label: { position: 'top' },
            },
            {
              value: Math.abs(varianceAmount),
              itemStyle: { color: varianceAmount >= 0 ? variancePositiveColor : varianceNegativeColor },
              label: { position: 'top' },
            },
            {
              value: total_period_accommodation_revenue,
              itemStyle: { color: colorScheme.actual },
              label: { position: 'top' },
            },
            {
              value: prevYearAmount,
              itemStyle: { color: prevYearColor },
              label: { position: 'top' },
            },
          ],
        },
      ],
    };
  }

  /**
   * Get configuration for Occupancy Gauge chart
   * @param {Object} occupancyData - Occupancy data object
   * @param {Object} options - Additional options (height, previousYearOccupancy, etc.)
   * @returns {Object} ECharts configuration object
   */
  getOccupancyGaugeConfig(occupancyData, options = {}) {
    const {
      total_sold_rooms = 0,
      total_available_rooms = 0,
      total_fc_sold_rooms = 0,
      total_fc_available_rooms = 0,
    } = occupancyData;

    const { previousYearOccupancy = null } = options;

    const actualTotalRooms = total_fc_available_rooms > 0 ? total_fc_available_rooms : total_available_rooms;
    const forecastTotalRooms = total_fc_available_rooms;

    const totalActualOccupancy = actualTotalRooms > 0 ? total_sold_rooms / actualTotalRooms : 0;
    const totalForecastOccupancy = forecastTotalRooms > 0 ? total_fc_sold_rooms / forecastTotalRooms : 0;

    // Get theme-aware colors
    const textColors = this._getTextColors();

    return {
      tooltip: {
        backgroundColor: textColors.tooltip.backgroundColor,
        borderColor: textColors.tooltip.borderColor,
        textStyle: {
          color: textColors.tooltip.textColor
        },
        formatter: (params) => {
          if (params.seriesName === '実績・予約稼働率') {
            return `実績・予約稼働率: ${formatPercentage(params.value)}<br/>計画稼働率: ${formatPercentage(totalForecastOccupancy)}`;
          }
          return '';
        },
      },
      series: [{
        type: 'gauge',
        radius: '100%',
        center: ['50%', '80%'],
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 1,
        splitNumber: 4,
        axisLine: {
          lineStyle: {
            width: 22,
            color: [
              [1, '#E0E0E0'],
            ],
          },
        },
        progress: {
          show: true,
          width: 22,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colorScheme.actual_gradient_bottom },
              { offset: 1, color: colorScheme.actual_gradient_top },
            ]),
          },
        },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          show: true,
          distance: 5,
          formatter: function (value) { return (value * 100).toFixed(0) + '%'; },
          fontSize: 10,
          color: textColors.axisLabel,
        },
        title: {
          offsetCenter: [0, '25%'],
          fontSize: 14,
          color: textColors.title,
          fontWeight: 'normal',
        },
        detail: {
          width: '70%',
          lineHeight: 22,
          offsetCenter: [0, '-10%'],
          valueAnimation: true,
          formatter: function (value) {
            let forecastText = `計画: ${formatPercentage(totalForecastOccupancy)}`;
            let prevYearText = previousYearOccupancy !== null ? `前年度同月度: ${formatPercentage(previousYearOccupancy)}` : '';
            return `{actual|${formatPercentage(value)}}
{forecast|${forecastText}}
{prev|${prevYearText}}`;
          },
          rich: {
            actual: { fontSize: 24, fontWeight: 'bold', color: colorScheme.actual },
            forecast: { fontSize: 13, color: colorScheme.forecast, paddingTop: 8 },
            prev: { fontSize: 13, color: textColors.axisLabel, paddingTop: 4 },
          },
        },
        data: [{ value: totalActualOccupancy, name: '実績・予約稼働率' }],
      }],
    };
  }

  /**
   * Get configuration for All Hotels Revenue chart (Hotel Sales Comparison)
   * @param {Array} revenueData - Array of revenue data for all hotels
   * @param {Object} options - Additional options (height, prevYearRevenueData, comparisonType)
   * @returns {Object} ECharts configuration object
   */
  getAllHotelsRevenueConfig(revenueData, options = {}) {
    if (!revenueData || revenueData.length === 0) return {};

    const { prevYearRevenueData = [], comparisonType = 'forecast' } = options;
    const isYoY = comparisonType === 'yoy';

    const hotelMap = new Map();
    revenueData.forEach(item => {
      if (item.hotel_name && item.hotel_name !== '施設合計') {
        const entry = hotelMap.get(item.hotel_name) || {
          hotel_name: item.hotel_name,
          total_forecast_revenue: 0,
          total_period_accommodation_revenue: 0,
          total_prev_year_revenue: 0,
          revenue_to_compare: 0,
          comparison_achieved_percentage: 0
        };
        entry.total_forecast_revenue += (item.forecast_revenue || 0);
        entry.total_period_accommodation_revenue += (item.accommodation_revenue || 0);
        hotelMap.set(item.hotel_name, entry);
      }
    });

    if (isYoY && prevYearRevenueData.length > 0) {
      prevYearRevenueData.forEach(item => {
        if (item.hotel_name && item.hotel_name !== '施設合計') {
          const entry = hotelMap.get(item.hotel_name);
          if (entry) {
            entry.total_prev_year_revenue += (item.accommodation_revenue || 0);
          }
        }
      });
    }

    const data = Array.from(hotelMap.values()).map(hotel => {
      const compareValue = isYoY ? hotel.total_prev_year_revenue : hotel.total_forecast_revenue;

      if ((compareValue - hotel.total_period_accommodation_revenue) < 0) {
        hotel.revenue_to_compare = 0;
      } else {
        hotel.revenue_to_compare = compareValue - hotel.total_period_accommodation_revenue;
      }

      if (compareValue > 0) {
        hotel.comparison_achieved_percentage = (hotel.total_period_accommodation_revenue / compareValue) * 100;
      } else {
        hotel.comparison_achieved_percentage = hotel.total_period_accommodation_revenue > 0 ? Infinity : 0;
      }
      return hotel;
    }).sort((a, b) => {
      const compareValueA = isYoY ? a.total_prev_year_revenue : a.total_forecast_revenue;
      const compareValueB = isYoY ? b.total_prev_year_revenue : b.total_forecast_revenue;
      const diffA = a.total_period_accommodation_revenue - compareValueA;
      const diffB = b.total_period_accommodation_revenue - compareValueB;
      return diffB - diffA;
    });

    if (!data.length) return {};

    const hotelNames = data.map(item => item.hotel_name);
    const comparisonValues = data.map(item => isYoY ? item.total_prev_year_revenue : item.total_forecast_revenue);
    const accommodationValues = data.map(item => item.total_period_accommodation_revenue);
    const revenueToCompareValues = data.map(item => item.revenue_to_compare);

    const extraData = data.map(item => ({
      revenue_to_compare: item.revenue_to_compare,
      comparison_achieved_percentage: item.comparison_achieved_percentage
    }));

    const comparisonLabel = isYoY ? '前年売上合計' : '計画売上合計';
    const comparisonGapLabel = isYoY ? '前年達成まで' : '計画達成まで';
    const achievementLabel = isYoY ? '前年比' : '達成率';
    const compareColor = isYoY ? '#909399' : colorScheme.forecast;

    // Get theme-aware colors
    const textColors = this._getTextColors();
    const gridColors = this._getGridColors();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: textColors.tooltip.backgroundColor,
        borderColor: textColors.tooltip.borderColor,
        textStyle: {
          color: textColors.tooltip.textColor
        },
        formatter: params => {
          const dataIndex = params[0].dataIndex;
          const currentHotelExtraData = extraData[dataIndex];
          let tooltip = `${params[0].name}<br/>`;
          params.forEach(param => {
            tooltip += `${param.marker} ${param.seriesName}: ${formatYenInTenThousands(param.value)}<br/>`;
          });
          tooltip += `${achievementLabel}: ${currentHotelExtraData.comparison_achieved_percentage === Infinity ? 'N/A' : currentHotelExtraData.comparison_achieved_percentage.toFixed(2) + '%'}<br/>`;
          return tooltip;
        }
      },
      legend: {
        data: [comparisonLabel, '実績・予約売上合計', comparisonGapLabel],
        top: 'bottom',
        textStyle: {
          color: textColors.legend
        }
      },
      grid: {
        containLabel: true,
        left: '3%',
        right: '10%',
        bottom: '10%'
      },
      xAxis: {
        type: 'value',
        name: '売上 (万円)',
        nameTextStyle: {
          color: textColors.axisName
        },
        axisLabel: {
          formatter: value => (value / 10000).toLocaleString('ja-JP'),
          color: textColors.axisLabel
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        },
        splitLine: {
          lineStyle: {
            color: gridColors.splitLine
          }
        }
      },
      yAxis: {
        type: 'category',
        data: hotelNames,
        inverse: true,
        axisLabel: {
          color: textColors.axisLabel
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        }
      },
      series: [
        {
          name: comparisonLabel,
          type: 'bar',
          data: comparisonValues,
          itemStyle: { color: compareColor },
          barGap: '5%',
          label: {
            show: true,
            position: 'right',
            distance: 5,
            color: '#333333',
            formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : ''
          }
        },
        {
          name: '実績・予約売上合計',
          type: 'bar',
          data: accommodationValues,
          itemStyle: { color: colorScheme.actual },
          barGap: '5%',
          label: {
            show: true,
            position: 'right',
            distance: 5,
            color: '#333333',
            formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : ''
          }
        },
        {
          name: comparisonGapLabel,
          type: 'bar',
          data: revenueToCompareValues,
          itemStyle: { color: colorScheme.toForecast },
          barGap: '5%',
          label: {
            show: true,
            position: 'right',
            distance: 5,
            color: '#333333',
            formatter: params => params.value > 0 ? formatYenInTenThousandsNoDecimal(params.value) : ''
          }
        }
      ]
    };
  }

  /**
   * Get configuration for All Hotels Occupancy chart
   * @param {Array} occupancyData - Array of occupancy data for all hotels
   * @param {Object} options - Additional options (height, prevYearOccupancyData, comparisonType)
   * @returns {Object} ECharts configuration object
   */
  getAllHotelsOccupancyConfig(occupancyData, options = {}) {
    if (!occupancyData || occupancyData.length === 0) return {};

    const { prevYearOccupancyData = [], comparisonType = 'forecast' } = options;
    const isYoY = comparisonType === 'yoy';

    const hotelMap = new Map();
    occupancyData.filter(item => item.hotel_id !== 0).forEach(item => {
      if (item.hotel_name) {
        const entry = hotelMap.get(item.hotel_name) || {
          hotel_name: item.hotel_name,
          sum_fc_sold_rooms: 0,
          sum_fc_total_rooms: 0,
          sum_sold_rooms: 0,
          sum_total_rooms: 0,
          sum_prev_year_sold_rooms: 0,
          sum_prev_year_total_rooms: 0
        };
        entry.sum_fc_sold_rooms += (item.fc_sold_rooms || 0);
        entry.sum_fc_total_rooms += (item.fc_total_rooms || 0);
        entry.sum_sold_rooms += (item.sold_rooms || 0);
        entry.sum_total_rooms += (item.total_rooms || 0);
        hotelMap.set(item.hotel_name, entry);
      }
    });

    if (isYoY && prevYearOccupancyData.length > 0) {
      prevYearOccupancyData.filter(item => item.hotel_id !== 0).forEach(item => {
        if (item.hotel_name) {
          const entry = hotelMap.get(item.hotel_name);
          if (entry) {
            entry.sum_prev_year_sold_rooms += (item.sold_rooms || 0);
            entry.sum_prev_year_total_rooms += (item.total_rooms || 0);
          }
        }
      });
    }

    let data = Array.from(hotelMap.values()).map(hotel => {
      const compare_occupancy_rate = isYoY
        ? (hotel.sum_prev_year_total_rooms > 0 ? (hotel.sum_prev_year_sold_rooms / hotel.sum_prev_year_total_rooms) * 100 : 0)
        : (hotel.sum_fc_total_rooms > 0 ? (hotel.sum_fc_sold_rooms / hotel.sum_fc_total_rooms) * 100 : 0);

      const actual_occupancy_rate = hotel.sum_fc_total_rooms > 0 ? (hotel.sum_sold_rooms / hotel.sum_fc_total_rooms) * 100 : (hotel.sum_total_rooms > 0 ? (hotel.sum_sold_rooms / hotel.sum_total_rooms) * 100 : 0);
      const occupancy_variance = actual_occupancy_rate - compare_occupancy_rate;
      return { ...hotel, compare_occupancy_rate, actual_occupancy_rate, occupancy_variance };
    });

    if (!data.length) return {};

    // Sort data by occupancy_variance in descending order
    data = [...data].sort((a, b) => b.occupancy_variance - a.occupancy_variance);

    const hotelNames = data.map(item => item.hotel_name);
    const comparisonValues = data.map(item => item.compare_occupancy_rate);
    const actualValues = data.map(item => item.actual_occupancy_rate);
    const varianceValues = data.map(item => item.occupancy_variance);

    const comparisonLabel = isYoY ? '前年稼働率' : '計画稼働率';
    const compareColor = isYoY ? '#909399' : colorScheme.forecast;

    // Get theme-aware colors
    const textColors = this._getTextColors();
    const gridColors = this._getGridColors();

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: textColors.tooltip.backgroundColor,
        borderColor: textColors.tooltip.borderColor,
        textStyle: {
          color: textColors.tooltip.textColor
        },
        formatter: params => {
          let tooltip = `${params[0].name}<br/>`;
          params.forEach(param => {
            tooltip += `${param.marker} ${param.seriesName}: ${formatPercentage(param.value / 100)}${param.seriesName.includes('差異') ? 'p.p.' : '%'}<br/>`;
          });
          return tooltip;
        },
      },
      legend: {
        data: [comparisonLabel, '実績・予約稼働率', '稼働率差異 (p.p.)'],
        top: 'bottom',
        textStyle: {
          color: textColors.legend
        }
      },
      grid: {
        containLabel: true,
        left: '3%',
        right: '5%',
        bottom: '10%'
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}%',
          color: textColors.axisLabel
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        },
        splitLine: {
          lineStyle: {
            color: gridColors.splitLine
          }
        }
      },
      yAxis: {
        type: 'category',
        data: hotelNames,
        inverse: true,
        axisLabel: {
          color: textColors.axisLabel
        },
        axisLine: {
          lineStyle: {
            color: gridColors.axisLine
          }
        }
      },
      series: [
        {
          name: comparisonLabel,
          type: 'bar',
          data: comparisonValues,
          itemStyle: { color: compareColor },
          barGap: '5%',
          label: {
            show: true,
            position: 'right',
            distance: 5,
            color: '#333333',
            formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : ''
          }
        },
        {
          name: '実績・予約稼働率',
          type: 'bar',
          data: actualValues,
          itemStyle: { color: colorScheme.actual },
          barGap: '5%',
          label: {
            show: true,
            position: 'right',
            distance: 5,
            color: '#333333',
            formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : ''
          }
        },
        {
          name: '稼働率差異 (p.p.)',
          type: 'bar',
          data: varianceValues,
          itemStyle: { color: colorScheme.variance },
          barGap: '5%',
          barMaxWidth: '15%',
          label: {
            show: true,
            position: 'left',
            distance: 5,
            color: '#333333',
            formatter: (params) => params.value !== 0 ? formatPercentage(params.value / 100) : ''
          }
        },
      ],
    };
  }

  /**
   * Serialize chart configuration for transmission to backend
   * Handles complex objects like functions and gradients safely
   * @param {Object} config - Chart configuration object
   * @returns {Object} Serializable configuration object
   */
  serializeConfig(config, chartType = 'unknown') {
    try {
      // Enhanced input validation
      if (!config || typeof config !== 'object') {
        throw new Error(`Invalid chart configuration for ${chartType}: config must be an object`);
      }

      if (Array.isArray(config)) {
        throw new Error(`Invalid chart configuration for ${chartType}: config cannot be an array`);
      }

      // Check for circular references
      try {
        JSON.stringify(config);
      } catch (error) {
        if (error.message.includes('circular')) {
          throw new Error(`Circular reference detected in chart configuration for ${chartType}`);
        }
        throw error;
      }

      const serialized = {
        type: 'chart-config',
        version: '1.0.0',
        chartType: chartType !== 'unknown' ? chartType : this._detectChartType(config),
        options: {},
        functions: [],
        gradients: [],
        metadata: {
          serializedAt: new Date().toISOString(),
          originalSize: JSON.stringify(config).length
        }
      };

      // Deep clone and serialize the configuration with error handling
      try {
        serialized.options = this._serializeObject(config, serialized.functions, serialized.gradients);
      } catch (error) {
        throw new Error(`Failed to serialize chart configuration for ${chartType}: ${error.message}`);
      }

      // Validate serialization result
      if (!serialized.options || typeof serialized.options !== 'object') {
        throw new Error(`Serialization failed for ${chartType}: invalid options object`);
      }

      // Log serialization metrics
      console.debug(`Chart configuration serialized successfully for ${chartType}`, {
        chartType: serialized.chartType,
        functionsCount: serialized.functions.length,
        gradientsCount: serialized.gradients.length,
        originalSize: serialized.metadata.originalSize,
        serializedSize: JSON.stringify(serialized).length
      });

      return serialized;
    } catch (error) {
      console.error(`Chart configuration serialization failed for ${chartType}:`, error);

      // Return a fallback serialized configuration
      return {
        type: 'chart-config',
        version: '1.0.0',
        chartType: chartType || 'unknown',
        options: {
          title: { text: `Chart configuration error for ${chartType}` },
          series: []
        },
        functions: [],
        gradients: [],
        error: {
          message: error.message,
          timestamp: new Date().toISOString(),
          fallback: true
        }
      };
    }
  }

  /**
   * Deserialize chart configuration from backend
   * Reconstructs functions and gradients from serialized form
   * @param {Object} serialized - Serialized configuration object
   * @returns {Object} Chart configuration object
   */
  deserializeConfig(serialized) {
    try {
      // Enhanced input validation
      if (!serialized || typeof serialized !== 'object') {
        throw new Error('Serialized configuration must be an object');
      }

      if (serialized.type !== 'chart-config') {
        throw new Error(`Invalid serialized configuration type: expected 'chart-config', got '${serialized.type}'`);
      }

      if (!serialized.options) {
        throw new Error('Serialized configuration missing options property');
      }

      // Check for error in serialized config (fallback case)
      if (serialized.error && serialized.error.fallback) {
        console.warn('Deserializing fallback configuration due to previous serialization error:', serialized.error);
        return serialized.options;
      }

      const config = this._deserializeObject(serialized.options, serialized.functions, serialized.gradients);
      return config;
    } catch (error) {
      console.error('Chart configuration deserialization failed:', error);

      // Return a fallback configuration
      return {
        title: { text: 'Chart configuration error' },
        series: [],
        error: {
          message: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Detect chart type from configuration
   * @private
   */
  _detectChartType(config) {
    if (config.series && config.series.length > 0) {
      const firstSeries = config.series[0];
      if (firstSeries.type === 'gauge') return 'gauge';
      if (firstSeries.type === 'bar') return 'bar';
    }
    return 'unknown';
  }

  /**
   * Serialize object recursively, handling functions and gradients
   * @private
   */
  _serializeObject(obj, functions, gradients) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'function') {
      const funcId = `func_${functions.length}`;
      functions.push({
        id: funcId,
        source: obj.toString()
      });
      return { __function: funcId };
    }

    if (obj instanceof echarts.graphic.LinearGradient) {
      const gradientId = `gradient_${gradients.length}`;
      gradients.push({
        id: gradientId,
        type: 'LinearGradient',
        x: obj.x,
        y: obj.y,
        x2: obj.x2,
        y2: obj.y2,
        colorStops: obj.colorStops
      });
      return { __gradient: gradientId };
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._serializeObject(item, functions, gradients));
    }

    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this._serializeObject(value, functions, gradients);
      }
      return result;
    }

    return obj;
  }

  /**
   * Deserialize object recursively, reconstructing functions and gradients
   * @private
   */
  _deserializeObject(obj, functions, gradients) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'object' && obj.__function) {
      const func = functions.find(f => f.id === obj.__function);
      if (func) {
        // Note: In a real implementation, you'd want to safely evaluate functions
        // For now, we'll return a placeholder or the original function source
        return new Function('return ' + func.source)();
      }
      return null;
    }

    if (typeof obj === 'object' && obj.__gradient) {
      const gradient = gradients.find(g => g.id === obj.__gradient);
      if (gradient && gradient.type === 'LinearGradient') {
        return new echarts.graphic.LinearGradient(
          gradient.x, gradient.y, gradient.x2, gradient.y2, gradient.colorStops
        );
      }
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this._deserializeObject(item, functions, gradients));
    }

    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this._deserializeObject(value, functions, gradients);
      }
      return result;
    }

    return obj;
  }
}

// Export singleton instance
export default new ChartConfigurationService();