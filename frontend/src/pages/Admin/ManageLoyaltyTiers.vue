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
            <Button label="Save Repeater Settings" icon="pi pi-save" @click="handleSaveSettings(repeaterSettings)" />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="Hotel Loyal">
        <div class="p-fluid grid formgrid">
          <div class="field col-12 md:col-6">
            <label for="hotel-loyal-hotel">Hotel</label>
            <Dropdown id="hotel-loyal-hotel" v-model="hotelLoyalSettings.hotel_id" :options="hotels" optionLabel="name" optionValue="id" placeholder="Select Hotel" />
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
            <Button label="Save Hotel Loyal Settings" icon="pi pi-save" @click="handleSaveSettings(hotelLoyalSettings)" :disabled="!hotelLoyalSettings.hotel_id" />
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
            <Button label="Save Brand Loyal Settings" icon="pi pi-save" @click="handleSaveSettings(brandLoyalSettings)" />
          </div>
        </div>
      </TabPanel>
    </TabView>
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import InputNumber from 'primevue/inputnumber';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import { useSettingsStore } from '@/composables/useSettingsStore';
import { useHotelStore } from '@/composables/useHotelStore';

const toast = useToast();
const { loyaltyTiers, fetchLoyaltyTiers, saveLoyaltyTier } = useSettingsStore();
const { hotels: hotelListFromStore, fetchHotels: fetchHotelList } = useHotelStore();

const repeaterSettings = ref({});
const hotelLoyalSettings = ref({ hotel_id: null });
const brandLoyalSettings = ref({});

const timePeriodUnits = ref([
  { name: 'Months', code: 'MONTHS' },
  { name: 'Years', code: 'YEARS' },
]);

const logicOperators = ref([
  { name: 'AND', code: 'AND' },
  { name: 'OR', code: 'OR' },
]);

const hotels = ref([]);

const currentRepeaterSetting = computed(() => loyaltyTiers.value.find(t => t.tier_name === 'repeater') || {});
const currentBrandLoyalSetting = computed(() => loyaltyTiers.value.find(t => t.tier_name === 'brand_loyal') || {});
const currentHotelLoyalSettingForSelectedHotel = computed(() => {
    if (hotelLoyalSettings.value.hotel_id) {
        return loyaltyTiers.value.find(t => t.tier_name === 'hotel_loyal' && t.hotel_id === hotelLoyalSettings.value.hotel_id) || {};
    }
    return {};
});

watch(currentRepeaterSetting, (newVal) => {
    repeaterSettings.value = { ...newVal, tier_name: 'repeater', logic_operator: newVal.logic_operator || null };
}, { deep: true, immediate: true });

watch(currentBrandLoyalSetting, (newVal) => {
    brandLoyalSettings.value = { ...newVal, tier_name: 'brand_loyal', logic_operator: newVal.logic_operator || 'OR' };
}, { deep: true, immediate: true });

watch(() => hotelLoyalSettings.value.hotel_id, (newHotelId) => {
    if (newHotelId) {
        const setting = loyaltyTiers.value.find(t => t.tier_name === 'hotel_loyal' && t.hotel_id === newHotelId);
        hotelLoyalSettings.value = { ...setting, hotel_id: newHotelId, tier_name: 'hotel_loyal', logic_operator: (setting && setting.logic_operator) || 'OR' };
    } else {
        hotelLoyalSettings.value = { hotel_id: null, tier_name: 'hotel_loyal', min_bookings: null, min_spending: null, logic_operator: 'OR', time_period_value: null, time_period_unit: null };
    }
}, { immediate: true });

watch(currentHotelLoyalSettingForSelectedHotel, (newVal) => {
    if (hotelLoyalSettings.value.hotel_id) {
        hotelLoyalSettings.value = { ...newVal, hotel_id: hotelLoyalSettings.value.hotel_id, tier_name: 'hotel_loyal', logic_operator: (newVal && newVal.logic_operator) || 'OR' };
    }
}, { deep: true });

const loadHotelDropdown = async () => {
    await fetchHotelList();
    hotels.value = hotelListFromStore.value.map(h => ({ id: h.id, name: h.name }));
};

const handleSaveSettings = async (tierData) => {
  if (!tierData.time_period_value || !tierData.time_period_unit) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Time period value and unit are required.', life: 3000 });
    return;
  }
  // tierData.tier_name should already be lowercase due to watchers
  if (tierData.tier_name === 'hotel_loyal' && !tierData.hotel_id) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Hotel is required for Hotel Loyal tier.', life: 3000 });
    return;
  }
  if ((tierData.tier_name === 'hotel_loyal' || tierData.tier_name === 'brand_loyal') && (tierData.min_bookings === null || tierData.min_bookings === undefined ) && (tierData.min_spending === null || tierData.min_spending === undefined)) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Either minimum bookings or minimum spending must be set.', life: 3000 });
    return;
  }
  if (tierData.tier_name === 'repeater' && (tierData.min_bookings === null || tierData.min_bookings === undefined )) {
    toast.add({ severity: 'warn', summary: 'Validation Error', detail: 'Minimum bookings must be set for Repeater tier.', life: 3000 });
    return;
  }

  const payload = { ...tierData };
  if (payload.tier_name === 'repeater' || payload.tier_name === 'brand_loyal') {
      payload.hotel_id = null;
  }
  if (payload.tier_name === 'repeater') {
      payload.logic_operator = null;
  } else if (!payload.logic_operator && (payload.tier_name === 'hotel_loyal' || payload.tier_name === 'brand_loyal')) {
      payload.logic_operator = 'OR';
  }

  try {
    await saveLoyaltyTier(payload);
    toast.add({ severity: 'success', summary: 'Success', detail: `${payload.tier_name} settings saved.`, life: 3000 });
  } catch (error) {
    console.error(`Error saving ${payload.tier_name} settings:`, error);
    toast.add({ severity: 'error', summary: 'Error', detail: `Failed to save ${payload.tier_name} settings. ${error.message || ''}`, life: 4000 });
  }
};

onMounted(async () => {
  await loadHotelDropdown();
  await fetchLoyaltyTiers();
});

</script>

<style scoped>
.p-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
</style>
