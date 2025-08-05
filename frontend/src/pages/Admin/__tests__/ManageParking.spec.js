import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ManageParking from '../ManageParking.vue';
import { useParkingStore } from '../../../composables/useParkingStore';

// Mock the composable
vi.mock('../../../composables/useParkingStore', () => ({
    useParkingStore: () => ({
        vehicleCategories: ref([
            { id: 1, name: 'Standard Car', capacity_units_required: 1 },
            { id: 2, name: 'Large Car', capacity_units_required: 2 },
        ]),
        fetchVehicleCategories: vi.fn(),
    }),
}));

describe('ManageParking.vue', () => {
    it('renders vehicle categories correctly', () => {
        const wrapper = mount(ManageParking);
        const rows = wrapper.findAll('tr');
        expect(rows.length).toBe(3); // Header row + 2 data rows
        expect(wrapper.text()).toContain('Standard Car');
        expect(wrapper.text()).toContain('Large Car');
    });
});
