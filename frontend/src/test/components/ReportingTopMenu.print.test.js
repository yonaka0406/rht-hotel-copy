import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ReportingTopMenu from '@/pages/Reporting/components/ReportingTopMenu.vue';

// Mock the hotel store
vi.mock('@/composables/useHotelStore', () => ({
  useHotelStore: () => ({
    hotels: { value: [{ id: 1, name: 'Test Hotel' }] },
    fetchHotels: vi.fn()
  })
}));

// Mock PrimeVue components
vi.mock('primevue', () => ({
  DatePicker: { template: '<div></div>' },
  MultiSelect: { template: '<div></div>' },
  Select: { template: '<div></div>' }
}));

describe('ReportingTopMenu Print Optimization', () => {
  it('should have print-hidden CSS classes for print optimization', () => {
    const wrapper = mount(ReportingTopMenu, {
      props: {
        selectedDate: new Date(),
        period: 'month',
        selectedHotels: [1],
        initialReportType: 'monthlySummary',
        loading: false
      }
    });

    const topMenuContainer = wrapper.find('.reporting-top-menu');
    expect(topMenuContainer.exists()).toBe(true);
    
    // Check that it has the no-print class for hiding during print
    expect(topMenuContainer.classes()).toContain('no-print');
    expect(topMenuContainer.classes()).toContain('reporting-top-menu');
  });

  it('should contain filter elements that will be hidden during print', () => {
    const wrapper = mount(ReportingTopMenu, {
      props: {
        selectedDate: new Date(),
        period: 'month',
        selectedHotels: [1],
        initialReportType: 'monthlySummary',
        loading: false
      }
    });

    // Verify the main container exists and has the right structure
    const container = wrapper.find('.reporting-top-menu');
    expect(container.exists()).toBe(true);
    
    // The container should have the red background and other styling
    expect(container.classes()).toContain('bg-red-600');
    expect(container.classes()).toContain('text-white');
    
    // Most importantly, it should have the print-hiding classes
    expect(container.classes()).toContain('no-print');
  });
});