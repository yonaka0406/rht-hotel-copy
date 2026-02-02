import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import StaticCalendarModern from '../StaticCalendarModern.vue';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';

// Mock PrimeVue components and directives if needed
const mockPrimeVue = (app) => {
  app.use(PrimeVue);
  app.directive('tooltip', Tooltip);
};

describe('StaticCalendarModern.vue - UX Improvement', () => {
  const dateRange = ['2025-01-01', '2025-01-02', '2025-01-03'];
  const headerRoomsData = {
    roomNumbers: [{ room_id: 'room1', room_number: '101' }]
  };
  const selectedHotelRooms = [{ room_id: 'room1', room_number: '101', room_type_name: 'Single' }];

  // A reservation with TWO DIFFERENT PLANS on consecutive days
  const reservedRooms = [
    {
      reservation_id: 'res1',
      room_id: 'room1',
      date: '2025-01-01',
      client_id: 'client1',
      client_name: 'Test Guest',
      plan_name: 'Plan A',
      plan_color: '#ff0000',
      status: 'confirmed',
      check_in: '2025-01-01',
      check_out: '2025-01-03'
    },
    {
      reservation_id: 'res1',
      room_id: 'room1',
      date: '2025-01-02',
      client_id: 'client1',
      client_name: 'Test Guest',
      plan_name: 'Plan B',
      plan_color: '#0000ff',
      status: 'confirmed',
      check_in: '2025-01-01',
      check_out: '2025-01-03'
    }
  ];

  it('should render a single block for a reservation even if it has multiple plans', () => {
    const wrapper = mount(StaticCalendarModern, {
      props: {
        dateRange,
        headerRoomsData,
        selectedHotelRooms,
        reservedRooms,
        availableRoomsByDate: {},
        availableParkingSpotsByDate: {}
      },
      global: {
        plugins: [mockPrimeVue]
      }
    });

    // We expect ONE reservation block (the container div for the whole stay)
    const blocks = wrapper.findAll('.cursor-pointer.shadow-sm');
    expect(blocks.length).toBe(1);

    // It should have an indicator strip with TWO segments
    const indicatorSegments = wrapper.findAll('.absolute.left-0.top-0.bottom-0.w-1 div');
    expect(indicatorSegments.length).toBe(2);

    // Verify colors of the segments (indicator strip should be darkened)
    // #ff0000 darkened by 15% is approx rgb(216, 0, 0)
    expect(indicatorSegments[0].attributes('style')).toContain('background-color: rgb(216, 0, 0)');
    // #0000ff darkened by 15% is approx rgb(0, 0, 216)
    expect(indicatorSegments[1].attributes('style')).toContain('background-color: rgb(0, 0, 216)');

    // Verify clickable segments have the original plan colors
    const clickableSegments = wrapper.findAll('.absolute.inset-0.flex.flex-col.z-0 div');
    expect(clickableSegments[0].attributes('style')).toContain('background-color: rgb(255, 0, 0)');
    expect(clickableSegments[1].attributes('style')).toContain('background-color: rgb(0, 0, 255)');
  });

  it('should have a sticky header for the guest name', () => {
    const wrapper = mount(StaticCalendarModern, {
      props: {
        dateRange,
        headerRoomsData,
        selectedHotelRooms,
        reservedRooms,
        availableRoomsByDate: {},
        availableParkingSpotsByDate: {}
      },
      global: {
        plugins: [mockPrimeVue]
      }
    });

    const stickyHeader = wrapper.find('.sticky.top-0.z-20');
    expect(stickyHeader.exists()).toBe(true);
    expect(stickyHeader.text()).toBe('Test Guest');
  });
});
