import cloneDeep from 'lodash.clonedeep';

/**
 * Chart Print Adapter
 * Provides chart-specific print optimizations for ECharts instances
 * Handles color conversion, animation disabling, and sizing optimization for print media
 */
export class ChartPrintAdapter {
  constructor() {
    this.originalChartStates = new Map();
    this.printColorScheme = this.createPrintColorScheme();
  }

  /**
   * Create print-friendly color scheme
   * @returns {Object} Print color scheme configuration
   * @private
   */
  createPrintColorScheme() {
    return {
      // High contrast colors for print
      primary: '#000000',
      secondary: '#333333',
      accent: '#666666',
      background: '#ffffff',
      text: '#000000',
      
      // Chart-specific colors optimized for print
      series: [
        '#000000', // Black
        '#404040', // Dark gray
        '#808080', // Medium gray
        '#202020', // Very dark gray
        '#606060', // Gray
        '#101010', // Almost black
        '#505050', // Medium dark gray
        '#707070'  // Light gray
      ],
      
      // Semantic colors for print
      success: '#000000',
      warning: '#404040',
      error: '#202020',
      info: '#606060',
      
      // Revenue chart colors
      forecast: '#000000',
      actual: '#404040',
      toForecast: '#808080',
      
      // Occupancy colors
      occupancy: '#000000',
      available: '#606060',
      
      // Grid and axis colors
      gridLine: '#cccccc',
      axisLine: '#000000',
      axisLabel: '#000000'
    };
  }

  /**
   * Prepare multiple chart instances for print
   * @param {Array} chartInstances - Array of ECharts instances
   * @returns {Promise<boolean>} True if optimization succeeded
   */
  async preparePrintCharts(chartInstances) {
    try {
      if (!Array.isArray(chartInstances)) {
        console.warn('[ChartPrintAdapter] chartInstances must be an array');
        return false;
      }

      const optimizationPromises = chartInstances.map(instance => 
        this.optimizeChartForPrint(instance)
      );

      const results = await Promise.all(optimizationPromises);
      return results.every(result => result === true);

    } catch (error) {
      console.error('[ChartPrintAdapter] Error preparing charts for print:', error);
      return false;
    }
  }

  /**
   * Optimize a single chart instance for print
   * @param {Object} chartInstance - ECharts instance
   * @returns {Promise<boolean>} True if optimization succeeded
   */
  async optimizeChartForPrint(chartInstance) {
    try {
      if (!chartInstance || typeof chartInstance.getOption !== 'function') {
        console.warn('[ChartPrintAdapter] Invalid chart instance provided');
        return false;
      }

      // Store original state for restoration
      const originalOption = chartInstance.getOption();
      
      // Use proper deep cloning to preserve nested objects while handling functions separately
      let clonedOption;
      try {
        // First attempt: use lodash cloneDeep which handles most cases
        clonedOption = cloneDeep(originalOption);
        
        // Preserve function references that cloneDeep can't handle
        this.preserveFunctionReferences(originalOption, clonedOption);
        
      } catch (cloneError) {
        console.warn('[ChartPrintAdapter] Deep clone failed, storing original reference:', cloneError);
        // Fallback: store original reference if cloning fails
        clonedOption = originalOption;
      }
      
      this.originalChartStates.set(chartInstance, {
        option: clonedOption,
        container: chartInstance.getDom(),
        isReference: clonedOption === originalOption // Track if we're using reference vs clone
      });

      // Get optimized option for print
      const printOption = this.createPrintOptimizedOption(originalOption);

      // Apply print optimization
      chartInstance.setOption(printOption, true);

      // Optimize container for print
      this.optimizeChartContainer(chartInstance.getDom());

      return true;

    } catch (error) {
      console.error('[ChartPrintAdapter] Error optimizing chart:', error);
      return false;
    }
  }

