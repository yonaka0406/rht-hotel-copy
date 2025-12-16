/**
 * Composable for chart print optimization
 * Provides print mode detection and chart optimization utilities
 */
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

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

  // Chart optimization for print - capture as static image
  const optimizeChartForPrint = (chartInstance, originalOptions) => {
    if (!chartInstance || !originalOptions) return null;

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
      // Optimize grid for print
      grid: {
        ...originalOptions.grid,
        containLabel: true,
        left: '5%',
        right: '5%',
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
        // Optimize labels for print
        label: {
          ...series.label,
          color: '#000000',
          fontSize: 9
        }
      }));
    }

    // Apply the print-optimized options
    chartInstance.setOption(printOptions, true);
    
    // Capture chart as static image for print
    try {
      const imageDataUrl = chartInstance.getDataURL({
        pixelRatio: 2,
        backgroundColor: '#fff'
      });
      return imageDataUrl;
    } catch (error) {
      console.warn('Failed to capture chart image:', error);
      return null;
    }
  };

  // Restore original chart options after print
  const restoreChartFromPrint = (chartInstance, originalOptions) => {
    if (!chartInstance || !originalOptions) return;
    
    chartInstance.setOption(originalOptions, true);
    chartInstance.resize();
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

  // Delay printing until images are ready
  const delayedPrint = async () => {
    // Wait for Vue to update the DOM
    await nextTick();
    // Additional delay to ensure images are captured and rendered
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return {
    isPrintMode,
    isPreparingForPrint,
    optimizeChartForPrint,
    restoreChartFromPrint,
    getPrintChartDimensions,
    supportsPrintMediaQueries,
    delayedPrint
  };
}