<template>
  <div class="p-card p-4">
    <h2 class="text-xl font-semibold text-gray-800 mb-6">ロイヤルティ層設定</h2>

    <TabView>
      <TabPanel header="リピーター">
        <div> <!-- New single root wrapper div -->
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
            <Button label="リピーター設定を保存" icon="pi pi-save" @click="handleSaveSettings(repeaterSettings)" :disabled="isRepeaterSaveDisabled" />
          </div>
        </div>
        <!-- DataTable for Repeater removed -->
      </div> <!-- End new single root wrapper div -->
      </TabPanel>

      <TabPanel header="ホテルロイヤル">
        <div> <!-- New single root wrapper div -->
          <div class="grid grid-cols-12 gap-x-6 gap-y-5 p-fluid">
            <div class="col-span-12 md:col-span-6">
              <FloatLabel class="mt-6">
              <Select id="hotel-loyal-hotel" v-model="hotelLoyalSettings.hotel_id" :options="hotels" optionLabel="name" optionValue="id" placeholder="ホテルを選択" @change="loadHotelLoyalSettings" class="w-full md:w-14rem" />
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
              <Select id="hotel-loyal-logic" v-model="hotelLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="演算子を選択" class="w-full" />
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
            <Button label="ホテルロイヤル設定を保存" icon="pi pi-save" @click="handleSaveSettings(hotelLoyalSettings)" :disabled="isHotelLoyalSaveDisabled" />
          </div>
        </div>
        <div class="mt-8" v-if="hotelLoyalDisplayData.length > 0">
          <h3 class="text-lg font-semibold mb-3">保存されたホテルロイヤル設定</h3>
          <DataTable :value="hotelLoyalDisplayData">
            <Column field="hotel_name" header="ホテル"></Column>
            <Column field="min_bookings" header="最低ホテル予約数"></Column>
            <Column field="min_spending" header="最低ホテル利用額" :bodyStyle="{textAlign: 'right'}">
              <template #body="slotProps">{{ slotProps.data.min_spending !== null ? formatCurrency(slotProps.data.min_spending) : '' }}</template>
            </Column>
            <Column field="logic_operator" header="論理演算子"></Column>
            <Column field="time_period_months" header="期間 (月数)"></Column>
            <Column header="操作">
              <template #body="slotProps">
                  <Button icon="pi pi-upload" class="p-button-rounded p-button-text" @click="editTierSetting(slotProps.data)" />
              </template>
            </Column>
          </DataTable>
        </div>
      </div> <!-- End new single root wrapper div -->
      </TabPanel>

      <TabPanel header="ブランドロイヤル">
          <div> <!-- New single root wrapper div -->
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
                <Select id="brand-loyal-logic" v-model="brandLoyalSettings.logic_operator" :options="logicOperators" optionLabel="name" optionValue="code" placeholder="演算子を選択" class="w-full" />
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
              <Button label="ブランドロイヤル設定を保存" icon="pi pi-save" @click="handleSaveSettings(brandLoyalSettings)" :disabled="isBrandLoyalSaveDisabled" />
            </div>
          </div>
          <!-- DataTable for Brand Loyal removed -->
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
import Select from 'primevue/select';
import Button from 'primevue/button';
import Toast from 'primevue/toast';
import { useToast } from 'primevue/usetoast';
import FloatLabel from 'primevue/floatlabel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { useSettingsStore } from '@/composables/useSettingsStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatCurrency } from '@/utils/formatUtils';

const toast = useToast();
const { loyaltyTiers, fetchLoyaltyTiers, saveLoyaltyTier } = useSettingsStore();
const { hotels: hotelListFromStore, fetchHotels: fetchHotelList } = useHotelStore();

let isEditingFromTable = false; // Add this flag

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

// Helper to reset specific fields of hotelLoyalSettings, keeping hotel_id and tier_name
const resetHotelLoyalFormFields = (hotelId) => {
  return {
    hotel_id: hotelId,
    tier_name: 'hotel_loyal',
    min_bookings: null,
    min_spending: null,
    logic_operator: 'OR', // Default logic operator
    time_period_months: null
  };
};

// Modify the watcher for hotel_id selection
watch(() => hotelLoyalSettings.value.hotel_id, (newHotelId) => {
    if (isEditingFromTable) { // If true, editTierSetting is handling it
        return;
    }

    let newSettings = resetHotelLoyalFormFields(newHotelId); // Reset first
    if (newHotelId) {
        const existingSetting = loyaltyTiers.value.find(t => t.tier_name === 'hotel_loyal' && t.hotel_id === newHotelId);
        if (existingSetting) {
            newSettings = { // Spread existing over the reset defaults
                ...newSettings, // Contains default logic_operator
                ...existingSetting, // existingSetting might not have logic_operator if null in DB
                logic_operator: existingSetting.logic_operator || 'OR' // Ensure default if null from DB
            };
        }
    }
    // To prevent potential infinite loops if the new settings are identical to current
    if (JSON.stringify(hotelLoyalSettings.value) !== JSON.stringify(newSettings)) {
        hotelLoyalSettings.value = newSettings;
    }
}, { immediate: true, deep: true });