  /**
   * Preserve function references that cloneDeep cannot handle
   * @param {Object} original - Original option object
   * @param {Object} cloned - Cloned option object
   * @private
   */
  preserveFunctionReferences(original, cloned) {
    try {
      // Preserve tooltip formatter functions
      if (original.tooltip && typeof original.tooltip.formatter === 'function') {
        if (!cloned.tooltip) cloned.tooltip = {};
        cloned.tooltip.formatter = original.tooltip.formatter;
      }
      
      // Preserve axis label formatter functions
      this.preserveAxisFormatters(original.xAxis, cloned.xAxis);
      this.preserveAxisFormatters(original.yAxis, cloned.yAxis);
      
      // Preserve series formatters and callbacks
      if (original.series && cloned.series && Array.isArray(original.series)) {
        original.series.forEach((originalSeries, index) => {
          if (cloned.series[index]) {
            // Preserve label formatters
            if (originalSeries.label && typeof originalSeries.label.formatter === 'function') {
              if (!cloned.series[index].label) cloned.series[index].label = {};
              cloned.series[index].label.formatter = originalSeries.label.formatter;
            }
            
            // Preserve itemStyle color functions
            if (originalSeries.itemStyle && typeof originalSeries.itemStyle.color === 'function') {
              if (!cloned.series[index].itemStyle) cloned.series[index].itemStyle = {};
              cloned.series[index].itemStyle.color = originalSeries.itemStyle.color;
            }
          }
        });
      }
      
      // Preserve legend formatter
      if (original.legend && typeof original.legend.formatter === 'function') {
        if (!cloned.legend) cloned.legend = {};
        cloned.legend.formatter = original.legend.formatter;
      }
      
    } catch (error) {
      console.warn('[ChartPrintAdapter] Error preserving function references:', error);
    }
  }

  /**
   * Preserve axis formatter functions
   * @param {Object|Array} originalAxis - Original axis configuration
   * @param {Object|Array} clonedAxis - Cloned axis configuration
   * @private
   */
  preserveAxisFormatters(originalAxis, clonedAxis) {
    if (!originalAxis || !clonedAxis) return;
    
    const originalAxes = Array.isArray(originalAxis) ? originalAxis : [originalAxis];
    const clonedAxes = Array.isArray(clonedAxis) ? clonedAxis : [clonedAxis];
    
    originalAxes.forEach((origAxis, index) => {
      if (clonedAxes[index]) {
        // Preserve axisLabel formatter
        if (origAxis.axisLabel && typeof origAxis.axisLabel.formatter === 'function') {
          if (!clonedAxes[index].axisLabel) clonedAxes[index].axisLabel = {};
          clonedAxes[index].axisLabel.formatter = origAxis.axisLabel.formatter;
        }
      }
    });
  }

  /**
   * Create print-optimized chart option
   * @param {Object} originalOption - Original chart option
   * @returns {Object} Print-optimized chart option
   * @private
   */
  createPrintOptimizedOption(originalOption) {
    let printOption;
    
    try {
      // Use proper deep cloning instead of JSON serialization
      printOption = cloneDeep(originalOption);
      
      // Preserve function references that cloneDeep can't handle
      this.preserveFunctionReferences(originalOption, printOption);
      
    } catch (cloneError) {
      console.warn('[ChartPrintAdapter] Clone failed in createPrintOptimizedOption, using fallback:', cloneError);
      // Fallback to JSON serialization if cloneDeep fails
      try {
        printOption = JSON.parse(JSON.stringify(originalOption));
      } catch (jsonError) {
        console.error('[ChartPrintAdapter] Both cloning methods failed:', jsonError);
        // Last resort: work with original (dangerous but better than crash)
        printOption = { ...originalOption };
      }
    }

    // Disable all animations
    this.disableAnimations(printOption);

    // Convert colors for print
    this.convertColorsForPrint(printOption);

    // Optimize sizing for print
    this.optimizeSizingForPrint(printOption);

    // Enhance text for print readability
    this.enhanceTextForPrint(printOption);

    // Optimize grid and axes for print
    this.optimizeGridAndAxes(printOption);

    return printOption;
  }

  /**
   * Disable all animations in chart option
   * @param {Object} option - Chart option to modify
   * @private
   */
  disableAnimations(option) {
    // Global animation settings
    option.animation = false;
    option.animationDuration = 0;
    option.animationEasing = 'linear';
    option.animationDelay = 0;
    option.animationDurationUpdate = 0;
    option.animationEasingUpdate = 'linear';
    option.animationDelayUpdate = 0;

    // Disable animations in series
    if (option.series) {
      option.series.forEach(series => {
        series.animation = false;
        series.animationDuration = 0;
        series.animationEasing = 'linear';
        series.animationDelay = 0;
        series.animationDurationUpdate = 0;
        series.animationEasingUpdate = 'linear';
        series.animationDelayUpdate = 0;
      });
    }

    // Disable tooltip animations
    if (option.tooltip) {
      option.tooltip.animation = false;
      option.tooltip.animationDuration = 0;
    }

    // Disable legend animations
    if (option.legend) {
      option.legend.animation = false;
    }
  }

