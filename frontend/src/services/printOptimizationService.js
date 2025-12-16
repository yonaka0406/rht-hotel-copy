/**
 * Print Optimization Service
 * Manages print mode lifecycle, browser compatibility detection, and print API support
 * Provides fallback mechanisms for CSS-based PDF generation
 */
export class PrintOptimizationService {
  constructor() {
    this.isPrintModeActive = false;
    this.printStylesInjected = false;
    this.originalStyles = new Map();
    this.printEventListeners = new Map();
    this.fallbackCallback = null;
    
    // Initialize browser compatibility detection
    this.browserSupport = this.detectBrowserSupport();
  }

  /**
   * Detect browser print API support and compatibility
   * @returns {Object} Browser support information
   */
  detectBrowserSupport() {
    const support = {
      printAPI: false,
      printMediaQueries: false,
      cssPageBreak: false,
      browserName: 'unknown',
      version: 'unknown',
      isSupported: false
    };

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return support;
      }

      // Detect browser print API support
      support.printAPI = typeof window.print === 'function';

      // Test print media query support
      if (window.matchMedia) {
        try {
          const printMediaQuery = window.matchMedia('print');
          support.printMediaQueries = printMediaQuery instanceof MediaQueryList;
        } catch (e) {
          support.printMediaQueries = false;
        }
      }

      // Test CSS page-break support
      const testElement = document.createElement('div');
      testElement.style.pageBreakBefore = 'always';
      support.cssPageBreak = testElement.style.pageBreakBefore === 'always';

      // Detect browser name and version
      const userAgent = navigator.userAgent;
      if (userAgent.includes('Chrome')) {
        support.browserName = 'chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        support.version = match ? match[1] : 'unknown';
      } else if (userAgent.includes('Firefox')) {
        support.browserName = 'firefox';
        const match = userAgent.match(/Firefox\/(\d+)/);
        support.version = match ? match[1] : 'unknown';
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        support.browserName = 'safari';
        const match = userAgent.match(/Version\/(\d+)/);
        support.version = match ? match[1] : 'unknown';
      } else if (userAgent.includes('Edge')) {
        support.browserName = 'edge';
        const match = userAgent.match(/Edge\/(\d+)/);
        support.version = match ? match[1] : 'unknown';
      }

