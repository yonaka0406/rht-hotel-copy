/**
 * Example usage of PrintOptimizationService
 * This file demonstrates how to integrate the print optimization service
 * with Vue components for CSS-based PDF generation
 */

import printOptimizationService from './printOptimizationService.js';

/**
 * Example integration with a Vue component's PDF download functionality
 */
export class PrintOptimizationExample {
  constructor() {
    this.service = printOptimizationService;
    this.setupFallback();
  }

  /**
   * Setup fallback callback for when print mode fails
   */
  setupFallback() {
    this.service.setFallbackCallback((reason, error) => {
      console.warn(`Print optimization failed (${reason}), falling back to backend PDF generation`, error);
      
      // Here you would call your existing backend PDF generation method
      // For example: this.generateBackendPdf();
      
      // Show user notification
      this.showUserNotification('PDFの生成方法を変更しました。しばらくお待ちください。');
    });
  }

  /**
   * Enhanced PDF download method that uses print optimization
   * @param {Object} options - Configuration options
   */
  async downloadPdfWithPrintOptimization(options = {}) {
    try {
      // Check browser compatibility first
      const compatibility = this.service.getBrowserCompatibility();
      console.log('Browser compatibility:', compatibility);

      // Configure print mode options
      const printConfig = {
        hideElements: [
          '.no-print',
          '.print-hidden', 
          'nav',
          '.navigation',
          '.sidebar',
          '.header-actions',
          'button:not(.print-keep)',
          '.p-button:not(.print-keep)'
        ],
        optimizeCharts: true,
        injectStyles: true,
        timeout: 5000,
        ...options
      };

      // Show loading state
      this.showLoadingState(true);

      // Activate print mode
      const activated = await this.service.activatePrintMode(printConfig);
      
      if (activated) {
        // Small delay to ensure styles are applied
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Trigger browser print dialog
        const printTriggered = await this.service.triggerPrint();
        
        if (!printTriggered) {
          console.warn('Print dialog could not be triggered, using fallback');
        }
      }

    } catch (error) {
      console.error('Error in print optimization workflow:', error);
      // Fallback will be automatically triggered by the service
    } finally {
      // Hide loading state
      this.showLoadingState(false);
    }
  }

  /**
   * Simple print method for components that just need basic print functionality
   */
  async simplePrint() {
    try {
      // Check if browser supports print
      if (!this.service.checkBrowserPrintSupport()) {
        console.warn('Browser does not support print, using fallback');
        return;
      }

      // Activate with minimal configuration
      await this.service.activatePrintMode({
        hideElements: ['.no-print'],
        optimizeCharts: false,
        injectStyles: true
      });

      // Trigger print
      await this.service.triggerPrint();

    } catch (error) {
      console.error('Simple print failed:', error);
    }
  }

  /**
   * Get service status for debugging
   */
  getServiceStatus() {
    return this.service.getStatus();
  }

  /**
   * Manually deactivate print mode (usually not needed as it's automatic)
   */
  deactivatePrintMode() {
    this.service.deactivatePrintMode();
  }

  /**
   * Show loading state to user
   * @param {boolean} isLoading - Whether to show loading state
   */
  showLoadingState(isLoading) {
    // Implementation depends on your UI framework
    // For example, with a reactive loading state:
    // this.isDownloadingPdf = isLoading;
    
    console.log(`Loading state: ${isLoading ? 'ON' : 'OFF'}`);
  }

  /**
   * Show notification to user
   * @param {string} message - Message to display
   */
  showUserNotification(message) {
    // Implementation depends on your notification system
    // For example, with PrimeVue Toast:
    // this.$toast.add({ severity: 'info', summary: 'PDF生成', detail: message });
    
    console.log(`Notification: ${message}`);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.service.destroy();
  }
}

/**
 * Vue 3 Composition API example
 */
export function usePrintOptimization() {
  const service = printOptimizationService;
  
  // Setup fallback
  service.setFallbackCallback((reason, error) => {
    console.warn(`Print failed (${reason}), using backend fallback`, error);
    // Call your existing backend PDF method here
  });

  const downloadPdf = async (options = {}) => {
    try {
      const activated = await service.activatePrintMode(options);
      if (activated) {
        await service.triggerPrint();
      }
    } catch (error) {
      console.error('Print optimization error:', error);
    }
  };

  const getCompatibility = () => service.getBrowserCompatibility();
  const getStatus = () => service.getStatus();

  return {
    downloadPdf,
    getCompatibility,
    getStatus,
    service
  };
}

/**
 * Integration example for ReportingSingleMonthAllHotels component
 */
export function integrateWithReportingComponent() {
  return {
    // Replace the existing downloadPdf method with this enhanced version
    async downloadPdf() {
      const printExample = new PrintOptimizationExample();
      
      // Configure for reporting component
      await printExample.downloadPdfWithPrintOptimization({
        hideElements: [
          '.no-print',
          '.print-hidden',
          'nav',
          '.navigation', 
          '.sidebar',
          '.header-actions',
          'button:not(.print-keep)',
          '.p-button:not(.print-keep)',
          '.p-selectbutton' // Hide view selector
        ],
        optimizeCharts: true,
        injectStyles: true
      });
    }
  };
}

export default PrintOptimizationExample;