  /**
   * Convert colors to print-friendly alternatives
   * @param {Object} option - Chart option to modify
   * @private
   */
  convertColorsForPrint(option) {
    const colors = this.printColorScheme;

    // Update global color palette
    if (option.color) {
      option.color = colors.series;
    }

    // Update series colors
    if (option.series) {
      option.series.forEach((series, index) => {
        if (series.itemStyle) {
          if (series.itemStyle.color) {
            series.itemStyle.color = colors.series[index % colors.series.length];
          }
        } else {
          series.itemStyle = {
            color: colors.series[index % colors.series.length]
          };
        }

        // Handle line series
        if (series.lineStyle) {
          series.lineStyle.color = colors.series[index % colors.series.length];
        }

        // Handle area series
        if (series.areaStyle) {
          series.areaStyle.color = colors.series[index % colors.series.length];
        }
      });
    }

    // Update background colors
    if (option.backgroundColor) {
      option.backgroundColor = colors.background;
    }

    // Update text colors
    if (option.textStyle) {
      option.textStyle.color = colors.text;
    }
  }

  /**
   * Optimize chart sizing for print media
   * @param {Object} option - Chart option to modify
   * @private
   */
  optimizeSizingForPrint(option) {
    // Optimize grid sizing
    if (option.grid) {
      if (Array.isArray(option.grid)) {
        option.grid.forEach(grid => this.optimizeGridSizing(grid));
      } else {
        this.optimizeGridSizing(option.grid);
      }
    }

    // Optimize legend sizing
    if (option.legend) {
      option.legend.itemWidth = 14;
      option.legend.itemHeight = 14;
      option.legend.textStyle = {
        ...option.legend.textStyle,
        fontSize: 10,
        color: this.printColorScheme.text
      };
    }

    // Optimize title sizing
    if (option.title) {
      option.title.textStyle = {
        ...option.title.textStyle,
        fontSize: 14,
        fontWeight: 'bold',
        color: this.printColorScheme.text
      };
    }
  }

  /**
   * Optimize grid sizing for print
   * @param {Object} grid - Grid configuration
   * @private
   */
  optimizeGridSizing(grid) {
    if (grid.left === undefined) grid.left = '10%';
    if (grid.right === undefined) grid.right = '10%';
    if (grid.top === undefined) grid.top = '15%';
    if (grid.bottom === undefined) grid.bottom = '15%';
    grid.containLabel = true;
  }

  /**
   * Enhance text elements for print readability
   * @param {Object} option - Chart option to modify
   * @private
   */
  enhanceTextForPrint(option) {
    const textStyle = {
      color: this.printColorScheme.text,
      fontFamily: 'Arial, sans-serif',
      fontSize: 10
    };

    // Enhance axis labels
    if (option.xAxis) {
      const xAxes = Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis];
      xAxes.forEach(axis => {
        axis.axisLabel = {
          ...axis.axisLabel,
          ...textStyle,
          fontSize: 9
        };
      });
    }

