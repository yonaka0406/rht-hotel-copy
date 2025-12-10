import { ref } from 'vue';

const hotelAddons = ref([]);

export function useAddonsStore() {
  // Fetch all hotel addons
  const fetchHotelAddons = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/addons/hotel', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      hotelAddons.value = await response.json();
      return hotelAddons.value;
    } catch (error) {
      console.error('Failed to fetch hotel addons', error);
      throw error;
    }
  };

  // Fetch addons for a specific hotel
  const fetchAddonsForHotel = async (hotelId) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/addons/hotel/${hotelId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      hotelAddons.value = data;
      return data;
    } catch (error) {
      console.error('Failed to fetch addons for hotel', error);
      throw error;
    }
  };

  // Create a new hotel addon
  const createHotelAddon = async (addonData) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/addons/hotel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addonData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      hotelAddons.value.push(result);
      return result;
    } catch (error) {
      console.error('Failed to create hotel addon', error);
      throw error;
    }
  };

  // Update an existing hotel addon
  const updateHotelAddon = async (id, addonData) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/addons/hotel/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addonData)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const index = hotelAddons.value.findIndex(addon => addon.id === id);
      if (index !== -1) {
        hotelAddons.value[index] = result;
      }
      return result;
    } catch (error) {
      console.error('Failed to update hotel addon', error);
      throw error;
    }
  };

  // Delete a hotel addon
  const deleteHotelAddon = async (id) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/addons/hotel/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      hotelAddons.value = hotelAddons.value.filter(addon => addon.id !== id);
      return true;
    } catch (error) {
      console.error('Failed to delete hotel addon', error);
      throw error;
    }
  };

  return {
    hotelAddons,
    fetchHotelAddons,
    fetchAddonsForHotel,
    createHotelAddon,
    updateHotelAddon,
    deleteHotelAddon
  };
}
