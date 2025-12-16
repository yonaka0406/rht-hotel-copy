/**
 * Print Style Manager
 * Manages dynamic CSS style injection and removal for print optimization
 * Handles print media query CSS generation, page breaks, and layout adjustments
 */
export class PrintStyleManager {
  constructor() {
    this.injectedStyles = new Map();
    this.originalStyles = new Map();
    this.pageBreakElements = new Set();
    this.hiddenElements = new Set();
    this.styleCounter = 0;
  }

  /**
   * Inject print-specific CSS styles
   * @param {Object} styles - Print styles configuration
   * @returns {string} Style ID for later removal
   */
  injectPrintStyles(styles) {
    const styleId = `print-styles-${++this.styleCounter}`;
    
    try {
      // Generate CSS from configuration
      const cssText = this.generatePrintCSS(styles);
      
      // Create and inject style element
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = cssText;
      document.head.appendChild(styleElement);
      
      // Store reference for later removal
      this.injectedStyles.set(styleId, styleElement);
      
      console.log(`[PrintStyleManager] Injected print styles: ${styleId}`);
      return styleId;
      
    } catch (error) {
      console.error('[PrintStyleManager] Error injecting print styles:', error);
      return null;
    }
  }

  /**
   * Remove injected print styles
   * @param {string} styleId - Style ID to remove (optional, removes all if not provided)
   */
  removePrintStyles(styleId = null) {
    try {
      if (styleId) {
        // Remove specific style
        const styleElement = this.injectedStyles.get(styleId);
        if (styleElement && styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement);
          this.injectedStyles.delete(styleId);
          console.log(`[PrintStyleManager] Removed print styles: ${styleId}`);
        }
      } else {
        // Remove all injected styles
        this.injectedStyles.forEach((styleElement, id) => {
          if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
          }
        });
        this.injectedStyles.clear();
        console.log('[PrintStyleManager] Removed all print styles');
      }
    } catch (error) {
      console.error('[PrintStyleManager] Error removing print styles:', error);
    }
  }

  /**
   * Generate print CSS from configuration
   * @param {Object} config - Print styles configuration
   * @returns {string} Generated CSS text
   * @private
   */
  generatePrintCSS(config) {
    const {
      pageSize = 'A4',
      orientation = 'portrait',
      margins = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      hideSelectors = [],
      showSelectors = [],
      pageBreakRules = [],
      customCSS = '',
      includeDefaults = true
    } = config;

    let css = '@media print {\n';

    // Page setup
    css += this.generatePageSetupCSS(pageSize, orientation, margins);

    // Default print styles
    if (includeDefaults) {
      css += this.generateDefaultPrintCSS();
    }

    // Hide/show elements
    css += this.generateVisibilityCSS(hideSelectors, showSelectors);

    // Page break rules
    css += this.generatePageBreakCSS(pageBreakRules);

    // Chart-specific styles
    css += this.generateChartPrintCSS();

    // Table-specific styles
    css += this.generateTablePrintCSS();

    // Layout optimization styles
    css += this.generateLayoutOptimizationCSS();

    // Custom CSS
    if (customCSS) {
      css += `\n  /* Custom CSS */\n  ${customCSS}\n`;
    }

    css += '}\n';

    return css;
  }

  /**
   * Generate page setup CSS
   * @param {string} pageSize - Page size (A4, Letter, etc.)
   * @param {string} orientation - Page orientation
   * @param {Object} margins - Page margins
   * @returns {string} Page setup CSS
   * @private
   */
  generatePageSetupCSS(pageSize, orientation, margins) {
    return `
  /* Page Setup */
  @page {
    size: ${pageSize} ${orientation};
    margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
  }

  html, body {
    width: 100%;
    height: auto;
    margin: 0;
    padding: 0;
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }
`;
  }

  /**
   * Generate default print styles
   * @returns {string} Default print CSS
   * @private
   */
  generateDefaultPrintCSS() {
    return `
  /* Default Print Styles */
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.4;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    margin-top: 0;
    font-weight: bold;
    color: #000;
  }

  h1 { font-size: 18pt; margin-bottom: 12pt; }
  h2 { font-size: 16pt; margin-bottom: 10pt; }
  h3 { font-size: 14pt; margin-bottom: 8pt; }
  h4 { font-size: 12pt; margin-bottom: 6pt; }
  h5 { font-size: 11pt; margin-bottom: 4pt; }
  h6 { font-size: 10pt; margin-bottom: 4pt; }

  p {
    margin: 0 0 6pt 0;
    orphans: 3;
    widows: 3;
  }

  /* Links */
  a {
    color: #000;
    text-decoration: underline;
  }

  a[href]:after {
    content: " (" attr(href) ")";
    font-size: 9pt;
    color: #666;
  }

  /* Images */
  img {
    max-width: 100% !important;
    height: auto !important;
    page-break-inside: avoid;
  }
`;
  }

  /**
   * Generate visibility CSS for hiding/showing elements
   * @param {Array} hideSelectors - Selectors for elements to hide
   * @param {Array} showSelectors - Selectors for elements to show
   * @returns {string} Visibility CSS
   * @private
   */
  generateVisibilityCSS(hideSelectors, showSelectors) {
    let css = '\n  /* Element Visibility */\n';

    // Default elements to hide
    const defaultHideSelectors = [
      '.no-print',
      '.print-hidden',
      'nav:not(.print-keep)',
      '.navigation:not(.print-keep)',
      '.sidebar:not(.print-keep)',
      '.header-actions:not(.print-keep)',
      '.footer:not(.print-keep)',
      'button:not(.print-keep)',
      '.p-button:not(.print-keep)',
      '.p-selectbutton:not(.print-keep)',
      '.p-toolbar:not(.print-keep)',
      '.scroll-indicator',
      '.tooltip',
      '.dropdown-menu',
      '.modal-backdrop'
    ];

    // Combine with custom hide selectors
    const allHideSelectors = [...defaultHideSelectors, ...hideSelectors];

    // Generate hide rules
    if (allHideSelectors.length > 0) {
      css += `  ${allHideSelectors.join(',\n  ')} {\n    display: none !important;\n  }\n`;
    }

    // Generate show rules
    if (showSelectors.length > 0) {
      css += `\n  ${showSelectors.join(',\n  ')} {\n    display: block !important;\n  }\n`;
    }

    return css;
  }

  /**
   * Generate page break CSS rules
   * @param {Array} pageBreakRules - Page break configuration
   * @returns {string} Page break CSS
   * @private
   */
  generatePageBreakCSS(pageBreakRules) {
    let css = '\n  /* Page Break Rules */\n';

    // Default page break rules
    const defaultRules = [
      { selector: '.page-break-before', breakBefore: 'always' },
      { selector: '.page-break-after', breakAfter: 'always' },
      { selector: '.no-page-break', breakInside: 'avoid' },
      { selector: '.p-card', breakInside: 'avoid' },
      { selector: '.p-panel', breakInside: 'avoid' },
      { selector: '.chart-container', breakInside: 'avoid' },
      { selector: '.table-container', breakInside: 'auto' },
      { selector: 'tr', breakInside: 'avoid', breakAfter: 'auto' },
      { selector: 'thead', breakAfter: 'avoid' },
      { selector: 'tfoot', breakBefore: 'avoid' }
    ];

    // Combine with custom rules
    const allRules = [...defaultRules, ...pageBreakRules];

    // Generate CSS for each rule
    allRules.forEach(rule => {
      const { selector, breakBefore, breakAfter, breakInside } = rule;
      css += `  ${selector} {\n`;
      
      if (breakBefore) css += `    page-break-before: ${breakBefore};\n`;
      if (breakAfter) css += `    page-break-after: ${breakAfter};\n`;
      if (breakInside) css += `    page-break-inside: ${breakInside};\n`;
      
      css += '  }\n';
    });

    return css;
  }

  /**
   * Generate chart-specific print CSS
   * @returns {string} Chart print CSS
   * @private
   */
  generateChartPrintCSS() {
    return `
  /* Chart Print Styles */
  .chart-container,
  .echarts-container,
  .chart-print-optimized {
    max-width: 100% !important;
    height: auto !important;
    page-break-inside: avoid;
    margin-bottom: 12pt;
  }

  canvas {
    max-width: 100% !important;
    height: auto !important;
  }

  .chart-title {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 6pt;
    color: #000;
  }

  .chart-legend {
    font-size: 9pt;
    margin-top: 6pt;
  }
`;
  }

  /**
   * Generate table-specific print CSS
   * @returns {string} Table print CSS
   * @private
   */
  generateTablePrintCSS() {
    return `
  /* Table Print Styles */
  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
    margin-bottom: 12pt;
    font-size: 10pt;
  }

  th, td {
    border: 1px solid #000;
    padding: 4pt 6pt;
    text-align: left;
    vertical-align: top;
  }

  th {
    background-color: #f0f0f0 !important;
    font-weight: bold;
    page-break-after: avoid;
  }

  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  thead {
    display: table-header-group;
    page-break-after: avoid;
  }

  tfoot {
    display: table-footer-group;
    page-break-before: avoid;
  }

  tbody {
    display: table-row-group;
  }

  .p-datatable .p-datatable-thead > tr > th {
    background-color: #f0f0f0 !important;
    border: 1px solid #000 !important;
  }

  .p-datatable .p-datatable-tbody > tr > td {
    border: 1px solid #000 !important;
  }
`;
  }

  /**
   * Generate layout optimization CSS
   * @returns {string} Layout optimization CSS
   * @private
   */
  generateLayoutOptimizationCSS() {
    return `
  /* Layout Optimization */
  .print-container,
  .container,
  .main-content {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    float: none !important;
  }

  .flex, .d-flex {
    display: block !important;
  }

  .grid, .p-grid {
    display: block !important;
  }

  .col, .p-col, [class*="col-"] {
    width: 100% !important;
    float: none !important;
    margin: 0 !important;
    padding: 0 0 12pt 0 !important;
  }

  /* Card and Panel Styles */
  .p-card, .card {
    border: 1px solid #ddd !important;
    margin-bottom: 12pt !important;
    page-break-inside: avoid;
    box-shadow: none !important;
  }

  .p-card-header, .card-header {
    background-color: #f8f9fa !important;
    border-bottom: 1px solid #ddd !important;
    padding: 8pt !important;
    font-weight: bold;
  }

  .p-card-content, .card-body {
    padding: 8pt !important;
  }

  .p-panel {
    border: 1px solid #ddd !important;
    margin-bottom: 12pt !important;
    page-break-inside: avoid;
  }

  .p-panel-header {
    background-color: #f8f9fa !important;
    border-bottom: 1px solid #ddd !important;
    padding: 8pt !important;
    font-weight: bold;
  }

  .p-panel-content {
    padding: 8pt !important;
  }
`;
  }

  /**
   * Calculate optimal page breaks for content
   * @param {Array} contentElements - Array of DOM elements
   * @returns {Array} Page break points
   */
  calculateOptimalPageBreaks(contentElements) {
    try {
      const pageBreakPoints = [];
      const pageHeight = this.getPageHeight();
      let currentHeight = 0;
      
      contentElements.forEach((element, index) => {
        if (!element) return;
        
        const elementHeight = this.getElementHeight(element);
        const nextHeight = currentHeight + elementHeight;
        
        // Check if element would overflow page
        if (nextHeight > pageHeight && currentHeight > 0) {
          pageBreakPoints.push({
            index: index,
            element: element,
            reason: 'page_overflow',
            currentHeight: currentHeight,
            elementHeight: elementHeight
          });
          currentHeight = elementHeight;
        } else {
          currentHeight = nextHeight;
        }
        
        // Check for natural break points
        if (this.isNaturalBreakPoint(element)) {
          pageBreakPoints.push({
            index: index + 1,
            element: element,
            reason: 'natural_break',
            currentHeight: currentHeight
          });
        }
      });
      
      return pageBreakPoints;
      
    } catch (error) {
      console.error('[PrintStyleManager] Error calculating page breaks:', error);
      return [];
    }
  }

  /**
   * Get estimated page height for calculations
   * @returns {number} Page height in pixels
   * @private
   */
  getPageHeight() {
    // Approximate A4 page height minus margins (in pixels at 96 DPI)
    return 1056 - 150; // ~906px usable height
  }

  /**
   * Get element height including margins
   * @param {HTMLElement} element - DOM element
   * @returns {number} Element height in pixels
   * @private
   */
  getElementHeight(element) {
    try {
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      const marginTop = parseFloat(styles.marginTop) || 0;
      const marginBottom = parseFloat(styles.marginBottom) || 0;
      
      return rect.height + marginTop + marginBottom;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if element is a natural break point
   * @param {HTMLElement} element - DOM element
   * @returns {boolean} True if natural break point
   * @private
   */
  isNaturalBreakPoint(element) {
    const naturalBreakTags = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR'];
    const naturalBreakClasses = ['section-break', 'chapter-break', 'page-break'];
    
    return naturalBreakTags.includes(element.tagName) ||
           naturalBreakClasses.some(cls => element.classList.contains(cls));
  }

  /**
   * Adjust layout for print media
   * @param {Object} options - Layout adjustment options
   */
  adjustLayoutForPrintMedia(options = {}) {
    const {
      containerSelectors = ['.container', '.main-content', '.print-container'],
      removeFloats = true,
      stackColumns = true,
      optimizeSpacing = true
    } = options;

    try {
      // Store original styles for restoration
      const elementsToAdjust = [];
      
      containerSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          elementsToAdjust.push(element);
          this.storeOriginalStyles(element);
        });
      });

      // Apply print layout adjustments
      elementsToAdjust.forEach(element => {
        this.applyPrintLayoutStyles(element, {
          removeFloats,
          stackColumns,
          optimizeSpacing
        });
      });

      console.log(`[PrintStyleManager] Adjusted layout for ${elementsToAdjust.length} elements`);
      
    } catch (error) {
      console.error('[PrintStyleManager] Error adjusting layout:', error);
    }
  }

  /**
   * Store original styles for later restoration
   * @param {HTMLElement} element - DOM element
   * @private
   */
  storeOriginalStyles(element) {
    if (this.originalStyles.has(element)) return;
    
    const originalStyle = {
      width: element.style.width,
      maxWidth: element.style.maxWidth,
      float: element.style.float,
      display: element.style.display,
      margin: element.style.margin,
      padding: element.style.padding
    };
    
    this.originalStyles.set(element, originalStyle);
  }

  /**
   * Apply print layout styles to element
   * @param {HTMLElement} element - DOM element
   * @param {Object} options - Layout options
   * @private
   */
  applyPrintLayoutStyles(element, options) {
    const { removeFloats, stackColumns, optimizeSpacing } = options;
    
    // Remove floats
    if (removeFloats) {
      element.style.float = 'none';
    }
    
    // Stack columns
    if (stackColumns && element.classList.contains('col')) {
      element.style.width = '100%';
      element.style.display = 'block';
    }
    
    // Optimize spacing
    if (optimizeSpacing) {
      element.style.margin = '0';
      element.style.padding = '0';
    }
    
    // Ensure full width
    element.style.maxWidth = 'none';
  }

  /**
   * Hide elements for print mode
   * @param {Array} selectors - CSS selectors for elements to hide
   */
  hideElementsForPrint(selectors) {
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          this.storeOriginalStyles(element);
          element.style.display = 'none';
          this.hiddenElements.add(element);
        });
      } catch (error) {
        console.warn(`[PrintStyleManager] Invalid selector: ${selector}`, error);
      }
    });
  }

  /**
   * Show elements for print mode
   * @param {Array} selectors - CSS selectors for elements to show
   */
  showElementsForPrint(selectors) {
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          this.storeOriginalStyles(element);
          element.style.display = 'block';
        });
      } catch (error) {
        console.warn(`[PrintStyleManager] Invalid selector: ${selector}`, error);
      }
    });
  }

  /**
   * Apply page break rules to elements
   * @param {Array} rules - Page break rules
   */
  applyPageBreakRules(rules) {
    rules.forEach(rule => {
      try {
        const { selector, breakBefore, breakAfter, breakInside } = rule;
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
          this.storeOriginalStyles(element);
          
          if (breakBefore) element.style.pageBreakBefore = breakBefore;
          if (breakAfter) element.style.pageBreakAfter = breakAfter;
          if (breakInside) element.style.pageBreakInside = breakInside;
          
          this.pageBreakElements.add(element);
        });
      } catch (error) {
        console.warn(`[PrintStyleManager] Error applying page break rule:`, error);
      }
    });
  }

  /**
   * Restore original styles to all modified elements
   */
  restoreOriginalStyles() {
    try {
      this.originalStyles.forEach((originalStyle, element) => {
        Object.keys(originalStyle).forEach(property => {
          element.style[property] = originalStyle[property] || '';
        });
      });
      
      this.originalStyles.clear();
      this.hiddenElements.clear();
      this.pageBreakElements.clear();
      
      console.log('[PrintStyleManager] Restored original styles');
      
    } catch (error) {
      console.error('[PrintStyleManager] Error restoring styles:', error);
    }
  }

  /**
   * Get current status of the style manager
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      injectedStylesCount: this.injectedStyles.size,
      modifiedElementsCount: this.originalStyles.size,
      hiddenElementsCount: this.hiddenElements.size,
      pageBreakElementsCount: this.pageBreakElements.size,
      hasInjectedStyles: this.injectedStyles.size > 0,
      hasModifiedElements: this.originalStyles.size > 0
    };
  }

  /**
   * Clean up all resources and restore original state
   */
  destroy() {
    this.removePrintStyles();
    this.restoreOriginalStyles();
    this.injectedStyles.clear();
    this.originalStyles.clear();
    this.hiddenElements.clear();
    this.pageBreakElements.clear();
    this.styleCounter = 0;
  }
}

// Create a singleton instance for global use
const printStyleManager = new PrintStyleManager();

export default printStyleManager;