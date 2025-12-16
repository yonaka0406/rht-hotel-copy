import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrintOptimizationService } from '../printOptimizationService.js';

// Mock DOM environment
const mockWindow = {
  print: vi.fn(),
  matchMedia: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

const mockDocument = {
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn()
  },
  querySelectorAll: vi.fn(() => []),
  getElementById: vi.fn()
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

describe('PrintOptimizationService', () => {
  let service;
  let originalWindow, originalDocument, originalNavigator;

  beforeEach(() => {
    // Store original globals
    originalWindow = global.window;
    originalDocument = global.document;
    originalNavigator = global.navigator;

    // Mock globals
    global.window = mockWindow;
    global.document = mockDocument;
    global.navigator = mockNavigator;

    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock behaviors
    mockWindow.matchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    
    mockDocument.createElement.mockReturnValue({
      style: {},
      classList: {
        add: vi.fn()
      },
      textContent: '',
      id: '',
      remove: vi.fn()
    });

    mockDocument.querySelectorAll.mockReturnValue([]);

    // Create fresh service instance
    service = new PrintOptimizationService();
  });

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow;
    global.document = originalDocument;
    global.navigator = originalNavigator;
    
    // Clean up service
    if (service) {
      service.destroy();
    }
  });

  describe('Browser Support Detection', () => {
    it('should detect browser support correctly', () => {
      const support = service.detectBrowserSupport();
      
      expect(support).toHaveProperty('printAPI');
      expect(support).toHaveProperty('printMediaQueries');
      expect(support).toHaveProperty('cssPageBreak');
      expect(support).toHaveProperty('browserName');
      expect(support).toHaveProperty('version');
      expect(support).toHaveProperty('isSupported');
    });

    it('should detect Chrome browser correctly', () => {
      const support = service.getBrowserCompatibility();
      expect(support.browserName).toBe('chrome');
      expect(support.version).toBe('91');
    });

    it('should return false for browser support when window is undefined', () => {
      global.window = undefined;
      const newService = new PrintOptimizationService();
      const support = newService.getBrowserCompatibility();
      
      expect(support.isSupported).toBe(false);
      expect(support.printAPI).toBe(false);
    });
  });

  describe('Print Mode Activation', () => {
    it('should activate print mode successfully with browser support', async () => {
      // Mock successful browser support
      service.browserSupport.isSupported = true;
      
      const result = await service.activatePrintMode();
      
      expect(result).toBe(true);
      expect(service.isPrintModeActive).toBe(true);
    });

    it('should handle fallback when browser is not supported', async () => {
      // Mock unsupported browser
      service.browserSupport.isSupported = false;
      
      const fallbackCallback = vi.fn();
      service.setFallbackCallback(fallbackCallback);
      
      const result = await service.activatePrintMode();
      
      expect(result).toBe(false);
      expect(fallbackCallback).toHaveBeenCalledWith('browser_unsupported', null);
    });

    it('should not activate print mode if already active', async () => {
      service.isPrintModeActive = true;
      
      const result = await service.activatePrintMode();
      
      expect(result).toBe(true);
    });

    it('should handle activation errors gracefully', async () => {
      service.browserSupport.isSupported = true;
      
      // Mock error in storeOriginalState
      const originalStoreOriginalState = service.storeOriginalState;
      service.storeOriginalState = vi.fn(() => {
        throw new Error('Test error');
      });
      
      const fallbackCallback = vi.fn();
      service.setFallbackCallback(fallbackCallback);
      
      const result = await service.activatePrintMode();
      
      expect(result).toBe(false);
      expect(fallbackCallback).toHaveBeenCalledWith('activation_error', expect.any(Error));
      
      // Restore original method
      service.storeOriginalState = originalStoreOriginalState;
    });
  });

  describe('Print Mode Deactivation', () => {
    it('should deactivate print mode successfully', () => {
      service.isPrintModeActive = true;
      service.printStylesInjected = true;
      
      service.deactivatePrintMode();
      
      expect(service.isPrintModeActive).toBe(false);
      expect(service.printStylesInjected).toBe(false);
    });

    it('should handle deactivation when not active', () => {
      service.isPrintModeActive = false;
      
      // Should not throw error
      expect(() => service.deactivatePrintMode()).not.toThrow();
    });
  });

  describe('Fallback Handling', () => {
    it('should set and call fallback callback correctly', () => {
      const fallbackCallback = vi.fn();
      service.setFallbackCallback(fallbackCallback);
      
      const result = service.handleFallback('test_reason');
      
      expect(result).toBe(false);
      expect(fallbackCallback).toHaveBeenCalledWith('test_reason', null);
    });

    it('should throw error when setting invalid fallback callback', () => {
      expect(() => service.setFallbackCallback('not a function')).toThrow('Fallback callback must be a function');
    });

    it('should handle fallback callback errors gracefully', () => {
      const fallbackCallback = vi.fn(() => {
        throw new Error('Fallback error');
      });
      service.setFallbackCallback(fallbackCallback);
      
      // Should not throw error
      expect(() => service.handleFallback('test_reason')).not.toThrow();
    });
  });

  describe('Print Trigger', () => {
    it('should trigger print successfully when supported', async () => {
      service.browserSupport.isSupported = true;
      
      const result = await service.triggerPrint();
      
      expect(result).toBe(true);
      expect(mockWindow.print).toHaveBeenCalled();
    });

    it('should handle fallback when print is not supported', async () => {
      service.browserSupport.isSupported = false;
      
      const fallbackCallback = vi.fn();
      service.setFallbackCallback(fallbackCallback);
      
      const result = await service.triggerPrint();
      
      expect(result).toBe(false);
      expect(fallbackCallback).toHaveBeenCalledWith('print_not_supported', null);
    });

    it('should handle print trigger errors', async () => {
      service.browserSupport.isSupported = true;
      mockWindow.print.mockImplementation(() => {
        throw new Error('Print error');
      });
      
      const fallbackCallback = vi.fn();
      service.setFallbackCallback(fallbackCallback);
      
      const result = await service.triggerPrint();
      
      expect(result).toBe(false);
      expect(fallbackCallback).toHaveBeenCalledWith('print_trigger_error', expect.any(Error));
    });
  });

  describe('Status and Cleanup', () => {
    it('should return correct status information', () => {
      service.isPrintModeActive = true;
      service.printStylesInjected = true;
      service.setFallbackCallback(() => {});
      
      const status = service.getStatus();
      
      expect(status.isPrintModeActive).toBe(true);
      expect(status.printStylesInjected).toBe(true);
      expect(status.hasFallbackCallback).toBe(true);
      expect(status.browserSupport).toBeDefined();
    });

    it('should clean up resources on destroy', () => {
      service.isPrintModeActive = true;
      service.setFallbackCallback(() => {});
      
      service.destroy();
      
      expect(service.isPrintModeActive).toBe(false);
      expect(service.fallbackCallback).toBe(null);
    });
  });

  describe('Style Management', () => {
    it('should inject print styles correctly', () => {
      const mockStyleElement = {
        id: '',
        textContent: '',
        remove: vi.fn()
      };
      mockDocument.createElement.mockReturnValue(mockStyleElement);
      
      service.injectPrintStyles({});
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockStyleElement.id).toBe('print-optimization-styles');
      expect(mockStyleElement.textContent).toContain('@media print');
      expect(mockDocument.head.appendChild).toHaveBeenCalledWith(mockStyleElement);
      expect(service.printStylesInjected).toBe(true);
    });

    it('should not inject styles if already injected', () => {
      // Clear any previous calls from beforeEach
      vi.clearAllMocks();
      
      service.printStylesInjected = true;
      
      service.injectPrintStyles({});
      
      expect(mockDocument.createElement).not.toHaveBeenCalled();
    });

    it('should remove print styles correctly', () => {
      const mockStyleElement = {
        remove: vi.fn()
      };
      mockDocument.getElementById.mockReturnValue(mockStyleElement);
      
      service.removePrintStyles();
      
      expect(mockDocument.getElementById).toHaveBeenCalledWith('print-optimization-styles');
      expect(mockStyleElement.remove).toHaveBeenCalled();
      expect(service.printStylesInjected).toBe(false);
    });
  });
});