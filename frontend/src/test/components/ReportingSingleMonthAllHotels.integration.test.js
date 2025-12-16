import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReportingSingleMonthAllHotels from '@/pages/Reporting/ReportingSalesAndOCC/components/ReportingSingleMonthAllHotels.vue';

// Mock the services but allow them to be called
vi.mock('@/services/printOptimizationService.js', () => ({
  default: {
    setFallbackCallback: vi.fn(),
    activatePrintMode: vi.fn().mockResolvedValue(true),
    triggerPrint: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock('../../services/ChartConfigurationService', () => ({
  default: {
    getRevenuePlanVsActualConfig: vi.fn().mockReturnValue({}),
    getOccupancyGaugeConfig: vi.fn().mockReturnValue({}),
    getAllHotelsRevenueConfig: vi.fn().mockReturnValue({}),
    getAllHotelsOccupancyConfig: vi.fn().mockReturnValue({}),
    serializeConfig: vi.fn().mockReturnValue({})
  }
}));

vi.mock('@/composables/useReportStore', () => ({
  useReportStore: () => ({
    generatePdfReport: vi.fn().mockResolvedValue(new Blob())
  })
}));

// Mock DOM methods
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

Object.defineProperty(document, 'createElement', {
  value: vi.fn(() => ({
    href: '',
    setAttribute: vi.fn(),
    click: vi.fn(),
    style: {}
  }))
});

Object.defineProperty(document.body, 'appendChild', {
  value: vi.fn()
});

Object.defineProperty(document.body, 'removeChild', {
  value: vi.fn()
});

Object.defineProperty(document.body, 'setAttribute', {
  value: vi.fn()
});

Object.defineProperty(document.body, 'removeAttribute', {
  value: vi.fn()
});

describe('ReportingSingleMonthAllHotels Print PDF Integration', () => {
  let wrapper;
  
  const mockRevenueData = [
    {
      hotel_id: 0,
      hotel_name: '施設合計',
      month: '2024-01-01',
      forecast_revenue: 1000000,
      accommodation_revenue: 900000
    }
  ];
  
  const mockOccupancyData = [
    {
      hotel_id: 0,
      hotel_name: '施設合計',
      month: '2024-01-01',
      fc_sold_rooms: 100,
      fc_total_rooms: 150,
      sold_rooms: 90,
      total_rooms: 150,
      fc_occ: 66.67,
      occ: 60.0
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    wrapper = mount(ReportingSingleMonthAllHotels, {
      props: {
        revenueData: mockRevenueData,
        occupancyData: mockOccupancyData,
        rawOccupationBreakdownData: [],
        prevYearRevenueData: [],
        prevYearOccupancyData: [],
        futureOutlookData: []
      },
      global: {
        stubs: {
          RevenuePlanVsActualChart: true,
          AllHotelsOccupancyChart: true,
          OccupancyGaugeChart: true,
          HotelSalesComparisonChart: true,
          RevenuePlanVsActualTable: true,
          OccupancyPlanVsActualTable: true,
          FutureOutlookTable: true,
          Card: { template: '<div><slot name="header"></slot><slot name="content"></slot><slot name="footer"></slot></div>' },
          Badge: { template: '<span><slot></slot></span>' },
          SelectButton: { template: '<div></div>' },
          Button: { 
            template: '<button @click="$emit(\'click\')" :disabled="disabled" :loading="loading"><slot></slot></button>',
            props: ['disabled', 'loading']
          },
          DataTable: { template: '<div><slot></slot></div>' },
          Column: { template: '<div></div>' },
          Panel: { template: '<div><slot name="header"></slot><slot></slot></div>' },
          Message: { template: '<div><slot></slot></div>' }
        }
      }
    });
  });

  it('should complete the full print PDF workflow', async () => {
    // Find the print PDF button
    const printButton = wrapper.find('button[title*="ブラウザの印刷機能"]');
    expect(printButton.exists()).toBe(true);
    
    // Click the print PDF button
    await printButton.trigger('click');
    
    // Verify the print optimization service was called with correct parameters
    expect(mockPrintService.setFallbackCallback).toHaveBeenCalled();
    expect(mockPrintService.activatePrintMode).toHaveBeenCalledWith({
      hideElements: [
        '.no-print',
        '.reporting-top-menu',
        '.report-filters',
        '.report-navigation',
        '.p-selectbutton',
        'button:not(.print-keep)',
        '.p-button:not(.print-keep)',
        '.interactive-only',
        '.screen-only'
      ],
      optimizeCharts: true,
      pageBreakRules: [
        {
          selector: '.monthly-summary-panel',
          breakInside: 'avoid'
        },
        {
          selector: '.kpi-section',
          breakInside: 'avoid'
        },
        {
          selector: '.chart-container',
          breakInside: 'avoid'
        },
        {
          selector: '.hotel-overview-card',
          breakBefore: 'auto',
          breakInside: 'auto'
        }
      ]
    });
    
    expect(mockPrintService.triggerPrint).toHaveBeenCalled();
  });

  it('should handle print mode activation failure gracefully', async () => {
    // Mock print mode activation to fail
    mockPrintService.activatePrintMode.mockResolvedValueOnce(false);
    
    // Mock alert to capture error messages
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    const printButton = wrapper.find('button[title*="ブラウザの印刷機能"]');
    await printButton.trigger('click');
    
    // Should still call setFallbackCallback and activatePrintMode
    expect(mockPrintService.setFallbackCallback).toHaveBeenCalled();
    expect(mockPrintService.activatePrintMode).toHaveBeenCalled();
    
    // Should not call triggerPrint since activation failed
    expect(mockPrintService.triggerPrint).not.toHaveBeenCalled();
    
    alertSpy.mockRestore();
  });

  it('should set up fallback callback correctly', async () => {
    const printButton = wrapper.find('button[title*="ブラウザの印刷機能"]');
    await printButton.trigger('click');
    
    // Verify fallback callback was set up
    expect(mockPrintService.setFallbackCallback).toHaveBeenCalled();
    
    // Get the callback function that was passed
    const fallbackCallback = mockPrintService.setFallbackCallback.mock.calls[0][0];
    expect(typeof fallbackCallback).toBe('function');
    
    // Mock alert for testing the callback
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    // Test the fallback callback
    await fallbackCallback('test_reason', new Error('test error'));
    
    expect(alertSpy).toHaveBeenCalledWith('印刷PDFの生成に失敗しました。サーバーPDFを使用してください。');
    
    alertSpy.mockRestore();
  });
});