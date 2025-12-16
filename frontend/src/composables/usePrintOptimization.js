/**
 * Composable for chart print optimization
 * Provides print mode detection and chart optimization utilities
 */
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';

export function usePrintOptimization() {
  const isPrintMode = ref(false);
  const isPreparingForPrint = ref(false);
  
  // Performance monitoring
  const performanceMetrics = ref({
    printModeActivationTime: 0,
    chartOptimizationTime: 0,
    imageGenerationTime: 0,
    totalPrintPreparationTime: 0
  });
  
  // Simple cache for chart images to avoid regeneration
  const chartImageCache = new Map();
  
  // Performance monitoring helper
  const measurePerformance = (operation, fn) => {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    performanceMetrics.value[operation] = duration;
    console.log(`Print optimization - ${operation}: ${duration.toFixed(2)}ms`);
    
    return result;
  };

  // Print event handlers
  const handleBeforePrint = () => {
    isPrintMode.value = true;
    isPreparingForPrint.value = true;
  };

  const handleAfterPrint = () => {
    isPrintMode.value = false;
    isPreparingForPrint.value = false;
  };

  // Performance-optimized chart optimization for print with caching
  const optimizeChartForPrint = (chartInstance, originalOptions) => {
    if (!chartInstance || !originalOptions) return null;
    
    return measurePerformance('chartOptimizationTime', () => {
      // Generate cache key based on chart options
      const cacheKey = JSON.stringify({
        type: originalOptions.series?.[0]?.type || 'unknown',
        dataLength: originalOptions.series?.[0]?.data?.length || 0,
        title: originalOptions.title?.text || '',
        timestamp: Math.floor(Date.now() / 60000) // Cache for 1 minute
      });
      
      // Check cache first
      if (chartImageCache.has(cacheKey)) {
        console.log('Using cached chart image for print');
        return chartImageCache.get(cacheKey);
      }

    // Performance optimization: Use shallow merge for better performance
    const printOptions = Object.assign({}, originalOptions, {
      animation: false, // Disable animations for print performance
      backgroundColor: '#ffffff', // Ensure white background
      textStyle: {
        color: '#000000', // Ensure black text for print
        fontFamily: 'Arial, sans-serif'
      },
      // Optimize tooltip for print (disable interactive elements)
      tooltip: Object.assign({}, originalOptions.tooltip, {
        show: false // Hide tooltips in print mode for performance
      }),
      // Optimize legend for print
      legend: Object.assign({}, originalOptions.legend, {
        textStyle: {
          color: '#000000',
          fontSize: 10
        }
      }),
      // Optimize grid for print
      grid: Object.assign({}, originalOptions.grid, {
        containLabel: true,
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '10%'
      })
    });

    // Performance optimization: Apply print-specific color adjustments efficiently
    if (printOptions.series && Array.isArray(printOptions.series)) {
      printOptions.series = printOptions.series.map(series => {
        // Use Object.assign for better performance than spread operator
        const optimizedSeries = Object.assign({}, series);
        
        // Ensure high contrast colors for print
        optimizedSeries.itemStyle = Object.assign({}, series.itemStyle, {
          color: series.itemStyle?.color || '#333333',
          borderColor: '#000000',
          borderWidth: 1
        });
        
        // Optimize labels for print
        optimizedSeries.label = Object.assign({}, series.label, {
          color: '#000000',
          fontSize: 9
        });
        
        return optimizedSeries;
      });
    }

    // Apply the print-optimized options with performance considerations
    chartInstance.setOption(printOptions, true);
    
      // Performance-optimized image capture with error handling and caching
      const imageDataUrl = measurePerformance('imageGenerationTime', () => {
        try {
          const capabilities = getPrintCapabilities();
          
          // Adjust pixel ratio based on browser capabilities for optimal performance
          let pixelRatio = 2; // Default high quality
          if (capabilities.browser.name === 'safari' && parseInt(capabilities.browser.version) < 14) {
            pixelRatio = 1.5; // Reduce for older Safari versions
          } else if (capabilities.browser.name === 'firefox') {
            pixelRatio = 1.8; // Optimize for Firefox rendering
          }
          
          const imageUrl = chartInstance.getDataURL({
            pixelRatio: pixelRatio,
            backgroundColor: '#fff',
            excludeComponents: ['toolbox', 'dataZoom'] // Exclude interactive components for smaller file size
          });
          
          return imageUrl;
        } catch (error) {
          console.warn('Failed to capture chart image:', error);
          
          // Fallback: try with lower quality settings
          try {
            const fallbackImageUrl = chartInstance.getDataURL({
              pixelRatio: 1,
              backgroundColor: '#fff'
            });
            return fallbackImageUrl;
          } catch (fallbackError) {
            console.error('Chart image capture fallback also failed:', fallbackError);
            return null;
          }
        }
      });
      
      // Cache the generated image
      if (imageDataUrl) {
        chartImageCache.set(cacheKey, imageDataUrl);
        
        // Clean up old cache entries to prevent memory leaks
        if (chartImageCache.size > 10) {
          const firstKey = chartImageCache.keys().next().value;
          chartImageCache.delete(firstKey);
        }
      }
      
      return imageDataUrl;
    });
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

  // Enhanced browser compatibility detection
  const getBrowserInfo = () => {
    if (typeof window === 'undefined') return { name: 'unknown', version: 'unknown', engine: 'unknown' };
    
    const userAgent = window.navigator.userAgent;
    let browserName = 'unknown';
    let browserVersion = 'unknown';
    let engine = 'unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'chrome';
      engine = 'blink';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'firefox';
      engine = 'gecko';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'safari';
      engine = 'webkit';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Edg')) {
      browserName = 'edge';
      engine = 'blink';
      const match = userAgent.match(/Edg\/(\d+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
    
    return { name: browserName, version: browserVersion, engine };
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

  // Check browser-specific print capabilities
  const getPrintCapabilities = () => {
    const browser = getBrowserInfo();
    const capabilities = {
      supportsMediaQueries: supportsPrintMediaQueries(),
      supportsBeforeAfterPrint: typeof window !== 'undefined' && 'onbeforeprint' in window,
      supportsPageBreakInside: true, // Most modern browsers support this
      supportsColorAdjust: true, // Most modern browsers support this
      recommendedApproach: 'standard'
    };

    // Browser-specific optimizations
    switch (browser.name) {
      case 'firefox':
        // Firefox has excellent print support
        capabilities.recommendedApproach = 'standard';
        capabilities.supportsPageBreakInside = true;
        break;
      case 'chrome':
        // Chrome has good print support, but may need color-adjust
        capabilities.recommendedApproach = 'standard';
        capabilities.supportsColorAdjust = parseInt(browser.version) >= 17;
        break;
      case 'safari':
        // Safari has decent print support but may need webkit prefixes
        capabilities.recommendedApproach = 'webkit-prefixed';
        capabilities.supportsColorAdjust = parseInt(browser.version) >= 15;
        break;
      case 'edge':
        // Edge (Chromium) has good print support
        capabilities.recommendedApproach = 'standard';
        capabilities.supportsColorAdjust = true;
        break;
      default:
        // Unknown browser - use conservative approach
        capabilities.recommendedApproach = 'fallback';
        break;
    }

    return { ...capabilities, browser };
  };

  // Hoist print media query variables to outer scope to prevent memory leaks
  let printMediaQuery = null;
  let handlePrintMediaChange = null;
  let hasMediaQueryListener = false;

  // Setup print event listeners
  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeprint', handleBeforePrint);
      window.addEventListener('afterprint', handleAfterPrint);
      
      // Also listen for print media query changes
      if (supportsPrintMediaQueries()) {
        printMediaQuery = window.matchMedia('print');
        handlePrintMediaChange = (e) => {
          if (e.matches) {
            handleBeforePrint();
          } else {
            handleAfterPrint();
          }
        };
        
        printMediaQuery.addEventListener('change', handlePrintMediaChange);
        hasMediaQueryListener = true;
      }
    }
  });

  // Cleanup event listeners
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      
      // Clean up print media query listener if it was added
      if (hasMediaQueryListener && printMediaQuery && handlePrintMediaChange) {
        printMediaQuery.removeEventListener('change', handlePrintMediaChange);
        hasMediaQueryListener = false;
        printMediaQuery = null;
        handlePrintMediaChange = null;
      }
    }
  });

  // Browser-specific print optimization
  const applyBrowserSpecificOptimizations = () => {
    const capabilities = getPrintCapabilities();
    const { browser } = capabilities;

    // Apply browser-specific CSS classes for targeted styling
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add(`browser-${browser.name}`);
      document.documentElement.classList.add(`engine-${browser.engine}`);
      
      // Add print capability classes
      if (capabilities.supportsColorAdjust) {
        document.documentElement.classList.add('supports-color-adjust');
      }
      if (capabilities.supportsPageBreakInside) {
        document.documentElement.classList.add('supports-page-break');
      }
    }

    return capabilities;
  };

  // Enhanced delayed print with browser-specific timing and user guidance
  const delayedPrint = async (options = {}) => {
    const capabilities = getPrintCapabilities();
    
    // Wait for Vue to update the DOM
    await nextTick();
    
    // Browser-specific delays for optimal print rendering
    let delay = 500; // Default delay
    
    switch (capabilities.browser.name) {
      case 'firefox':
        delay = 300; // Firefox is generally faster at rendering
        break;
      case 'safari':
        delay = 800; // Safari may need more time for image rendering
        break;
      case 'chrome':
      case 'edge':
        delay = 500; // Standard delay for Chromium-based browsers
        break;
      default:
        delay = 1000; // Conservative delay for unknown browsers
        break;
    }
    
    // Apply browser-specific optimizations before printing
    applyBrowserSpecificOptimizations();
    
    // Print guidance removed per user feedback
    
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error('Print failed:', error);
        // Fallback: try again with longer delay
        setTimeout(() => {
          try {
            window.print();
          } catch (fallbackError) {
            console.error('Print fallback also failed:', fallbackError);
          }
        }, 1000);
      }
    }, delay);
  };

  // Print guidance functions removed per user feedback

  // Keyboard shortcut handler for quick print
  const setupPrintKeyboardShortcuts = () => {
    if (typeof document === 'undefined') return;

    const handleKeydown = (event) => {
      // Ctrl+Shift+P for print PDF (avoid conflict with browser's Ctrl+P)
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        delayedPrint();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  };

  // Progressive enhancement for older browsers
  const getProgressiveEnhancementFallback = () => {
    const capabilities = getPrintCapabilities();
    
    if (!capabilities.supportsMediaQueries) {
      return {
        message: 'このブラウザは印刷機能が制限されています。最新のブラウザをご利用ください。',
        recommendation: 'Chrome、Firefox、Safari、またはEdgeの最新版をお使いください。'
      };
    }
    
    if (!capabilities.supportsBeforeAfterPrint) {
      return {
        message: '印刷イベントの検出が制限されています。印刷後に手動でページを更新してください。',
        recommendation: '印刷完了後、ページを再読み込みしてください。'
      };
    }
    
    return null; // No fallback needed
  };

  return {
    isPrintMode,
    isPreparingForPrint,
    optimizeChartForPrint,
    restoreChartFromPrint,
    getPrintChartDimensions,
    supportsPrintMediaQueries,
    delayedPrint,
    // Browser compatibility functions
    getBrowserInfo,
    getPrintCapabilities,
    applyBrowserSpecificOptimizations,
    getProgressiveEnhancementFallback,
    // Performance monitoring
    performanceMetrics,
    measurePerformance
  };
}