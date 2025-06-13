<template>
  <div class="p-card p-4">
    <h2 class="text-xl font-semibold text-gray-800 mb-6">Loyalty Tier Settings</h2>

    <TabView>
      <TabPanel header="Repeater">
        <div class="p-fluid grid formgrid">
          <div class="field col-12 md:col-6">
            <label for="repeater-min-bookings">Minimum Total Bookings</label>
            <InputNumber id="repeater-min-bookings" v-model="repeaterSettings.min_bookings" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="repeater-time-value">Time Period Value</label>
            <InputNumber id="repeater-time-value" v-model="repeaterSettings.time_period_value" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="repeater-time-unit">Time Period Unit</label>
            <Dropdown id="repeater-time-unit" v-model="repeaterSettings.time_period_unit" :options="timePeriodUnits" optionLabel="name" optionValue="code" placeholder="Select Unit" />
          </div>
          <div class="col-12">
            <Button label="Save Repeater Settings" icon="pi pi-save" @click="saveTierSettings('REPEATER', repeaterSettings)" />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Hotel Loyal">
        <div class="p-fluid grid formgrid">
          <div class="field col-12 md:col-6">
            <label for="hotel-loyal-hotel">Hotel</label>
            <Dropdown id="hotel-loyal-hotel" v-model="hotelLoyalSettings.hotel_id" :options="hotels" optionLabel="name" optionValue="id" placeholder="Select Hotel" @change="loadHotelLoyalSettings" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="hotel-loyal-min-bookings">Min. Hotel Bookings</label>
            <InputNumber id="hotel-loyal-min-bookings" v-model="hotelLoyalSettings.min_bookings" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="hotel-loyal-min-spending">Min. Hotel Spending</label>
            <InputNumber id="hotel-loyal-min-spending" v-model="hotelLoyalSettings.min_spending" mode="currency" currency="JPY" />
          </div>
          <div class="field col-12 md:col-4">
            <label for="hotel-loyal-logic">Logic Operator</label>
            <Dropdown id="hotel-loyal-logic" v-model="hotelLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="Select Operator" />
          </div>
          <div class="field col-12 md:col-4">
            <label for="hotel-loyal-time-value">Time Period Value</label>
            <InputNumber id="hotel-loyal-time-value" v-model="hotelLoyalSettings.time_period_value" />
          </div>
          <div class="field col-12 md:col-4">
            <label for="hotel-loyal-time-unit">Time Period Unit</label>
            <Dropdown id="hotel-loyal-time-unit" v-model="hotelLoyalSettings.time_period_unit" :options="timePeriodUnits" optionLabel="name" optionValue="code" placeholder="Select Unit" />
          </div>
          <div class="col-12">
            <Button label="Save Hotel Loyal Settings" icon="pi pi-save" @click="saveTierSettings('HOTEL_LOYAL', hotelLoyalSettings)" :disabled="!hotelLoyalSettings.hotel_id" />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Brand Loyal">
        <div class="p-fluid grid formgrid">
          <div class="field col-12 md:col-3">
            <label for="brand-loyal-min-bookings">Min. Brand Bookings</label>
            <InputNumber id="brand-loyal-min-bookings" v-model="brandLoyalSettings.min_bookings" />
          </div>
          <div class="field col-12 md:col-3">
            <label for="brand-loyal-min-spending">Min. Brand Spending</label>
            <InputNumber id="brand-loyal-min-spending" v-model="brandLoyalSettings.min_spending" mode="currency" currency="JPY" />
          </div>
           <div class="field col-12 md:col-2">
            <label for="brand-loyal-logic">Logic Operator</label>
            <Dropdown id="brand-loyal-logic" v-model="brandLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="Select Operator" />
          </div>
          <div class="field col-12 md:col-2">
            <label for="brand-loyal-time-value">Time Period Value</label>
            <InputNumber id="brand-loyal-time-value" v-model="brandLoyalSettings.time_period_value" />
          </div>
          <div class="field col-12 md:col-2">
            <label for="brand-loyal-time-unit">Time Period Unit</label>
            <Dropdown id="brand-loyal-time-unit" v-model="brandLoyalSettings.time_period_unit" :options="timePeriodUnits" optionLabel="name" optionValue="code" placeholder="Select Unit" />
          </div>
          <div class="col-12">
            <Button label="Save Brand Loyal Settings" icon="pi pi-save" @click="saveTierSettings('BRAND_LOYAL', brandLoyalSettings)" />
          </div>
        </div>
      </TabPanel>
    </TabView>
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import api from '@/services/api'; // Assuming an API service module

const toast = useToast();

const repeaterSettings = ref({
  min_bookings: null,
  time_period_value: null,
  time_period_unit: null,
});
const hotelLoyalSettings = ref({
  hotel_id: null,
  min_bookings: null,
  min_spending: null,
  logic_operator: 'OR',
  time_period_value: null,
  time_period_unit: null,
});
const brandLoyalSettings = ref({
  min_bookings: null,
  min_spending: null,
  logic_operator: 'OR',
  time_period_value: null,
  time_period_unit: null,
});