    if (option.yAxis) {
      const yAxes = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis];
      yAxes.forEach(axis => {
        axis.axisLabel = {
          ...axis.axisLabel,
          ...textStyle,
          fontSize: 9
        };
      });
    }

    // Enhance series labels
    if (option.series) {
      option.series.forEach(series => {
        if (series.label) {
          series.label.textStyle = {
            ...series.label.textStyle,
            ...textStyle,
            fontSize: 8
          };
        }
      });
    }
  }

  /**
   * Optimize grid and axes for print
   * @param {Object} option - Chart option to modify
   * @private
   */
  optimizeGridAndAxes(option) {
    const colors = this.printColorScheme;

    // Optimize x-axis
    if (option.xAxis) {
      const xAxes = Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis];
      xAxes.forEach(axis => {
        axis.axisLine = {
          ...axis.axisLine,
          lineStyle: {
            color: colors.axisLine,
            width: 1
          }
        };
        axis.axisTick = {
          ...axis.axisTick,
          lineStyle: {
            color: colors.axisLine
          }
        };
        axis.splitLine = {
          ...axis.splitLine,
          lineStyle: {
            color: colors.gridLine,
            width: 0.5,
            type: 'solid'
          }
        };
      });
    }

    // Optimize y-axis
    if (option.yAxis) {
      const yAxes = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis];
      yAxes.forEach(axis => {
        axis.axisLine = {
          ...axis.axisLine,
          lineStyle: {
            color: colors.axisLine,
            width: 1
          }
        };
        axis.axisTick = {
          ...axis.axisTick,
          lineStyle: {
            color: colors.axisLine
          }
        };
        axis.splitLine = {
          ...axis.splitLine,
          lineStyle: {
            color: colors.gridLine,
            width: 0.5,
            type: 'solid'
          }
        };
      });
    }
  }

  /**
   * Optimize chart container for print
   * @param {HTMLElement} container - Chart container element
   * @private
   */
  optimizeChartContainer(container) {
    if (!container) return;

    // Add print-specific classes
    container.classList.add('chart-print-optimized');
    
    // Set print-specific styles
    const printStyles = {
      pageBreakInside: 'avoid',
      maxWidth: '100%',
      height: 'auto',
      minHeight: '300px'
    };

    Object.assign(container.style, printStyles);
  }

  /**
   * Calculate optimal chart dimensions for print
   * @param {Object} containerDimensions - Container dimensions
   * @returns {Object} Optimized chart dimensions
   */
  optimizeChartSizes(containerDimensions) {
    const { width: inputWidth, height: inputHeight } = containerDimensions;
    
    // Calculate optimal dimensions for print (A4 paper consideration)
    const maxPrintWidth = 700; // Approximate A4 width in pixels at 96 DPI
    const maxPrintHeight = 500; // Reasonable height for charts in print
    
    // Input validation: ensure width and height are finite numbers and greater than zero
    let width = inputWidth;
    let height = inputHeight;
    
    if (!Number.isFinite(width) || width <= 0) {
      width = maxPrintWidth;
    }
    
    if (!Number.isFinite(height) || height <= 0) {
      height = maxPrintHeight;
    }
    
    // Ensure dimensions are within reasonable bounds
    width = Math.max(1, Math.min(maxPrintWidth, width));
    height = Math.max(1, Math.min(maxPrintHeight, height));
    
    let optimizedWidth = width;
    let optimizedHeight = height;
    
    // Calculate safe aspect ratio using validated non-zero dimensions
    const aspectRatio = width / height;
    
    // Maintain aspect ratio while fitting within print constraints
    if (optimizedWidth > maxPrintWidth) {
      optimizedWidth = maxPrintWidth;
      optimizedHeight = optimizedWidth / aspectRatio;
    }
    
    if (optimizedHeight > maxPrintHeight) {
      optimizedHeight = maxPrintHeight;
      optimizedWidth = optimizedHeight * aspectRatio;
    }
    
    // Final validation to ensure no invalid values
    optimizedWidth = Math.max(1, optimizedWidth);
    optimizedHeight = Math.max(1, optimizedHeight);
    
    return {
      width: Math.round(optimizedWidth),
      height: Math.round(optimizedHeight),
      aspectRatio: Number.isFinite(aspectRatio) ? aspectRatio : 1
    };
  }

  /**
   * Restore original chart states
   * @param {Array} chartInstances - Array of chart instances to restore
   */
  restoreOriginalStates(chartInstances = []) {
    try {
      chartInstances.forEach(instance => {
        const originalState = this.originalChartStates.get(instance);
        if (originalState) {
          // Restore original option using the preserved clone or reference
          try {
            // Use notMerge=true and lazyUpdate=false for complete restoration
            instance.setOption(originalState.option, {
              notMerge: true,
              lazyUpdate: false
            });
          } catch (restoreError) {
            console.warn('[ChartPrintAdapter] Error restoring chart option, trying alternative method:', restoreError);
            
            // Alternative restoration method
            try {
              instance.setOption(originalState.option, true);
            } catch (altError) {
              console.error('[ChartPrintAdapter] Both restoration methods failed:', altError);
            }
          }
          
          // Remove print-specific classes and styles
          const container = originalState.container;
          if (container) {
            container.classList.remove('chart-print-optimized');
            container.style.pageBreakInside = '';
            container.style.maxWidth = '';
            container.style.height = '';
            container.style.minHeight = '';
          }
          
          // Remove from stored states
          this.originalChartStates.delete(instance);
        }
      });
    } catch (error) {
      console.error('[ChartPrintAdapter] Error restoring original states:', error);
    }
  }

  /**
   * Get print color scheme
   * @returns {Object} Print color scheme
   */
  getPrintColorScheme() {
    return { ...this.printColorScheme };
  }

  /**
   * Check if chart instance is optimized for print
   * @param {Object} chartInstance - ECharts instance
   * @returns {boolean} True if chart is optimized for print
   */
  isChartOptimizedForPrint(chartInstance) {
    return this.originalChartStates.has(chartInstance);
  }

  /**
   * Get optimization status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      optimizedChartsCount: this.originalChartStates.size,
      hasOptimizedCharts: this.originalChartStates.size > 0,
      printColorScheme: this.printColorScheme
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.originalChartStates.clear();
  }
}

// Create a singleton instance for global use
const chartPrintAdapter = new ChartPrintAdapter();

export default chartPrintAdapter;