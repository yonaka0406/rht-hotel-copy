/**
 * Composable for chart print optimization
 * Provides print mode detection and chart optimization utilities
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function usePrintOptimization() {
  const isPrintMode = ref(false);
  const isPreparingForPrint = ref(false);

  // Print event handlers
  const handleBeforePrint = () => {
    isPrintMode.value = true;
    isPreparingForPrint.value = true;
  };

  const handleAfterPrint = () => {
    isPrintMode.value = false;
    isPreparingForPrint.value = false;
  };

  // Chart optimization for print
  const optimizeChartForPrint = (chartInstance, originalOptions) => {
    if (!chartInstance || !originalOptions) return;

    // Force a resize first to ensure proper dimensions
    setTimeout(() => {
      chartInstance.resize();
    }, 100);

    // Create print-optimized options
    const printOptions = {
      ...originalOptions,
      animation: false, // Disable animations for print
      backgroundColor: '#ffffff', // Ensure white background
      textStyle: {
        color: '#000000', // Ensure black text for print
        fontFamily: 'Arial, sans-serif'
      },
      // Optimize tooltip for print (disable interactive elements)
      tooltip: {
        ...originalOptions.tooltip,
        show: false // Hide tooltips in print mode
      },
      // Optimize legend for print
      legend: {
        ...originalOptions.legend,
        textStyle: {
          color: '#000000',
          fontSize: 10
        }
      },
      // Optimize grid for print to use full width
      grid: {
        ...originalOptions.grid,
        containLabel: true,
        left: '3%',
        right: '3%',
        top: '10%',
        bottom: '10%'
      }
    };

    // Apply print-specific color adjustments
    if (printOptions.series) {
      printOptions.series = printOptions.series.map(series => ({
        ...series,
        // Ensure high contrast colors for print
        itemStyle: {
          ...series.itemStyle,
          color: series.itemStyle?.color || '#333333',
          borderColor: '#000000',
          borderWidth: 1
        },
        // Optimize labels for print with better sizing
        label: {
          ...series.label,
          color: '#000000',
          fontSize: 8,
          fontWeight: 'normal'
        }
      }));
    }

    // Apply the print-optimized options
    chartInstance.setOption(printOptions, true);
    
    // Force multiple resizes to ensure proper rendering
    setTimeout(() => {
      chartInstance.resize();
    }, 200);
    
    setTimeout(() => {
      chartInstance.resize();
    }, 500);
  };

  // Restore original chart options after print
  const restoreChartFromPrint = (chartInstance, originalOptions) => {
    if (!chartInstance || !originalOptions) return;
    
    chartInstance.setOption(originalOptions, true);
    
    // Force multiple resizes to ensure proper restoration
    setTimeout(() => {
      chartInstance.resize();
    }, 100);
    
    setTimeout(() => {
      chartInstance.resize();
    }, 300);
  };

  // Get print-friendly chart dimensions
  const getPrintChartDimensions = (defaultHeight = '450px') => {
    if (isPrintMode.value) {
      // Optimize dimensions for print - use height that allows charts to stack vertically
      return {
        height: '650px', // Height that allows both charts to fit when stacked
        width: '100%'
      };
    }
    return {
      height: defaultHeight,
      width: '100%'
    };
  };

  // Check if browser supports print media queries
  const supportsPrintMediaQueries = () => {
    if (typeof window === 'undefined') return false;
    
    try {
      return window.matchMedia && window.matchMedia('print').matches !== undefined;
    } catch (error) {
      console.warn('Print media query support detection failed:', error);
      return false;
    }
  };

  // Setup print event listeners
  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);
      
      // Also listen for print media query changes
      if (supportsPrintMediaQueries()) {
        const printMediaQuery = window.matchMedia('print');
        const handlePrintMediaChange = (e) => {
          if (e.matches) {
            handleBeforePrint();
          } else {
            handleAfterPrint();
          }
        };
        
        printMediaQuery.addEventListener('change', handlePrintMediaChange);
        
        // Cleanup function will be called in onBeforeUnmount
        return () => {
          printMediaQuery.removeEventListener('change', handlePrintMediaChange);
        };
      }
    }
  });

  // Cleanup event listeners
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    }
  });

  // Force chart resize to fix proportions
  const forceChartResize = (chartInstance) => {
    if (!chartInstance) return;
    
    // Multiple resize attempts with different timings to ensure proper rendering
    const resizeAttempts = [50, 100, 200, 500];
    resizeAttempts.forEach(delay => {
      setTimeout(() => {
        if (chartInstance && !chartInstance.isDisposed?.()) {
          chartInstance.resize();
        }
      }, delay);
    });
  };

  return {
    isPrintMode,
    isPreparingForPrint,
    optimizeChartForPrint,
    restoreChartFromPrint,
    getPrintChartDimensions,
    supportsPrintMediaQueries,
    forceChartResize
  };
}