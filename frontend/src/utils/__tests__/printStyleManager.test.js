import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintStyleManager } from '../printStyleManager.js';

// Mock DOM environment
const mockDocument = {
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  },
  querySelectorAll: vi.fn(() => []),
  querySelector: vi.fn()
};

const mockWindow = {
  getComputedStyle: vi.fn(() => ({
    marginTop: '0px',
    marginBottom: '0px'
  }))
};

// Mock DOM element
const createMockElement = (overrides = {}) => {
  return {
    style: {},
    classList: {
      contains: vi.fn(() => false),
      add: vi.fn(),
      remove: vi.fn()
    },
    tagName: 'DIV',
    getBoundingClientRect: vi.fn(() => ({
      height: 100,
      width: 200
    })),
    parentNode: {
      removeChild: vi.fn()
    },
    id: '',
    textContent: '',
    remove: vi.fn(),
    ...overrides
  };
};

describe('PrintStyleManager', () => {
  let manager;
  let originalDocument, originalWindow;

  beforeEach(() => {
    // Store original globals
    originalDocument = global.document;
    originalWindow = global.window;

    // Mock globals
    global.document = mockDocument;
    global.window = mockWindow;

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockDocument.createElement.mockReturnValue(createMockElement());
    mockDocument.querySelectorAll.mockReturnValue([]);

    // Create fresh manager instance
    manager = new PrintStyleManager();
  });

  afterEach(() => {
    // Restore original globals
    global.document = originalDocument;
    global.window = originalWindow;
    
    // Clean up manager
    if (manager) {
      manager.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(manager.injectedStyles.size).toBe(0);
      expect(manager.originalStyles.size).toBe(0);
      expect(manager.pageBreakElements.size).toBe(0);
      expect(manager.hiddenElements.size).toBe(0);
      expect(manager.styleCounter).toBe(0);
    });
  });

  describe('Style Injection', () => {
    it('should inject print styles successfully', () => {
      const mockStyleElement = createMockElement();
      mockDocument.createElement.mockReturnValue(mockStyleElement);

      const styleConfig = {
        pageSize: 'A4',
        orientation: 'portrait',
        hideSelectors: ['.test-hide'],
        customCSS: 'body { color: red; }'
      };

      const styleId = manager.injectPrintStyles(styleConfig);

      expect(styleId).toBeTruthy();
      expect(styleId).toMatch(/^print-styles-\d+$/);
      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockStyleElement.textContent).toContain('@media print');
      expect(mockStyleElement.textContent).toContain('size: A4 portrait');
      expect(mockStyleElement.textContent).toContain('.test-hide');
      expect(mockStyleElement.textContent).toContain('body { color: red; }');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockStyleElement);
      expect(manager.injectedStyles.has(styleId)).toBe(true);
    });

    it('should handle injection errors gracefully', () => {
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('DOM error');
      });

      const styleId = manager.injectPrintStyles({});

      expect(styleId).toBe(null);
    });

    it('should generate correct CSS for different configurations', () => {
      const mockStyleElement = createMockElement();
      mockDocument.createElement.mockReturnValue(mockStyleElement);

      const config = {
        pageSize: 'Letter',
        orientation: 'landscape',
        margins: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        hideSelectors: ['.hide-me', '.also-hide'],
        showSelectors: ['.show-me'],
        pageBreakRules: [
          { selector: '.break-before', breakBefore: 'always' },
          { selector: '.break-after', breakAfter: 'always' }
        ]
      };

      manager.injectPrintStyles(config);

      const generatedCSS = mockStyleElement.textContent;
      expect(generatedCSS).toContain('size: Letter landscape');
      expect(generatedCSS).toContain('margin: 10mm 10mm 10mm 10mm');
      expect(generatedCSS).toContain('.hide-me,\n  .also-hide');
      expect(generatedCSS).toContain('.show-me');
      expect(generatedCSS).toContain('.break-before');
      expect(generatedCSS).toContain('page-break-before: always');
    });
  });

  describe('Style Removal', () => {
    it('should remove specific injected styles', () => {
      const mockStyleElement = createMockElement();
      mockDocument.createElement.mockReturnValue(mockStyleElement);

      const styleId = manager.injectPrintStyles({});
      expect(manager.injectedStyles.size).toBe(1);

      manager.removePrintStyles(styleId);

      expect(mockStyleElement.parentNode.removeChild).toHaveBeenCalledWith(mockStyleElement);
      expect(manager.injectedStyles.size).toBe(0);
    });

    it('should remove all injected styles when no ID provided', () => {
      const mockStyleElement1 = createMockElement();
      const mockStyleElement2 = createMockElement();
      
      mockDocument.createElement
        .mockReturnValueOnce(mockStyleElement1)
        .mockReturnValueOnce(mockStyleElement2);

      manager.injectPrintStyles({});
      manager.injectPrintStyles({});
      expect(manager.injectedStyles.size).toBe(2);

      manager.removePrintStyles();

      expect(mockStyleElement1.parentNode.removeChild).toHaveBeenCalledWith(mockStyleElement1);
      expect(mockStyleElement2.parentNode.removeChild).toHaveBeenCalledWith(mockStyleElement2);
      expect(manager.injectedStyles.size).toBe(0);
    });

    it('should handle removal of non-existent styles gracefully', () => {
      expect(() => manager.removePrintStyles('non-existent')).not.toThrow();
    });

    it('should handle removal errors gracefully', () => {
      const mockStyleElement = createMockElement();
      mockStyleElement.parentNode.removeChild.mockImplementation(() => {
        throw new Error('Removal error');
      });
      mockDocument.createElement.mockReturnValue(mockStyleElement);

      const styleId = manager.injectPrintStyles({});
      
      expect(() => manager.removePrintStyles(styleId)).not.toThrow();
    });
  });

  describe('Page Break Calculations', () => {
    it('should calculate optimal page breaks', () => {
      const mockElements = [
        createMockElement({ getBoundingClientRect: () => ({ height: 200 }) }),
        createMockElement({ getBoundingClientRect: () => ({ height: 300 }) }),
        createMockElement({ getBoundingClientRect: () => ({ height: 400 }) }),
        createMockElement({ getBoundingClientRect: () => ({ height: 200 }) })
      ];

      const pageBreaks = manager.calculateOptimalPageBreaks(mockElements);

      expect(Array.isArray(pageBreaks)).toBe(true);
      expect(pageBreaks.length).toBeGreaterThan(0);
      
      // Should have page breaks due to height overflow
      const overflowBreaks = pageBreaks.filter(bp => bp.reason === 'page_overflow');
      expect(overflowBreaks.length).toBeGreaterThan(0);
    });

    it('should identify natural break points', () => {
      const mockElements = [
        createMockElement({ tagName: 'H1' }),
        createMockElement({ tagName: 'DIV' }),
        createMockElement({ 
          tagName: 'DIV',
          classList: { contains: vi.fn(cls => cls === 'section-break') }
        })
      ];

      const pageBreaks = manager.calculateOptimalPageBreaks(mockElements);

      const naturalBreaks = pageBreaks.filter(bp => bp.reason === 'natural_break');
      expect(naturalBreaks.length).toBe(2); // H1 and section-break div
    });

    it('should handle empty or invalid elements', () => {
      const pageBreaks = manager.calculateOptimalPageBreaks([]);
      expect(pageBreaks).toEqual([]);

      const pageBreaksWithNull = manager.calculateOptimalPageBreaks([null, undefined]);
      expect(pageBreaksWithNull).toEqual([]);
    });

    it('should handle calculation errors gracefully', () => {
      const mockElements = [
        createMockElement({
          getBoundingClientRect: () => { throw new Error('DOM error'); }
        })
      ];

      expect(() => manager.calculateOptimalPageBreaks(mockElements)).not.toThrow();
    });
  });

  describe('Layout Adjustment', () => {
    it('should adjust layout for print media', () => {
      const mockElements = [
        createMockElement(),
        createMockElement()
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      manager.adjustLayoutForPrintMedia({
        containerSelectors: ['.container'],
        removeFloats: true,
        stackColumns: true,
        optimizeSpacing: true
      });

      // Should store original styles
      expect(manager.originalStyles.size).toBe(2);

      // Should apply print styles
      mockElements.forEach(element => {
        expect(element.style.float).toBe('none');
        expect(element.style.maxWidth).toBe('none');
      });
    });

    it('should handle layout adjustment errors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('Query error');
      });

      expect(() => manager.adjustLayoutForPrintMedia()).not.toThrow();
    });
  });

  describe('Element Visibility Management', () => {
    it('should hide elements for print', () => {
      const mockElements = [
        createMockElement(),
        createMockElement()
      ];
      
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      manager.hideElementsForPrint(['.hide-me', '.also-hide']);

      mockElements.forEach(element => {
        expect(element.style.display).toBe('none');
      });
      expect(manager.hiddenElements.size).toBe(2); // 2 elements hidden
    });

    it('should show elements for print', () => {
      const mockElements = [createMockElement()];
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      manager.showElementsForPrint(['.show-me']);

      expect(mockElements[0].style.display).toBe('block');
    });

    it('should handle invalid selectors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('Invalid selector');
      });

      expect(() => manager.hideElementsForPrint(['invalid[selector'])).not.toThrow();
      expect(() => manager.showElementsForPrint(['invalid[selector'])).not.toThrow();
    });
  });

  describe('Page Break Rules', () => {
    it('should apply page break rules to elements', () => {
      const mockElements = [createMockElement()];
      mockDocument.querySelectorAll.mockReturnValue(mockElements);

      const rules = [
        { selector: '.break-before', breakBefore: 'always' },
        { selector: '.break-after', breakAfter: 'always' },
        { selector: '.no-break', breakInside: 'avoid' }
      ];

      manager.applyPageBreakRules(rules);

      expect(mockElements[0].style.pageBreakBefore).toBe('always');
      expect(manager.pageBreakElements.size).toBe(1); // 1 element with page break rules
    });

    it('should handle page break rule errors gracefully', () => {
      mockDocument.querySelectorAll.mockImplementation(() => {
        throw new Error('Query error');
      });

      const rules = [{ selector: '.test', breakBefore: 'always' }];

      expect(() => manager.applyPageBreakRules(rules)).not.toThrow();
    });
  });

  describe('Style Restoration', () => {
    it('should restore original styles', () => {
      const mockElement = createMockElement();
      mockDocument.querySelectorAll.mockReturnValue([mockElement]);

      // Modify element and store original styles
      manager.hideElementsForPrint(['.test']);
      expect(manager.originalStyles.size).toBe(1);
      expect(mockElement.style.display).toBe('none');

      // Restore original styles
      manager.restoreOriginalStyles();

      expect(manager.originalStyles.size).toBe(0);
      expect(manager.hiddenElements.size).toBe(0);
      expect(manager.pageBreakElements.size).toBe(0);
    });

    it('should handle restoration errors gracefully', () => {
      const mockElement = createMockElement();
      
      // Manually add element to originalStyles with problematic style
      manager.originalStyles.set(mockElement, { invalidProperty: 'test' });

      expect(() => manager.restoreOriginalStyles()).not.toThrow();
    });
  });

  describe('Status and Utility Methods', () => {
    it('should return correct status information', () => {
      let status = manager.getStatus();
      expect(status.injectedStylesCount).toBe(0);
      expect(status.modifiedElementsCount).toBe(0);
      expect(status.hasInjectedStyles).toBe(false);
      expect(status.hasModifiedElements).toBe(false);

      // Add some styles and modifications
      const mockStyleElement = createMockElement();
      mockDocument.createElement.mockReturnValue(mockStyleElement);
      manager.injectPrintStyles({});

      const mockElement = createMockElement();
      mockDocument.querySelectorAll.mockReturnValue([mockElement]);
      manager.hideElementsForPrint(['.test']);

      status = manager.getStatus();
      expect(status.injectedStylesCount).toBe(1);
      expect(status.modifiedElementsCount).toBe(1);
      expect(status.hasInjectedStyles).toBe(true);
      expect(status.hasModifiedElements).toBe(true);
    });

    it('should clean up all resources on destroy', () => {
      const mockStyleElement = createMockElement();
      mockDocument.createElement.mockReturnValue(mockStyleElement);
      manager.injectPrintStyles({});

      const mockElement = createMockElement();
      mockDocument.querySelectorAll.mockReturnValue([mockElement]);
      manager.hideElementsForPrint(['.test']);

      expect(manager.injectedStyles.size).toBe(1);
      expect(manager.originalStyles.size).toBe(1);

      manager.destroy();

      expect(manager.injectedStyles.size).toBe(0);
      expect(manager.originalStyles.size).toBe(0);
      expect(manager.hiddenElements.size).toBe(0);
      expect(manager.pageBreakElements.size).toBe(0);
      expect(manager.styleCounter).toBe(0);
    });
  });

  describe('CSS Generation', () => {
    it('should generate page setup CSS correctly', () => {
      const css = manager.generatePageSetupCSS('A4', 'landscape', {
        top: '20mm', right: '15mm', bottom: '20mm', left: '15mm'
      });

      expect(css).toContain('@page');
      expect(css).toContain('size: A4 landscape');
      expect(css).toContain('margin: 20mm 15mm 20mm 15mm');
    });

    it('should generate visibility CSS correctly', () => {
      const css = manager.generateVisibilityCSS(['.custom-hide'], ['.custom-show']);

      expect(css).toContain('.custom-hide');
      expect(css).toContain('.custom-show');
      expect(css).toContain('display: none !important');
      expect(css).toContain('display: block !important');
    });

    it('should generate page break CSS correctly', () => {
      const rules = [
        { selector: '.break-before', breakBefore: 'always' },
        { selector: '.break-after', breakAfter: 'always', breakInside: 'avoid' }
      ];

      const css = manager.generatePageBreakCSS(rules);

      expect(css).toContain('.break-before');
      expect(css).toContain('page-break-before: always');
      expect(css).toContain('.break-after');
      expect(css).toContain('page-break-after: always');
      expect(css).toContain('page-break-inside: avoid');
    });

    it('should include default styles when requested', () => {
      const css = manager.generatePrintCSS({ includeDefaults: true });

      expect(css).toContain('font-family: Arial, sans-serif');
      expect(css).toContain('h1, h2, h3, h4, h5, h6');
      expect(css).toContain('table');
      expect(css).toContain('.chart-container');
    });

    it('should exclude default styles when not requested', () => {
      const css = manager.generatePrintCSS({ includeDefaults: false });

      expect(css).not.toContain('font-family: Arial, sans-serif');
      // Should still contain page setup
      expect(css).toContain('@page');
    });
  });
});