const timePeriodUnits = ref([
  { name: 'Months', code: 'MONTHS' },
  { name: 'Years', code: 'YEARS' },
]);

const logicOperators = ref([
  { name: 'AND', code: 'AND' },
  { name: 'OR', code: 'OR' },
]);

const hotels = ref([]); // To be fetched from API

const fetchHotels = async () => {
  try {
    const response = await api.get('/api/hotels'); // Adjust endpoint if necessary
    hotels.value = response.data.map(h => ({ id: h.id, name: h.name }));
  } catch (error) {
    console.error('Error fetching hotels:', error);
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch hotels.', life: 3000 });
  }
};

const fetchTierSettings = async (tierName, hotelId = null) => {
  try {
    let url = `/api/loyalty-tiers/${tierName}`;
    if (tierName === 'HOTEL_LOYAL' && hotelId) {
      url += `?hotel_id=${hotelId}`;
    } else if (tierName === 'HOTEL_LOYAL' && !hotelId) {
      // For HOTEL_LOYAL, if no hotel is selected, clear current settings or don't fetch
      hotelLoyalSettings.value = { hotel_id: null, min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
      return;
    }

    const response = await api.get(url);
    const settings = response.data; // API returns an array, even for specific tier/hotel. We take the first if exists.

    if (settings && settings.length > 0) {
      const data = settings[0];
      if (tierName === 'REPEATER') {
        repeaterSettings.value = { ...data };
      } else if (tierName === 'HOTEL_LOYAL') {
        hotelLoyalSettings.value = { ...data };
      } else if (tierName === 'BRAND_LOYAL') {
        brandLoyalSettings.value = { ...data };
      }
    } else {
      // Reset to defaults if no settings found
      if (tierName === 'REPEATER') {
        repeaterSettings.value = { min_bookings: null, time_period_value: null, time_period_unit: null };
      } else if (tierName === 'HOTEL_LOYAL') {
         // Keep hotel_id if selected, reset others
        hotelLoyalSettings.value = { hotel_id: hotelId, min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
      } else if (tierName === 'BRAND_LOYAL') {
        brandLoyalSettings.value = { min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Reset to defaults if no settings found (404)
      if (tierName === 'REPEATER') repeaterSettings.value = { min_bookings: null, time_period_value: null, time_period_unit: null };
      else if (tierName === 'HOTEL_LOYAL') hotelLoyalSettings.value = { hotel_id: hotelId, min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
      else if (tierName === 'BRAND_LOYAL') brandLoyalSettings.value = { min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
    } else {
      console.error(`Error fetching ${tierName} settings:`, error);
      toast.add({ severity: 'error', summary: 'Error', detail: `Failed to fetch ${tierName} settings.`, life: 3000 });
    }
  }
};

const loadHotelLoyalSettings = () => {
  if (hotelLoyalSettings.value.hotel_id) {
    fetchTierSettings('HOTEL_LOYAL', hotelLoyalSettings.value.hotel_id);
  } else {
     // Clear settings if no hotel is selected
    hotelLoyalSettings.value = { hotel_id: null, min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
  }
};

const saveTierSettings = async (tierName, settings) => {
  // Basic client-side validation
  if (!settings.time_period_value || !settings.time_period_unit) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Time period value and unit are required.', life: 3000 });
    return;
  }
  if (tierName === 'HOTEL_LOYAL' && !settings.hotel_id) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Hotel is required for Hotel Loyal tier.', life: 3000 });
    return;
  }
   if ((tierName === 'HOTEL_LOYAL' || tierName === 'BRAND_LOYAL') && settings.min_bookings === null && settings.min_spending === null) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Either minimum bookings or minimum spending must be set.', life: 3000 });
    return;
  }
  if (tierName === 'REPEATER' && settings.min_bookings === null) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Minimum bookings must be set for Repeater tier.', life: 3000 });
    return;
  }


  try {
    const payload = { ...settings, tier_name: tierName };
    await api.post('/api/loyalty-tiers', payload);
    toast.add({ severity: 'success', summary: 'Success', detail: `${tierName} settings saved.`, life: 3000 });
  } catch (error) {
    console.error(`Error saving ${tierName} settings:`, error);
    toast.add({ severity: 'error', summary: 'Error', detail: `Failed to save ${tierName} settings. ${error.response?.data?.message || ''}`, life: 4000 });
  }
};

onMounted(() => {
  fetchHotels();
  fetchTierSettings('REPEATER');
  // For HOTEL_LOYAL, settings will be fetched when a hotel is selected
  fetchTierSettings('BRAND_LOYAL');
});

</script>

<style scoped>
.p-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
</style>