// Modify the watcher for currentHotelLoyalSettingForSelectedHotel
watch(currentHotelLoyalSettingForSelectedHotel, (newVal) => {
    if (hotelLoyalSettings.value.hotel_id) {
        let freshSettings = resetHotelLoyalFormFields(hotelLoyalSettings.value.hotel_id);
        freshSettings = {
            ...freshSettings,
            ...newVal,
            logic_operator: newVal.logic_operator || 'OR'
        };
        // To avoid infinite loops if newVal is part of hotelLoyalSettings, compare before assigning
        if (JSON.stringify(hotelLoyalSettings.value) !== JSON.stringify(freshSettings)) {
            hotelLoyalSettings.value = freshSettings;
        }
    }
}, { deep: true });


const loadHotelDropdown = async () => { // This function was already here, used for populating hotel options
    await fetchHotelList();
    hotels.value = hotelListFromStore.value.map(h => ({ id: h.id, name: h.name }));
};

// This function is called on @change of the hotel dropdown for Hotel Loyal settings
const loadHotelLoyalSettings = () => {
    if (hotelLoyalSettings.value.hotel_id) {
        // Watcher handles form update
    } else {
        // Watcher handles form reset
    }
};

const isRepeaterSaveDisabled = computed(() => {
  return !(repeaterSettings.value.min_bookings !== null && repeaterSettings.value.min_bookings !== undefined &&
            repeaterSettings.value.time_period_months !== null && repeaterSettings.value.time_period_months !== undefined);
});

const isHotelLoyalSaveDisabled = computed(() => {
  return !(hotelLoyalSettings.value.hotel_id &&
            (hotelLoyalSettings.value.time_period_months !== null && hotelLoyalSettings.value.time_period_months !== undefined) &&
            ((hotelLoyalSettings.value.min_bookings !== null && hotelLoyalSettings.value.min_bookings !== undefined) ||
            (hotelLoyalSettings.value.min_spending !== null && hotelLoyalSettings.value.min_spending !== undefined)));
});

const isBrandLoyalSaveDisabled = computed(() => {
  return !((brandLoyalSettings.value.time_period_months !== null && brandLoyalSettings.value.time_period_months !== undefined) &&
            ((brandLoyalSettings.value.min_bookings !== null && brandLoyalSettings.value.min_bookings !== undefined) ||
            (brandLoyalSettings.value.min_spending !== null && brandLoyalSettings.value.min_spending !== undefined)));
});

const getHotelNameById = (id) => {
  const hotel = hotels.value.find(h => h.id === id);
  return hotel ? hotel.name : 'N/A';
};

/*
const repeaterDisplayData = computed(() =>
  loyaltyTiers.value.filter(t => t.tier_name === 'repeater')
);
*/

const hotelLoyalDisplayData = computed(() =>
  loyaltyTiers.value.filter(t => t.tier_name === 'hotel_loyal').map(t => ({
    ...t,
    hotel_name: getHotelNameById(t.hotel_id)
  }))
);

/*
const brandLoyalDisplayData = computed(() =>
  loyaltyTiers.value.filter(t => t.tier_name === 'brand_loyal')
);
*/

const editTierSetting = (setting) => {
  if (setting.tier_name === 'repeater') {
    repeaterSettings.value = { ...setting };
  } else if (setting.tier_name === 'hotel_loyal') {
    isEditingFromTable = true; // Set flag before updating
    const baseSettings = resetHotelLoyalFormFields(setting.hotel_id);
    hotelLoyalSettings.value = {
        ...baseSettings,
        ...setting,
        logic_operator: setting.logic_operator || 'OR'
    };
    // Reset the flag after Vue's reactivity cycle has processed the above change
    setTimeout(() => { isEditingFromTable = false; }, 0);
  } else if (setting.tier_name === 'brand_loyal') {
    brandLoyalSettings.value = { ...setting };
  }
  toast.add({severity:'info', summary: '情報', detail: `${getTierNameJP(setting.tier_name)}設定がフォームに読み込まれました。`, life: 3000});
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
    console.error(`${getTierNameJP(payload.tier_name)} 設定の保存エラー:`, error);
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