      // Determine overall support
      support.isSupported = support.printAPI && support.printMediaQueries && support.cssPageBreak;

    } catch (error) {
      console.warn('[PrintOptimizationService] Error detecting browser support:', error);
    }

    return support;
  }

  /**
   * Check if browser supports print functionality
   * @returns {boolean} True if browser supports print features
   */
  checkBrowserPrintSupport() {
    return this.browserSupport.isSupported;
  }

  /**
   * Get browser compatibility information
   * @returns {Object} Browser support details
   */
  getBrowserCompatibility() {
    return { ...this.browserSupport };
  }

  /**
   * Set fallback callback for when print mode fails
   * @param {Function} callback - Function to call when fallback is needed
   */
  setFallbackCallback(callback) {
    if (typeof callback === 'function') {
      this.fallbackCallback = callback;
    } else {
      throw new Error('Fallback callback must be a function');
    }
  }

  /**
   * Activate print mode with optimizations
   * @param {Object} options - Print mode configuration options
   * @returns {Promise<boolean>} True if print mode activated successfully
   */
  async activatePrintMode(options = {}) {
    try {
      // Check if already in print mode
      if (this.isPrintModeActive) {
        console.warn('[PrintOptimizationService] Print mode already active');
        return true;
      }

      // Validate browser support
      if (!this.checkBrowserPrintSupport()) {
        console.warn('[PrintOptimizationService] Browser does not support print features, using fallback');
        return this.handleFallback('browser_unsupported');
      }

      // Default options
      const config = {
        hideElements: options.hideElements || ['.no-print', '.print-hidden'],
        optimizeCharts: options.optimizeCharts !== false,
        injectStyles: options.injectStyles !== false,
        timeout: options.timeout || 5000,
        ...options
      };

      // Store original state for restoration
      this.storeOriginalState();

      // Inject print-specific styles if requested
      if (config.injectStyles) {
        this.injectPrintStyles(config);
      }

      // Hide elements that shouldn't be printed
      this.hideElementsForPrint(config.hideElements);

      // Optimize charts for print if requested
      if (config.optimizeCharts) {
        await this.optimizeChartsForPrint();
      }

      // Set up print event listeners
      this.setupPrintEventListeners();

      // Mark print mode as active
      this.isPrintModeActive = true;

      console.log('[PrintOptimizationService] Print mode activated successfully');
      return true;

    } catch (error) {
      console.error('[PrintOptimizationService] Error activating print mode:', error);
      return this.handleFallback('activation_error', error);
    }
  }

  /**
   * Deactivate print mode and restore original state
   */
  deactivatePrintMode() {
    try {
      if (!this.isPrintModeActive) {
        return;
      }

      // Remove print event listeners
      this.removePrintEventListeners();

      // Remove injected print styles
      this.removePrintStyles();

      // Restore original element visibility
      this.restoreOriginalState();

      // Mark print mode as inactive
      this.isPrintModeActive = false;
      this.printStylesInjected = false;

      console.log('[PrintOptimizationService] Print mode deactivated');

    } catch (error) {
      console.error('[PrintOptimizationService] Error deactivating print mode:', error);
    }
  }

  /**
   * Store original state for restoration
   * @private
   */
  storeOriginalState() {
    this.originalStyles.clear();
    
    // Store original display styles of elements that might be hidden
    const elementsToCheck = document.querySelectorAll('*');
    elementsToCheck.forEach(element => {
      if (element.style.display) {
        this.originalStyles.set(element, {
          display: element.style.display,
          visibility: element.style.visibility
        });
      }
    });
  }

  /**
   * Restore original state
   * @private
   */
  restoreOriginalState() {
    this.originalStyles.forEach((styles, element) => {
      if (element && element.style) {
        element.style.display = styles.display || '';
        element.style.visibility = styles.visibility || '';
      }
    });
    this.originalStyles.clear();
  }

  /**
   * Inject print-specific CSS styles
   * @param {Object} config - Print configuration
   * @private
   */
  injectPrintStyles(config) {
    if (this.printStylesInjected) {
      return;
    }

    const printStyles = `
      @media print {
        /* Hide elements that shouldn't be printed */
        .no-print,
        .print-hidden,
        nav,
        .navigation,
        .sidebar,
        .header-actions,
        .footer,
        button:not(.print-keep),
        .p-button:not(.print-keep) {
          display: none !important;
        }

        /* Optimize page layout for print */
        body {
          margin: 0;
          padding: 20px;
          font-size: 12pt;
          line-height: 1.4;
          color: black;
          background: white;
        }

        /* Ensure content fits on page */
        .print-container {
          width: 100%;
          max-width: none;
          margin: 0;
          padding: 0;
        }

        /* Chart optimizations */
        .chart-container,
        .echarts-container,
        canvas {
          max-width: 100% !important;
          height: auto !important;
          page-break-inside: avoid;
        }

        /* Table optimizations */
        table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
        }

        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }

        /* Card and panel optimizations */
        .p-card,
        .p-panel {
          border: 1px solid #ddd;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }

        /* Typography optimizations */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
          margin-top: 0;
        }

        /* Ensure proper page breaks */
        .page-break-before {
          page-break-before: always;
        }

        .page-break-after {
          page-break-after: always;
        }

        .no-page-break {
          page-break-inside: avoid;
        }
      }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = 'print-optimization-styles';
    styleElement.textContent = printStyles;
    document.head.appendChild(styleElement);

    this.printStylesInjected = true;
  }

  /**
   * Remove injected print styles
   * @private
   */
  removePrintStyles() {
    const styleElement = document.getElementById('print-optimization-styles');
    if (styleElement) {
      styleElement.remove();
    }
    this.printStylesInjected = false;
  }

  /**
   * Hide elements that shouldn't be printed
   * @param {Array} selectors - CSS selectors for elements to hide
   * @private
   */
  hideElementsForPrint(selectors) {
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          // Store original style if not already stored
          if (!this.originalStyles.has(element)) {
            this.originalStyles.set(element, {
              display: element.style.display || '',
              visibility: element.style.visibility || ''
            });
          }
          element.style.display = 'none';
        });
      } catch (error) {
        console.warn(`[PrintOptimizationService] Invalid selector: ${selector}`, error);
      }
    });
  }

  /**
   * Optimize charts for print rendering
   * @private
   */
  async optimizeChartsForPrint() {
    try {
      // Find all ECharts instances
      const chartContainers = document.querySelectorAll('.echarts-container, [_echarts_instance_]');
      
      chartContainers.forEach(container => {
        try {
          // Get ECharts instance if available
          const instance = container._echarts_instance_ || 
                          (window.echarts && window.echarts.getInstanceByDom(container));
          
          if (instance) {
            // Disable animations for print
            const currentOption = instance.getOption();
            if (currentOption) {
              const printOption = {
                ...currentOption,
                animation: false,
                animationDuration: 0,
                animationEasing: 'linear'
              };
              instance.setOption(printOption, false);
            }
          }

          // Add print-specific classes
          container.classList.add('chart-print-optimized');
          
        } catch (error) {
          console.warn('[PrintOptimizationService] Error optimizing chart:', error);
        }
      });

    } catch (error) {
      console.warn('[PrintOptimizationService] Error in chart optimization:', error);
    }
  }

  /**
   * Set up print event listeners
   * @private
   */
  setupPrintEventListeners() {
    const beforePrintHandler = () => {
      console.log('[PrintOptimizationService] Before print event triggered');
      // Additional optimizations can be added here
    };

    const afterPrintHandler = () => {
      console.log('[PrintOptimizationService] After print event triggered');
      // Automatically deactivate print mode after printing
      this.deactivatePrintMode();
    };

    // Store listeners for cleanup
    this.printEventListeners.set('beforeprint', beforePrintHandler);
    this.printEventListeners.set('afterprint', afterPrintHandler);

    // Add event listeners
    window.addEventListener('beforeprint', beforePrintHandler);
    window.addEventListener('afterprint', afterPrintHandler);
  }

  /**
   * Remove print event listeners
   * @private
   */
  removePrintEventListeners() {
    this.printEventListeners.forEach((handler, event) => {
      window.removeEventListener(event, handler);
    });
    this.printEventListeners.clear();
  }

  /**
   * Handle fallback scenarios
   * @param {string} reason - Reason for fallback
   * @param {Error} error - Optional error object
   * @returns {boolean} False to indicate fallback was used
   * @private
   */
  handleFallback(reason, error = null) {
    console.warn(`[PrintOptimizationService] Using fallback due to: ${reason}`, error);
    
    if (this.fallbackCallback) {
      try {
        this.fallbackCallback(reason, error);
      } catch (fallbackError) {
        console.error('[PrintOptimizationService] Error in fallback callback:', fallbackError);
      }
    }
    
    return false;
  }

  /**
   * Trigger browser print dialog
   * @returns {Promise<boolean>} True if print dialog was triggered successfully
   */
  async triggerPrint() {
    try {
      if (!this.checkBrowserPrintSupport()) {
        return this.handleFallback('print_not_supported');
      }

      // Trigger browser print dialog
      window.print();
      return true;

    } catch (error) {
      console.error('[PrintOptimizationService] Error triggering print:', error);
      return this.handleFallback('print_trigger_error', error);
    }
  }

  /**
   * Get current print mode status
   * @returns {Object} Print mode status information
   */
  getStatus() {
    return {
      isPrintModeActive: this.isPrintModeActive,
      printStylesInjected: this.printStylesInjected,
      browserSupport: this.browserSupport,
      hasFallbackCallback: typeof this.fallbackCallback === 'function'
    };
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    this.deactivatePrintMode();
    this.removePrintEventListeners();
    this.originalStyles.clear();
    this.fallbackCallback = null;
  }
}

// Create a singleton instance for global use
const printOptimizationService = new PrintOptimizationService();

export default printOptimizationService;