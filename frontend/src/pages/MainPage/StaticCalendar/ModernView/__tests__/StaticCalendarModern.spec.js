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

  it('should respect status colors over plan colors', () => {
    const reservedRoomsWithStatus = [
      {
        reservation_id: 'res_hold',
        room_id: 'room1',
        date: '2025-01-01',
        client_name: 'Hold Guest',
        plan_color: '#ff0000',
        status: 'hold'
      }
    ];

    const wrapper = mount(StaticCalendarModern, {
      props: {
        dateRange: ['2025-01-01'],
        headerRoomsData: { roomNumbers: [{ room_id: 'room1', room_number: '101' }] },
        selectedHotelRooms: [{ room_id: 'room1', room_number: '101' }],
        reservedRooms: reservedRoomsWithStatus,
        availableRoomsByDate: {},
        availableParkingSpotsByDate: {}
      },
      global: { plugins: [mockPrimeVue] }
    });

    const segment = wrapper.find('.absolute.inset-0.flex.flex-col.z-0 div');
    // Hold color is #FFC107 -> rgb(255, 193, 7)
    expect(segment.attributes('style')).toContain('background-color: rgb(255, 193, 7)');
  });

  it('should respect employee type colors', () => {
    const reservedRoomsEmployee = [
      {
        reservation_id: 'res_emp',
        room_id: 'room1',
        date: '2025-01-01',
        client_name: 'Employee Guest',
        type: 'employee'
      }
    ];

    const wrapper = mount(StaticCalendarModern, {
      props: {
        dateRange: ['2025-01-01'],
        headerRoomsData: { roomNumbers: [{ room_id: 'room1', room_number: '101' }] },
        selectedHotelRooms: [{ room_id: 'room1', room_number: '101' }],
        reservedRooms: reservedRoomsEmployee,
        availableRoomsByDate: {},
        availableParkingSpotsByDate: {}
      },
      global: { plugins: [mockPrimeVue] }
    });

    const segment = wrapper.find('.absolute.inset-0.flex.flex-col.z-0 div');
    // Employee color is #f3e5f5 -> rgb(243, 229, 245)
    expect(segment.attributes('style')).toContain('background-color: rgb(243, 229, 245)');
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

  it('should apply red highlight color on conflict during drag over', async () => {
    const otherReservation = [
      {
        reservation_id: 'res_other',
        room_id: 'room1',
        date: '2025-01-03',
        client_name: 'Other Guest',
        status: 'confirmed'
      }
    ];

    const allReservedRooms = [...reservedRooms, ...otherReservation];

    const wrapper = mount(StaticCalendarModern, {
      props: {
        dateRange: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'],
        headerRoomsData,
        selectedHotelRooms,
        reservedRooms: allReservedRooms,
        availableRoomsByDate: {},
        availableParkingSpotsByDate: {}
      },
      global: { plugins: [mockPrimeVue] }
    });

    const block = wrapper.find('.cursor-pointer.shadow-sm');
    // Start dragging res1 (dates 01-01 and 01-02, duration 2 days)
    await block.trigger('dragstart', {
      dataTransfer: {
        setDragImage: vi.fn(),
        effectAllowed: null
      }
    });

    // Drag over room1 at index 1 (dates 01-02 and 01-03)
    // 01-03 is occupied by res_other -> CONFLICT!
    const roomColumn = wrapper.find('.relative.border-r');

    // Mock getBoundingClientRect for roomColumn
    vi.spyOn(roomColumn.element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      width: 50,
      height: 100
    });

    // rowHeight is 22. Index 1 means relativeY should be between 22 and 43.
    await roomColumn.trigger('dragover', {
      clientY: 30
    });

    // Check if the red highlight class is applied
    const redHighlight = wrapper.find('.bg-red-500\\/40');
    expect(redHighlight.exists()).toBe(true);

    // Now drag over an empty spot (index 0: dates 01-01 and 01-02)
    // 01-01 and 01-02 are occupied by the dragging reservation itself, so no conflict
    await roomColumn.trigger('dragover', {
      clientY: 10
    });

    const greenHighlight = wrapper.find('.bg-green-500\\/20');
    expect(greenHighlight.exists()).toBe(true);
  });
});
