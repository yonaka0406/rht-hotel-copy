/** @vitest-environment jsdom */
// Test setup file for Vitest

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

if (!window.matchMedia) {
  window.matchMedia = function() {
    return {
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    };
  };
}

// Global test utilities can be added here