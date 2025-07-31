import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { vi, describe, it, expect } from 'vitest';
import ManageHotel from '../ManageHotel.vue';

// Mocking stores and dependencies
vi.mock('@/composables/useHotelStore', () => ({
  useHotelStore: () => ({
    hotels: ref([
      { id: 1, formal_name: 'Hotel 1', name: 'H1', email: 'a@a.com', phone_number: '111' }
    ]),
    fetchHotels: vi.fn(),
    fetchHotelSiteController: vi.fn().mockResolvedValue([]),
    editHotel: vi.fn(),
    editHotelSiteController: vi.fn(),
  }),
}));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

describe('ManageHotel.vue', () => {
  it('renders Google Drive URL input field', async () => {
    const wrapper = mount(ManageHotel, {
      global: {
        stubs: {
          teleport: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    // Simulate opening the dialog by clicking the edit button
    const editButton = wrapper.find('.p-button-icon.pi-pencil');
    await editButton.trigger('click');
    await wrapper.vm.$nextTick();

    const googleDriveInput = wrapper.find('#google_drive_url');
    expect(googleDriveInput.exists()).toBe(true);
  });
});
