// Test setup file for Vitest
import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'

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

config.global.plugins = [PrimeVue, ToastService, ConfirmationService]
config.global.directives = {
  tooltip: Tooltip,
}

// Mock the router
const mockRouter = {
  push: vi.fn(),
  resolve: vi.fn().mockReturnValue({ href: '' }),
};

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  onBeforeRouteLeave: vi.fn(),
}));

vi.mock('@/composables/useApi', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    setApiDependencies: vi.fn(),
  };
});