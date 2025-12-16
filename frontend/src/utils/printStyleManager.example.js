/**
 * Example usage of PrintStyleManager
 * This file demonstrates how to use the print style management system
 * for dynamic CSS injection, layout adjustment, and print optimization
 */

import printStyleManager, { PrintStyleManager } from './printStyleManager.js';

/**
 * Example: Basic print style injection
 */
export function basicPrintStyleInjection() {
  // Configure print styles
  const printConfig = {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: '20mm',
      right: '15mm', 
      bottom: '20mm',
      left: '15mm'
    },
    hideSelectors: [
      '.no-print',
      'nav',
      '.sidebar',
      'button:not(.print-keep)'
    ],
    showSelectors: [
      '.print-only'
    ],
    customCSS: `
      .special-print-element {
        font-size: 14pt;
        font-weight: bold;
      }
    `
  };

  // Inject print styles
  const styleId = printStyleManager.injectPrintStyles(printConfig);
  console.log('Injected print styles:', styleId);

  // Later, remove the styles
  // printStyleManager.removePrintStyles(styleId);
  
  return styleId;
}

/**
 * Example: Advanced print configuration with page breaks
 */
export function advancedPrintConfiguration() {
  const config = {
    pageSize: 'Letter',
    orientation: 'landscape',
    margins: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' },
    
    // Elements to hide during print
    hideSelectors: [
      '.print-hidden',
      '.navigation',
      '.toolbar',
      '.action-buttons'
    ],
    
    // Page break rules for better layout
    pageBreakRules: [
      { selector: '.section', breakBefore: 'always' },
      { selector: '.chart-container', breakInside: 'avoid' },
      { selector: '.data-table', breakInside: 'auto' },
      { selector: '.summary-card', breakInside: 'avoid' }
    ],
    
    // Custom CSS for specific print needs
    customCSS: `
      .print-header {
        text-align: center;
        font-size: 16pt;
        margin-bottom: 20pt;
      }
      
      .print-footer {
        position: fixed;
        bottom: 0;
        width: 100%;
        text-align: center;
        font-size: 8pt;
      }
    `,
    
    includeDefaults: true
  };

  return printStyleManager.injectPrintStyles(config);
}

/**
 * Example: Layout adjustment for print media
 */
export function adjustLayoutForPrint() {
  // Adjust layout elements for print
  printStyleManager.adjustLayoutForPrintMedia({
    containerSelectors: ['.container', '.main-content', '.report-container'],
    removeFloats: true,
    stackColumns: true,
    optimizeSpacing: true
  });

  // Hide specific elements
  printStyleManager.hideElementsForPrint([
    '.sidebar',
    '.navigation',
    '.action-panel',
    '.tooltip'
  ]);

  // Show print-specific elements
  printStyleManager.showElementsForPrint([
    '.print-header',
    '.print-footer',
    '.print-watermark'
  ]);

  console.log('Layout adjusted for print');
}

/**
 * Example: Page break calculation and optimization
 */
export function optimizePageBreaks() {
  // Get all content sections
  const contentElements = document.querySelectorAll('.content-section, .chart-container, .data-table');
  
  // Calculate optimal page breaks
  const pageBreaks = printStyleManager.calculateOptimalPageBreaks(Array.from(contentElements));
  
  console.log('Calculated page breaks:', pageBreaks);
  
  // Apply page break rules based on calculations
  const pageBreakRules = pageBreaks.map(bp => ({
    selector: `.content-section:nth-child(${bp.index})`,
    breakBefore: bp.reason === 'page_overflow' ? 'always' : 'auto'
  }));
  
  printStyleManager.applyPageBreakRules(pageBreakRules);
  
  return pageBreaks;
}

/**
 * Example: Complete print workflow
 */
export async function completePrintWorkflow() {
  try {
    console.log('Starting print workflow...');
    
    // Step 1: Configure and inject print styles
    const styleId = printStyleManager.injectPrintStyles({
      pageSize: 'A4',
      orientation: 'portrait',
      hideSelectors: ['.no-print', 'nav', '.sidebar'],
      pageBreakRules: [
        { selector: '.page-section', breakBefore: 'always' },
        { selector: '.chart-container', breakInside: 'avoid' }
      ]
    });
    
    // Step 2: Adjust layout for print
    printStyleManager.adjustLayoutForPrintMedia();
    
    // Step 3: Calculate and apply optimal page breaks
    const contentElements = document.querySelectorAll('.content-block');
    const pageBreaks = printStyleManager.calculateOptimalPageBreaks(Array.from(contentElements));
    
    // Step 4: Apply additional page break rules
    printStyleManager.applyPageBreakRules([
      { selector: '.avoid-break', breakInside: 'avoid' },
      { selector: '.force-break', breakBefore: 'always' }
    ]);
    
    // Step 5: Trigger print
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow styles to apply
    window.print();
    
    // Step 6: Cleanup after print (optional - can be done in afterprint event)
    const afterPrintHandler = () => {
      printStyleManager.restoreOriginalStyles();
      printStyleManager.removePrintStyles(styleId);
      window.removeEventListener('afterprint', afterPrintHandler);
      console.log('Print workflow completed and cleaned up');
    };
    
    window.addEventListener('afterprint', afterPrintHandler);
    
  } catch (error) {
    console.error('Error in print workflow:', error);
    // Cleanup on error
    printStyleManager.restoreOriginalStyles();
    printStyleManager.removePrintStyles();
  }
}

