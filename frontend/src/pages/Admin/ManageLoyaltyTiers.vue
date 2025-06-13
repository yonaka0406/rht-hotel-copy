<template>
  <div class="p-card p-4">
    <h2 class="text-xl font-semibold text-gray-800 mb-6">ロイヤルティ層設定</h2>

    <TabView>
      <TabPanel header="リピーター">
        <div class="grid grid-cols-12 gap-x-6 gap-y-5 p-fluid">
          <div class="col-span-12 md:col-span-6">
            <FloatLabel class="mt-6">
              <InputNumber id="repeater-min-bookings" v-model="repeaterSettings.min_bookings" class="w-full" />
              <label for="repeater-min-bookings">最低合計予約数</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-6">
            <FloatLabel class="mt-6">
              <InputNumber id="repeater-time-months" v-model="repeaterSettings.time_period_months" class="w-full" />
              <label for="repeater-time-months">期間 (月数)</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 mt-2">
            <Button label="リピーター設定を保存" icon="pi pi-save" @click="handleSaveSettings(repeaterSettings)" />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="ホテルロイヤル">
        <div class="grid grid-cols-12 gap-x-6 gap-y-5 p-fluid">
          <div class="col-span-12 md:col-span-6">
            <FloatLabel class="mt-6">
              <Dropdown id="hotel-loyal-hotel" v-model="hotelLoyalSettings.hotel_id" :options="hotels" optionLabel="name" optionValue="id" placeholder="ホテルを選択" @change="loadHotelLoyalSettings" class="w-full md:w-14rem" />
              <label for="hotel-loyal-hotel">ホテル</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-3">
            <FloatLabel class="mt-6">
              <InputNumber id="hotel-loyal-min-bookings" v-model="hotelLoyalSettings.min_bookings" class="w-full" />
              <label for="hotel-loyal-min-bookings">最低ホテル予約数</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-3">
            <FloatLabel class="mt-6">
              <InputNumber id="hotel-loyal-min-spending" v-model="hotelLoyalSettings.min_spending" mode="currency" currency="JPY" class="w-full" />
              <label for="hotel-loyal-min-spending">最低ホテル利用額</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-4">
            <FloatLabel class="mt-6">
              <Dropdown id="hotel-loyal-logic" v-model="hotelLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="演算子を選択" class="w-full" />
              <label for="hotel-loyal-logic">論理演算子</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-4">
            <FloatLabel class="mt-6">
              <InputNumber id="hotel-loyal-time-months" v-model="hotelLoyalSettings.time_period_months" class="w-full" />
              <label for="hotel-loyal-time-months">期間 (月数)</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 mt-2">
            <Button label="ホテルロイヤル設定を保存" icon="pi pi-save" @click="handleSaveSettings(hotelLoyalSettings)" :disabled="!hotelLoyalSettings.hotel_id" />
          </div>
        </div>
      </TabPanel>

      <TabPanel header="ブランドロイヤル">
        <div class="grid grid-cols-12 gap-x-6 gap-y-5 p-fluid">
          <div class="col-span-12 md:col-span-4">
            <FloatLabel class="mt-6">
              <InputNumber id="brand-loyal-min-bookings" v-model="brandLoyalSettings.min_bookings" class="w-full" />
              <label for="brand-loyal-min-bookings">最低ブランド予約数</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-4">
            <FloatLabel class="mt-6">
              <InputNumber id="brand-loyal-min-spending" v-model="brandLoyalSettings.min_spending" mode="currency" currency="JPY" class="w-full" />
              <label for="brand-loyal-min-spending">最低ブランド利用額</label>
            </FloatLabel>
          </div>
           <div class="col-span-12 md:col-span-4">
            <FloatLabel class="mt-6">
              <Dropdown id="brand-loyal-logic" v-model="brandLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="演算子を選択" class="w-full" />
              <label for="brand-loyal-logic">論理演算子</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 md:col-span-6">
            <FloatLabel class="mt-6">
              <InputNumber id="brand-loyal-time-months" v-model="brandLoyalSettings.time_period_months" class="w-full" />
              <label for="brand-loyal-time-months">期間 (月数)</label>
            </FloatLabel>
          </div>
          <div class="col-span-12 mt-2">
            <Button label="ブランドロイヤル設定を保存" icon="pi pi-save" @click="handleSaveSettings(brandLoyalSettings)" />
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
import FloatLabel from 'primevue/floatlabel';
import { useSettingsStore } from '@/composables/useSettingsStore';
import { useHotelStore } from '@/composables/useHotelStore';

const toast = useToast();
const { loyaltyTiers, fetchLoyaltyTiers, saveLoyaltyTier } = useSettingsStore();
const { hotels: hotelListFromStore, fetchHotels: fetchHotelList } = useHotelStore();

const repeaterSettings = ref({});
const hotelLoyalSettings = ref({ hotel_id: null, time_period_months: null });
const brandLoyalSettings = ref({ time_period_months: null });

