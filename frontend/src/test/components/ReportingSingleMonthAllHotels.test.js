import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import ReportingSingleMonthAllHotels from '@/pages/Reporting/ReportingSalesAndOCC/components/ReportingSingleMonthAllHotels.vue';

// Mock the print optimization service
vi.mock('@/services/printOptimizationService.js', () => ({
  default: {
    setFallbackCallback: vi.fn(),
    activatePrintMode: vi.fn().mockResolvedValue(true),
    triggerPrint: vi.fn().mockResolvedValue(true)
  }
}));

// Mock the chart configuration service
vi.mock('../../services/ChartConfigurationService', () => ({
  default: {
    getRevenuePlanVsActualConfig: vi.fn().mockReturnValue({}),
    getOccupancyGaugeConfig: vi.fn().mockReturnValue({}),
    getAllHotelsRevenueConfig: vi.fn().mockReturnValue({}),
    getAllHotelsOccupancyConfig: vi.fn().mockReturnValue({}),
    serializeConfig: vi.fn().mockReturnValue({})
  }
}));

// Mock the report store
vi.mock('@/composables/useReportStore', () => ({
  useReportStore: () => ({
    generatePdfReport: vi.fn().mockResolvedValue(new Blob())
  })
}));

// Mock PrimeVue components
vi.mock('primevue', () => ({
  Card: { template: '<div><slot name="header"></slot><slot name="content"></slot><slot name="footer"></slot></div>' },
  Badge: { template: '<span><slot></slot></span>' },
  SelectButton: { template: '<div></div>' },
  Button: { template: '<button @click="$emit(\'click\')"><slot></slot></button>' },
  DataTable: { template: '<div><slot></slot></div>' },
  Column: { template: '<div></div>' },
  Panel: { template: '<div><slot name="header"></slot><slot></slot></div>' },
  Message: { template: '<div><slot></slot></div>' }
}));

describe('ReportingSingleMonthAllHotels Print PDF Feature', () => {
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
          FutureOutlookTable: true
        }
      }
    });
  });

  it('should render the print PDF button', () => {
    const printButton = wrapper.find('button[title*="ブラウザの印刷機能"]');
    
    expect(printButton.exists()).toBe(true);
  });

  it('should have print optimization classes on container', () => {
    const container = wrapper.find('.reporting-single-month-container');
    expect(container.exists()).toBe(true);
    expect(container.attributes('data-report-container')).toBeDefined();
  });

  it('should have print-optimized CSS classes on key sections', () => {
    expect(wrapper.find('.monthly-summary-panel').exists()).toBe(true);
    expect(wrapper.find('.kpi-section').exists()).toBe(true);
    expect(wrapper.find('.chart-container').exists()).toBe(true);
    expect(wrapper.find('.hotel-overview-card').exists()).toBe(true);
  });

  it('should call print optimization service when print PDF button is clicked', async () => {
    const printOptimizationService = await import('@/services/printOptimizationService.js');
    
    const printButton = wrapper.find('button[title*="ブラウザの印刷機能"]');
    await printButton.trigger('click');
    
    expect(printOptimizationService.default.setFallbackCallback).toHaveBeenCalled();
    expect(printOptimizationService.default.activatePrintMode).toHaveBeenCalled();
  });

  it('should have the print PDF button in the template', () => {
    // Check that the component has the button structure we expect
    const buttonContainer = wrapper.find('.ml-2.flex.gap-2');
    expect(buttonContainer.exists()).toBe(true);
    
    // Should have one button (print PDF)
    const buttons = buttonContainer.findAll('button');
    expect(buttons.length).toBe(1);
  });
});