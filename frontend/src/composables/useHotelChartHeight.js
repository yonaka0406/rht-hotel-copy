import { computed } from 'vue';

/**
 * Calculates the dynamic height for a hotel chart based on the number of hotels.
 * 
 * @param {import('vue').Ref<Array>} revenueData - The reactive array of revenue data objects.
 * @param {import('vue').Ref<Boolean>} hasData - A reactive boolean indicating if data is available.
 * @returns {import('vue').ComputedRef<Number>} The calculated height in pixels.
 */
export function useHotelChartHeight(revenueData, hasData) {
    return computed(() => {
        if (!hasData.value) return 450;

        // Calculate height based on number of unique hotels
        // Filter out '施設合計' and ensure hotel_name exists
        const hotelMap = new Map();
        if (revenueData.value && Array.isArray(revenueData.value)) {
            revenueData.value.forEach(item => {
                if (item.hotel_name && item.hotel_name !== '施設合計') {
                    hotelMap.set(item.hotel_name, true);
                }
            });
        }

        const numHotels = hotelMap.size;
        const baseHeight = 150;
        const heightPerHotel = 50;
        const minHeight = 450;
        const calculatedHeight = baseHeight + (numHotels * heightPerHotel);

        return Math.max(minHeight, calculatedHeight);
    });
}
