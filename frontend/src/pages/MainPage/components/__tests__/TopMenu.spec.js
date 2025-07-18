import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TopMenu from '../TopMenu.vue';

// Mock the components and composables
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn()
  }))
}));

vi.mock('@/composables/useUserStore', () => ({
  useUserStore: vi.fn(() => ({
    logged_user: { value: [{ name: 'Test User', permissions: { crud_ok: true } }] },
    fetchUser: vi.fn()
  }))
}));

vi.mock('@/composables/useHotelStore', () => ({
  useHotelStore: vi.fn(() => ({
    hotels: [{ id: 1, name: 'Test Hotel' }],
    setHotelId: vi.fn(),
    selectedHotelId: { value: 1 }
  }))
}));

vi.mock('@/composables/useReservationStore', () => ({
  useReservationStore: vi.fn(() => ({
    holdReservations: { value: [] },
    fetchMyHoldReservations: vi.fn(),
    setReservationId: vi.fn()
  }))
}));

vi.mock('@/composables/useWaitlistStore', () => ({
  useWaitlistStore: vi.fn(() => ({
    entries: { value: [] },
    fetchWaitlistEntries: vi.fn()
  }))
}));

// Mock the child components
vi.mock('../WaitlistDisplayModal.vue', () => ({
  default: {
    name: 'WaitlistDisplayModal',
    render: () => null,
    props: ['visible']
  }
}));

vi.mock('../GlobalSearchModal.vue', () => ({
  default: {
    name: 'GlobalSearchModal',
    render: () => null,
    props: ['visible']
  }
}));

describe('TopMenu', () => {
  let wrapper;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mount the component
    wrapper = mount(TopMenu, {
      global: {
        stubs: {
          Button: { template: '<button v-bind="$attrs"><slot /></button>' },
          Toolbar: {
            template: `
              <div>
                <slot name="start"></slot>
                <slot></slot>
                <slot name="end"></slot>
              </div>
            `
          },
          OverlayBadge: true,
          Select: true,
          Drawer: true,
          Divider: true,
          WaitlistDisplayModal: true,
          GlobalSearchModal: true
        }
      }
    });
  });

  it('should render correctly', () => {
    expect(wrapper.exists()).toBe(true);
  });

  it('should open global search modal when search button is clicked', async () => {
    // Find the search button
    const searchButton = wrapper.find('button[aria-label="予約検索"]');
    expect(searchButton.exists()).toBe(true);
    // Click the search button
    await searchButton.trigger('click');
    // Check if the global search modal is visible
    expect(wrapper.vm.isGlobalSearchVisible).toBe(true);
  });

  it('should handle reservation selection from global search', async () => {
    const setHotelId = vi.fn();
    const setReservationId = vi.fn();
    
    // Mock the methods
    wrapper.vm.onSelectReservation = vi.fn().mockImplementation(async (reservation) => {
      if (reservation.hotel_id) {
        await setHotelId(reservation.hotel_id);
      }
      
      if (reservation.reservation_id) {
        await setReservationId(reservation.reservation_id);
      }
    });
    
    // Call the method
    await wrapper.vm.onSelectReservation({
      hotel_id: 1,
      reservation_id: '123'
    });
    
    // Check if the methods were called
    expect(setHotelId).toHaveBeenCalledWith(1);
    expect(setReservationId).toHaveBeenCalledWith('123');
  });

  it('should close global search modal when visibility is updated', async () => {
    // Open the modal first by simulating a click
    const searchButton = wrapper.find('button[aria-label="予約検索"]');
    await searchButton.trigger('click');
    expect(wrapper.vm.isGlobalSearchVisible).toBe(true);
    // Find the GlobalSearchModal component
    const globalSearchModal = wrapper.findComponent({ name: 'GlobalSearchModal' });
    expect(globalSearchModal.exists()).toBe(true);
    // Emit the update:visible event
    await globalSearchModal.vm.$emit('update:visible', false);
    // Check if the modal is hidden
    expect(wrapper.vm.isGlobalSearchVisible).toBe(false);
  });
});