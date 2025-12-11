<template>
  <div class="p-4">
    <Panel header="アドオン">
      <div class="flex justify-end mb-2">
        <Button                
          @click="openNewAddonDialog"
          icon="pi pi-plus"
          label="アドオン追加"
          :disabled="!selectedHotel"
        ></Button>
      </div>

      <div class="mb-4">
        <label class="block mb-2 font-bold">ホテル選択</label>
        <Select
          v-model="selectedHotel"
          :options="hotels"
          optionLabel="name"
          placeholder="ホテルを選択してください"
          class="w-full"
          filter
        />
      </div>

      <DataTable :value="hotelAddons" :loading="loading">
        <Column field="name" header="名称"></Column>
        <Column field="price">
          <template #header>
            <span class="font-bold">単価（税込）</span>
          </template>
          <template #body="slotProps">
            <span>{{formatCurrency(slotProps.data.price)}}</span>
          </template>
        </Column>
        <Column field="tax_type_id">
          <template #header>
            <span class="font-bold">税率</span>
          </template>
          <template #body="slotProps">
            <span>{{ getTaxRatePercentage(slotProps.data.tax_type_id) }}%</span>
          </template>
        </Column>
        <Column field="type" header="アドオン区分">
          <template #body="slotProps">
            <Badge :value="getAddonTypeName(slotProps.data.addon_category_id)" severity="secondary"></Badge>
          </template>
        </Column>
        <Column field="visible">
          <template #header>
            <span class="font-bold">ステータス</span>
          </template>
          <template #body="slotProps">
            <div class="flex items-center justify-center">  
              <i v-if="slotProps.data.visible" class="pi pi-eye" style="color: green;"></i>
              <i v-else class="pi pi-eye-slash" style="color: red;"></i>
            </div>
          </template>
        </Column>
        <Column>
          <template #header>
            <span class="font-bold">操作</span>
          </template>
          <template #body="slotProps">
            <div class="flex items-center justify-center"> 
              <Button 
                icon="pi pi-pencil" 
                class="p-button-text p-button-sm" 
                @click="openEditAddonDialog(slotProps.data)"
                v-tooltip="'アドオン編集'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </Panel>

    <HotelAddonDialog
      v-model:visible="showAddonDialog"
      :addon="currentAddon"
      :is-edit="isEditMode"
      :addon-types="addonCategories"
      :tax-types="taxTypes"
      :default-tax-type-id="defaultTaxTypeId"
      @save="handleSaveAddon"
    />
  </div>
</template>

<script setup>
  // Vue
  import { ref, computed, onMounted, watch } from 'vue';

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { Panel, DataTable, Column, Button, Select, Badge } from 'primevue';

  // Components
  import HotelAddonDialog from './components/HotelAddonDialog.vue';

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { useSettingsStore } from '@/composables/useSettingsStore';
  const { taxTypes, fetchTaxTypes } = useSettingsStore();
  import { useAddonsStore } from '@/composables/useAddonsStore';
  const { hotelAddons, fetchAddonsForHotel, createHotelAddon, updateHotelAddon, addonCategories, fetchAddonCategories } = useAddonsStore();

  const defaultTaxTypeId = computed(() => {
    // Guard against null or undefined taxTypes
    if (!taxTypes.value || taxTypes.value.length === 0) {
      return 3; // Default fallback
    }
    
    // Attempt to find '標準税率' (Standard Tax Rate)
    const standardTaxType = taxTypes.value.find(type => type.name === '標準税率');
    if (standardTaxType) {
      return standardTaxType.id;
    }
    
    // Fallback to the first available tax type
    return taxTypes.value[0].id;
  });

  // Helper
  const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
  };
  const getAddonTypeName = (id) => {
    const addonCategory = addonCategories.value.find(cat => cat.id === id);
    return addonCategory ? addonCategory.name : id;
  };
  const getTaxRatePercentage = (taxTypeId) => {
    const taxType = taxTypes.value.find(t => t.id === taxTypeId);
    return taxType ? taxType.percentage * 100 : 0; // Assuming percentage is stored as a decimal (e.g., 0.1 for 10%)
  };

  // State
  const loading = ref(false);
  const error = ref(null);

  // Hotel Addons
  const selectedHotel = ref(null);
  const showAddonDialog = ref(false);
  const isEditMode = ref(false);
  const currentAddon = ref(null);

  const openNewAddonDialog = () => {
    currentAddon.value = null;
    isEditMode.value = false;
    showAddonDialog.value = true;
  };

  const openEditAddonDialog = (addon) => {
    currentAddon.value = { ...addon };
    isEditMode.value = true;
    showAddonDialog.value = true;
  };

  const handleSaveAddon = async (addonData) => {
    addonData.hotel_id = selectedHotel.value.id;

    // Check for duplicate keys
    const filteredAddons = isEditMode.value 
      ? hotelAddons.value.filter(addon => addon.id !== addonData.id)
      : hotelAddons.value;

    const AddonSet = new Set();
    const newAddonKey = `${addonData.name}-${addonData.hotel_id}`;
    for (const addon of filteredAddons) {
      const addonKey = `${addon.name}-${addon.hotel_id}`;
      AddonSet.add(addonKey);              
      if (AddonSet.has(newAddonKey)) {
        toast.add({ 
          severity: 'error', 
          summary: 'エラー',
          detail: '唯一アドオン名称が必要', 
          life: 3000 
        });
        return;
      }
    }

    try {
      loading.value = true;

      if (isEditMode.value) {
        await updateHotelAddon(addonData.id, addonData);
        toast.add({ 
          severity: 'success', 
          summary: '成功', 
          detail: 'ホテルアドオンが更新されました。', 
          life: 3000 
        });
      } else {
        await createHotelAddon(addonData);
        toast.add({ 
          severity: 'success', 
          summary: '成功', 
          detail: 'ホテルアドオンが追加されました。', 
          life: 3000 
        });
      }

      showAddonDialog.value = false;
    } catch (err) {
      console.error('ホテルアドオンの保存エラー:', err);
      toast.add({ 
        severity: 'error', 
        summary: 'エラー', 
        detail: 'ホテルアドオンの保存に失敗しました', 
        life: 3000 
      });
    } finally {
      loading.value = false;
    }
  };
                    
  onMounted(async () => {
    loading.value = true;
    try {
      await fetchHotels(); 
      await fetchTaxTypes();
      await fetchAddonCategories();
      // fetchHotelAddons() is removed as addons will be fetched based on selectedHotel
    } catch (err) {
      console.error('初期化エラー:', err);
      error.value = err.message || '初期化に失敗しました';
    } finally {
      loading.value = false;
    }
  });
          
  // Watcher for selectedHotel
  watch(selectedHotel, async (newVal) => {
      if (newVal && newVal.id) {
          loading.value = true;
          try {
              await fetchAddonsForHotel(newVal.id);
          } catch (err) {
              console.error('Failed to fetch addons for selected hotel:', err);
              error.value = err.message || '選択したホテルのアドオンの取得に失敗しました';
          } finally {
              loading.value = false;
          }
      } else {
          hotelAddons.value = []; // Clear addons if no hotel is selected
      }
  });
          
</script>
