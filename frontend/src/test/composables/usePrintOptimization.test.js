import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { usePrintOptimization } from '@/composables/usePrintOptimization';

// Mock window and matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Test component that uses the composable
const TestComponent = defineComponent({
  setup() {
    const printOptimization = usePrintOptimization();
    return {
      ...printOptimization
    };
  },
  template: '<div></div>'
});

describe('usePrintOptimization', () => {
  let wrapper;
  let mockMediaQueryList;

  beforeEach(() => {
    mockMediaQueryList = {
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn()
    };
    
    mockMatchMedia.mockReturnValue(mockMediaQueryList);
    
    wrapper = mount(TestComponent);
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.clearAllMocks();
  });

  it('should initialize with print mode false', () => {
    expect(wrapper.vm.isPrintMode).toBe(false);
    expect(wrapper.vm.isPreparingForPrint).toBe(false);
  });

  it('should detect print media query support', () => {
    expect(wrapper.vm.supportsPrintMediaQueries()).toBe(true);
    expect(mockMatchMedia).toHaveBeenCalledWith('print');
  });

  it('should return correct print dimensions', () => {
    const dimensions = wrapper.vm.getPrintChartDimensions('500px');
    expect(dimensions).toEqual({
      height: '500px',
      width: '100%'
    });
  });

  it('should provide print optimization functions', () => {
    expect(typeof wrapper.vm.optimizeChartForPrint).toBe('function');
    expect(typeof wrapper.vm.restoreChartFromPrint).toBe('function');
    expect(typeof wrapper.vm.getPrintChartDimensions).toBe('function');
  });

  it('should handle chart optimization for print', () => {
    const mockChartInstance = {
      setOption: vi.fn(),
      resize: vi.fn()
    };
    
    const originalOptions = {
      animation: true,
      backgroundColor: '#f0f0f0',
      series: [{
        itemStyle: { color: '#ff0000' }
      }]
    };

    wrapper.vm.optimizeChartForPrint(mockChartInstance, originalOptions);

    expect(mockChartInstance.setOption).toHaveBeenCalled();
    expect(mockChartInstance.resize).toHaveBeenCalled();
    
    const callArgs = mockChartInstance.setOption.mock.calls[0][0];
    expect(callArgs.animation).toBe(false);
    expect(callArgs.backgroundColor).toBe('#ffffff');
  });

  it('should restore chart from print optimization', () => {
    const mockChartInstance = {
      setOption: vi.fn(),
      resize: vi.fn()
    };
    
    const originalOptions = {
      animation: true,
      backgroundColor: '#f0f0f0'
    };

    wrapper.vm.restoreChartFromPrint(mockChartInstance, originalOptions);

    expect(mockChartInstance.setOption).toHaveBeenCalledWith(originalOptions, true);
    expect(mockChartInstance.resize).toHaveBeenCalled();
  });
});