/**
 * Example: Vue.js integration with print style manager
 */
export function usePrintStyleManager() {
  let currentStyleId = null;
  
  const activatePrintMode = (config = {}) => {
    // Default configuration for Vue components
    const defaultConfig = {
      pageSize: 'A4',
      orientation: 'portrait',
      hideSelectors: [
        '.no-print',
        '.p-button:not(.print-keep)',
        '.p-toolbar',
        '.p-sidebar',
        'nav:not(.print-keep)'
      ],
      pageBreakRules: [
        { selector: '.p-card', breakInside: 'avoid' },
        { selector: '.p-panel', breakInside: 'avoid' },
        { selector: '.chart-container', breakInside: 'avoid' }
      ],
      includeDefaults: true
    };
    
    const mergedConfig = { ...defaultConfig, ...config };
    currentStyleId = printStyleManager.injectPrintStyles(mergedConfig);
    
    // Adjust layout for print
    printStyleManager.adjustLayoutForPrintMedia({
      containerSelectors: ['.p-component', '.container', '.main-content']
    });
    
    return currentStyleId;
  };
  
  const deactivatePrintMode = () => {
    if (currentStyleId) {
      printStyleManager.removePrintStyles(currentStyleId);
      currentStyleId = null;
    }
    printStyleManager.restoreOriginalStyles();
  };
  
  const getStatus = () => {
    return printStyleManager.getStatus();
  };
  
  return {
    activatePrintMode,
    deactivatePrintMode,
    getStatus,
    manager: printStyleManager
  };
}

/**
 * Example: Custom print style manager instance
 */
export function createCustomPrintManager() {
  // Create a custom instance for specific use cases
  const customManager = new PrintStyleManager();
  
  // Configure for specific report type
  const reportStyleId = customManager.injectPrintStyles({
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: '25mm', right: '20mm', bottom: '25mm', left: '20mm' },
    
    hideSelectors: [
      '.report-sidebar',
      '.report-toolbar',
      '.interactive-elements'
    ],
    
    customCSS: `
      .report-title {
        font-size: 18pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 20pt;
        page-break-after: avoid;
      }
      
      .report-section {
        margin-bottom: 15pt;
        page-break-inside: avoid;
      }
      
      .report-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12pt;
      }
      
      .report-table th,
      .report-table td {
        border: 1px solid #000;
        padding: 6pt;
        font-size: 9pt;
      }
    `
  });
  
  return {
    manager: customManager,
    styleId: reportStyleId,
    cleanup: () => {
      customManager.destroy();
    }
  };
}

/**
 * Example: Print style manager with error handling
 */
export async function robustPrintWorkflow() {
  let styleId = null;
  
  try {
    // Check if print is supported
    if (typeof window.print !== 'function') {
      throw new Error('Print functionality not supported');
    }
    
    // Inject print styles with error handling
    styleId = printStyleManager.injectPrintStyles({
      pageSize: 'A4',
      orientation: 'portrait',
      hideSelectors: ['.no-print'],
      includeDefaults: true
    });
    
    if (!styleId) {
      throw new Error('Failed to inject print styles');
    }
    
    // Adjust layout with error handling
    printStyleManager.adjustLayoutForPrintMedia();
    
    // Get status to verify everything is working
    const status = printStyleManager.getStatus();
    console.log('Print manager status:', status);
    
    if (!status.hasInjectedStyles) {
      throw new Error('Print styles not properly injected');
    }
    
    // Trigger print
    window.print();
    
    // Setup cleanup
    const cleanup = () => {
      try {
        printStyleManager.restoreOriginalStyles();
        if (styleId) {
          printStyleManager.removePrintStyles(styleId);
        }
      } catch (cleanupError) {
        console.warn('Error during cleanup:', cleanupError);
      }
    };
    
    // Cleanup after print or on page unload
    window.addEventListener('afterprint', cleanup, { once: true });
    window.addEventListener('beforeunload', cleanup, { once: true });
    
  } catch (error) {
    console.error('Print workflow error:', error);
    
    // Emergency cleanup
    try {
      printStyleManager.restoreOriginalStyles();
      if (styleId) {
        printStyleManager.removePrintStyles(styleId);
      }
    } catch (cleanupError) {
      console.error('Error during emergency cleanup:', cleanupError);
    }
    
    // Re-throw error for handling by caller
    throw error;
  }
}

export default {
  basicPrintStyleInjection,
  advancedPrintConfiguration,
  adjustLayoutForPrint,
  optimizePageBreaks,
  completePrintWorkflow,
  usePrintStyleManager,
  createCustomPrintManager,
  robustPrintWorkflow
};