const logicOperators = ref([
  { name: 'かつ (AND)', code: 'AND' },
  { name: 'または (OR)', code: 'OR' },
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
    repeaterSettings.value = {
        min_bookings: newVal.min_bookings,
        time_period_months: newVal.time_period_months,
        tier_name: 'repeater',
        logic_operator: newVal.logic_operator || null
    };
}, { deep: true, immediate: true });

watch(currentBrandLoyalSetting, (newVal) => {
    brandLoyalSettings.value = {
        min_bookings: newVal.min_bookings,
        min_spending: newVal.min_spending,
        time_period_months: newVal.time_period_months,
        tier_name: 'brand_loyal',
        logic_operator: newVal.logic_operator || 'OR'
    };
}, { deep: true, immediate: true });

watch(() => hotelLoyalSettings.value.hotel_id, (newHotelId) => {
    if (newHotelId) {
        const setting = loyaltyTiers.value.find(t => t.tier_name === 'hotel_loyal' && t.hotel_id === newHotelId);
        hotelLoyalSettings.value = {
            ...setting,
            hotel_id: newHotelId,
            tier_name: 'hotel_loyal',
            logic_operator: (setting && setting.logic_operator) || 'OR',
            time_period_months: (setting && setting.time_period_months) || null // Ensure time_period_months is part of the reset
        };
    } else {
        hotelLoyalSettings.value = {
            hotel_id: null,
            tier_name: 'hotel_loyal',
            min_bookings: null,
            min_spending: null,
            logic_operator: 'OR',
            time_period_months: null // Changed from time_period_value and time_period_unit removed
        };
    }
}, { immediate: true });

watch(currentHotelLoyalSettingForSelectedHotel, (newVal) => {
    if (hotelLoyalSettings.value.hotel_id) { // Only update if a hotel is selected
        hotelLoyalSettings.value = {
            ...newVal,
            hotel_id: hotelLoyalSettings.value.hotel_id,
            tier_name: 'hotel_loyal',
            logic_operator: (newVal && newVal.logic_operator) || 'OR',
            time_period_months: (newVal && newVal.time_period_months) || null // Ensure time_period_months is part of the reset
        };
    }
}, { deep: true });


const loadHotelDropdown = async () => { // This function was already here, used for populating hotel options
    await fetchHotelList();
    hotels.value = hotelListFromStore.value.map(h => ({ id: h.id, name: h.name }));
};

// This function is called on @change of the hotel dropdown for Hotel Loyal settings
const loadHotelLoyalSettings = () => {
    if (hotelLoyalSettings.value.hotel_id) {
        // The watcher for hotelLoyalSettings.value.hotel_id already handles updating the form
        // based on the selected hotel_id by finding the settings from loyaltyTiers.value.
        // So, this function might not need to do much more if the watchers are effective.
    } else {
        // If hotel is deselected, watcher for hotel_id already resets hotelLoyalSettings.
    }
};

const handleSaveSettings = async (tierData) => {
  if (tierData.time_period_months === null || tierData.time_period_months === undefined) {
    toast.add({ severity: 'warn', summary: '検証エラー', detail: '期間 (月数) は必須です。', life: 3000 });
    return;
  }
  // tierData.tier_name should already be lowercase due to watchers
  if (tierData.tier_name === 'hotel_loyal' && !tierData.hotel_id) {
    toast.add({ severity: 'warn', summary: '検証エラー', detail: 'ホテルロイヤル層にはホテル選択が必須です。', life: 3000 });
    return;
  }
  if ((tierData.tier_name === 'hotel_loyal' || tierData.tier_name === 'brand_loyal') && (tierData.min_bookings === null || tierData.min_bookings === undefined ) && (tierData.min_spending === null || tierData.min_spending === undefined)) {
    toast.add({ severity: 'warn', summary: '検証エラー', detail: '最低予約数または最低利用額のいずれかを設定する必要があります。', life: 3000 });
    return;
  }
  if (tierData.tier_name === 'repeater' && (tierData.min_bookings === null || tierData.min_bookings === undefined )) {
    toast.add({ severity: 'warn', summary: '検証エラー', detail: 'リピーター層には最低予約数を設定する必要があります。', life: 3000 });
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
    toast.add({ severity: 'success', summary: '成功', detail: `${getTierNameJP(payload.tier_name)} 設定が保存されました。`, life: 3000 });
  } catch (error) {
    console.error(`Error saving ${payload.tier_name} settings:`, error);
    toast.add({ severity: 'error', summary: 'エラー', detail: `${getTierNameJP(payload.tier_name)} 設定の保存に失敗しました。 ${error.message || ''}`, life: 4000 });
  }
};

const getTierNameJP = (tierCode) => {
  switch (tierCode.toLowerCase()) {
    case 'repeater': return 'リピーター';
    case 'hotel_loyal': return 'ホテルロイヤル';
    case 'brand_loyal': return 'ブランドロイヤル';
    default: return tierCode;
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
