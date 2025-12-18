<template>
  <div class="p-4">
    <Panel :header="`プラン (${selectedHotelName})`" class="mb-4">
      <div class="mb-4 mt-6" v-if="!showHotelRatePanel">
        <FloatLabel>
          <Select v-model="selectedHotelId" :options="hotels" optionLabel="name" optionValue="id" placeholder="ホテルを選択"
            class="w-full" />
          <label>ホテル選択</label>
        </FloatLabel>
      </div>

      <Tabs :value="activeTab" @update:value="onTabChange">
        <TabList>
          <Tab value="0">
            <i class="pi pi-globe"></i> グローバル
          </Tab>
          <Tab value="1">
            <i class="pi pi-building"></i> ホテル
          </Tab>
          <Tab v-if="selectedHotel" :value="2">
            <i class="pi pi-building-columns"></i> {{ selectedHotel.name }}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="0">
            <div id="globalTabPanel" v-show="!showGlobalRatePanel">
              <div class="flex justify-end mb-2">
                <Button @click="showGlobalDialog = true" icon="pi pi-plus" label="プラン追加"
                  class="p-button-right"></Button>
              </div>
              <DataTable :value="globalPlans">
                <Column field="name" header="名称"></Column>
                <Column field="plan_type" headerClass="text-center">
                  <template #header>
                    <span class="font-bold text-center w-full block">プランタイプ</span>
                  </template>
                  <template #body="slotProps">
                    <div class="flex items-center justify-center">
                      <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card"
                        style="color: darkgoldenrod;"></i>
                      <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;"></i>
                    </div>
                  </template>
                </Column>
                <Column field="description" header="詳細"></Column>
                <Column headerClass="text-center">
                  <template #header>
                    <span class="font-bold text-center w-full block">操作</span>
                  </template>
                  <template #body="slotProps">
                    <div class="flex items-center justify-center">
                      <Button icon="pi pi-pencil" class="p-button-text p-button-sm"
                        @click="openEditGlobalPlan(slotProps.data)" v-tooltip="'プラン編集'" />
                      <Button icon="pi pi-dollar" class="p-button-text p-button-sm"
                        @click="switchEditGlobalPlanRate(slotProps.data)" v-tooltip="'料金編集'" />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
            <div id="globalTabPanelRate" v-show="showGlobalRatePanel">
              <div class="grid xs:grid-cols-1 grid-cols-3 gap-2">
                <div class="flex justify-start mb-2">
                  <Button @click="switchEditGlobalPlanRate({})" icon="pi pi-arrow-left" label="前へ"
                    class="p-button-secondary mb-2" />
                </div>
                <div class="flex justify-start mb-2">
                  <span class="font-bold text-lg">{{ selectedPlan.name }}</span>
                </div>
              </div>

              <ManagePlansRates :plan="selectedPlan" v-if="showGlobalRatePanel" />
            </div>
          </TabPanel>
          <TabPanel value="1">
            <!-- Extracted Plans Table Component -->
            <ManageHotelPlansTable :hotelPlans="hotelPlans" :showHotelRatePanel="showHotelRatePanel"
              :selectedHotelId="selectedHotelId" @openAddPlanDialog="showHotelDialog = true"
              @openCopyPlansDialog="showCopyPlansDialog = true" @openEditPlanDialog="openEditHotelDialog"
              @switchEditHotelPlanRate="switchEditHotelPlanRate" @orderChanged="handleOrderChange"
              v-if="!showHotelRatePanel" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Panel>

    <Panel header="プランパターン" class="mt-4">
      <ManagePlansPatterns />
    </Panel>

    <Dialog header="グローバルプラン追加" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '50vw' }"
      class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="newGlobalPlan.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="newGlobalPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="newGlobalPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton v-model="newGlobalPlan.plan_type" :options="sb_options" optionLabel="label"
              optionValue="value" />
          </div>
        </div>
        <div class="col-span-2 pt-6">
          <FloatLabel>
            <Textarea v-model="newGlobalPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
      </div>

      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveGlobalPlan"
          class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false"
          class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="グローバルプラン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '50vw' }"
      class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="editGlobalPlan.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="editGlobalPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="editGlobalPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton v-model="editGlobalPlan.plan_type" :options="sb_options" optionLabel="label"
              optionValue="value" />
          </div>
        </div>
        <div class="col-span-2 pt-6">
          <FloatLabel>
            <Textarea v-model="editGlobalPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateGlobal"
          class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false"
          class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>

    <Dialog header="ホテルプラン追加" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '50vw' }" class="p-fluid"
      :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="newHotelPlan.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="newHotelPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="newHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton v-model="newHotelPlan.plan_type" :options="sb_options" optionLabel="label"
              optionValue="value" />
          </div>
        </div>
        <div class="col-span-2 pt-6 mb-2">
          <FloatLabel>
            <Textarea v-model="newHotelPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-2">
          <label for="globalPlanSelect" class="block mb-2">グローバルプランにリンクする（任意）</label>
          <Select id="globalPlanSelect" v-model="newHotelPlan.plans_global_id" :options="globalPlans" optionLabel="name"
            optionValue="id" placeholder="グローバルプランを選択" class="w-full" showClear filter />
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveHotelPlan"
          class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false"
          class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>

    <Dialog header="ホテルプラン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '50vw' }"
      class="p-fluid" :closable="true">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="editHotelPlan.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="editHotelPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="editHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton v-model="editHotelPlan.plan_type" :options="sb_options" optionLabel="label"
              optionValue="value" />
          </div>
        </div>
        <div class="col-span-2 pt-6 mb-2">
          <FloatLabel>
            <Textarea v-model="editHotelPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-2">
          <label for="globalPlanSelectEdit" class="block mb-2">グローバルプランにリンクする（任意）</label>
          <Select id="globalPlanSelectEdit" v-model="editHotelPlan.plans_global_id" :options="globalPlans"
            optionLabel="name" optionValue="id" placeholder="グローバルプランを選択する" class="w-full" showClear filter />
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="updateHotel" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false"
          class="p-button-danger p-button-text p-button-sm" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
// Vue
import { ref, computed, onMounted, watch } from 'vue';

import ManagePlansRates from './components/ManagePlansRates.vue';
import ManagePlansPatterns from './components/ManagePlansPatterns.vue';
import CopyPlansDialog from './components/dialogs/CopyPlansDialog.vue';
import AddHotelPlanDialog from './components/dialogs/AddHotelPlanDialog.vue';
import EditHotelPlanDialog from './components/dialogs/EditHotelPlanDialog.vue';
import ManageHotelPlansTable from './components/ManageHotelPlansTable.vue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { plans, fetchPlansGlobal, fetchPlansHotel, createGlobalPlan, updateGlobalPlan, createHotelPlan, updateHotelPlan, updatePlansOrderBulk, fetchPlanTypeCategories, fetchPlanPackageCategories } = usePlansStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import Panel from 'primevue/panel';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import Button from 'primevue/button';
import {
  Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column,
  InputText, ColorPicker, Textarea, SelectButton, Badge
} from 'primevue'

// Helper
const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

const globalPlans = ref([]);
const hotelPlans = ref([]);
const loading = ref(false);
const selectedHotelId = ref(null);

const selectedHotelName = computed(() => {
  const hotel = hotels.value.find(h => h.id === selectedHotelId.value);
  return hotel ? hotel.name : 'ホテル選択';
});

const sb_options = ref([
  { label: '部屋', value: 'per_room' },
  { label: '１人当たり', value: 'per_person' },
]);

const planTypeCategories = ref([]);
const planPackageCategories = ref([]);

// Tabs
const activeTab = ref(0);
const selectedHotel = ref(null);

const onTabChange = (newTabValue) => {
  activeTab.value = newTabValue; // Update activeTab value when tab changes
};
const selectHotel = (hotel) => {
  //console.log('Selected Hotel:', hotel);
  selectedHotel.value = hotel;
  activeTab.value = 2;
};

// Global Dialog
const newGlobalPlan = ref({
  name: '',
  description: '',
  plan_type: 'per_room',
  colorHEX: 'D3D3D3'
});
const editGlobalPlan = ref({
  id: null,
  name: '',
  description: '',
  colorHEX: 'D3D3D3'
});
const showGlobalDialog = ref(false);
const showEditGlobalDialog = ref(false);
const openEditGlobalPlan = async (data) => {
  editGlobalPlan.value = {
    ...data
    , colorHEX: data.color.replace('#', '')
  };
  showEditGlobalDialog.value = true;
};
const saveGlobalPlan = async () => {
  // Check for duplicate keys
  const PlanSet = new Set();
  for (const plan of globalPlans.value) {
    PlanSet.add(plan.name);
    if (PlanSet.has(newGlobalPlan.value.name)) {
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: 'プラン名はユニークである必要があります。', life: 3000
      });
      return;
    }
  }

  try {
    await createGlobalPlan(newGlobalPlan.value);
    await fetchPlansGlobal();
    globalPlans.value = plans.value;
    showGlobalDialog.value = false;
    newGlobalPlan.value = {
      name: '',
      description: '',
      plan_type: 'per_room',
      colorHEX: 'D3D3D3'
    };
    toast.add({ severity: 'success', summary: '成功', detail: 'グローバルプラン追加されました。', life: 3000 });
  } catch (err) {
    console.error('グローバルプランの保存エラー:', err);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルプランの保存に失敗しました', life: 3000 });
  }
};
const updateGlobal = async () => {
  // Filter out the current id from globalPlans
  const filteredPlans = globalPlans.value.filter(plan => plan.id !== editGlobalPlan.value.id);

  // Check for duplicate keys
  const PlanSet = new Set();
  for (const plan of filteredPlans) {
    PlanSet.add(plan.name);
    if (PlanSet.has(editGlobalPlan.value.name)) {
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: 'プラン名はユニークである必要があります。', life: 3000
      });
      return;
    }
  }

  try {
    await updateGlobalPlan(editGlobalPlan.value.id, editGlobalPlan.value);
    await fetchPlansGlobal();
    globalPlans.value = plans.value;
    showEditGlobalDialog.value = false;
    editGlobalPlan.value = {
      id: null,
      name: '',
      description: '',
      colorHEX: 'D3D3D3'
    };
    toast.add({ severity: 'success', summary: '成功', detail: 'グローバルプラン更新されました。', life: 3000 });
  } catch (err) {
    console.error('グローバルプランの更新エラー:', err);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルプランの更新に失敗しました', life: 3000 });
  }
};

// Hotel Dialog
const newHotelPlan = ref({
  hotel_id: null,
  name: '',
  description: '',
  plan_type: 'per_room',
  colorHEX: 'D3D3D3',
  plans_global_id: null
});
const editHotelPlan = ref({
  id: null,
  hotel_id: null,
  name: '',
  description: '',
  plan_type: 'per_room',
  colorHEX: 'D3D3D3',
  plan_type_category_id: null,
  plan_package_category_id: null,
  display_order: 0,
  is_active: true,
  available_from: null,
  available_until: null,
});
const showHotelDialog = ref(false);
const showEditHotelDialog = ref(false);
const openEditHotelDialog = async (data) => {
  editHotelPlan.value = {
    ...data
    , colorHEX: data.color.replace('#', '')
  };
  showEditHotelDialog.value = true;
};

const onPlanModified = async () => {
  if (selectedHotelId.value) {
    await fetchPlansHotel(selectedHotelId.value, true);
    hotelPlans.value = plans.value;
    await reindexPlans(); // Reindex after plans are modified (full sort)
  }
};

const onRowReorder = async (event) => {
  hotelPlans.value = event.value; // The reordered list from DataTable
  const plansWithNewOrder = hotelPlans.value.map((plan, index) => ({
    ...plan,
    display_order: index,
  }));
  try {
    await updatePlansOrderBulk(selectedHotelId.value, plansWithNewOrder);
    toast.add({ severity: 'success', summary: '成功', detail: 'プランの表示順序が更新されました。', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: '失敗', detail: 'プランの表示順序の更新に失敗しました。', life: 3000 });
  }
};

const handleOrderChange = async (updatedPlansArray) => { // This will now receive the reordered array from child component
  console.log('handleOrderChange: updatedPlansArray type:', typeof updatedPlansArray, 'value:', updatedPlansArray); // Debug log
  if (!Array.isArray(updatedPlansArray)) {
    console.error('handleOrderChange: updatedPlansArray is not an array!', updatedPlansArray);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'プランの順序更新に失敗しました: 無効なデータを受信しました。', life: 3000 });
    return;
  }
  // Assuming updatedPlansArray is the new ordered array of plans from the child DataTable
  hotelPlans.value = updatedPlansArray; // Update parent's hotelPlans
  await reindexPlans(true); // Call reindexing logic, preserving current order
};

// New function to reindex plans and update them in bulk
const reindexPlans = async (preserveCurrentOrder = false) => { // Added parameter
  let plansToReindex = [...hotelPlans.value]; // Start with current plans

  if (!preserveCurrentOrder) {
    // Separate active and inactive plans
    const active = plansToReindex.filter(plan => plan.is_active);
    const inactive = plansToReindex.filter(plan => !plan.is_active);

    // Sort active plans by their current display_order or name if order is same
    active.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.plan_name.localeCompare(b.plan_name));
    // Sort inactive plans by their current display_order or name
    inactive.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.plan_name.localeCompare(b.plan_name));

    plansToReindex = [...active, ...inactive];
  }

  // Combine and re-assign display_order sequentially based on plansToReindex
  const reindexedPlans = plansToReindex.map((plan, index) => ({
    ...plan,
    display_order: index,
  }));

  // Update local state and then send to backend
  hotelPlans.value = reindexedPlans;

  console.log('reindexPlans: Sending to backend:', reindexedPlans); // Add this log

  try {
    await updatePlansOrderBulk(selectedHotelId.value, reindexedPlans);
    toast.add({ severity: 'success', summary: '成功', detail: 'プランの表示順序が更新されました。', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: '失敗', detail: 'プランの表示順序の更新に失敗しました。', life: 3000 });
  }
};

const filteredHotelPlans = computed(() => {
  if (selectedHotel.value) {
    const filtered = hotelPlans.value.filter(plan => plan.hotel_id === selectedHotel.value.id);
    // console.log('Filtered Hotel:', filtered);
    return filtered;
  }
  return [];
});
const getPlansCount = (hotel_id) => {
  return hotelPlans.value.filter(plan => plan.hotel_id === hotel_id).length;
};
const saveHotelPlan = async () => {
  newHotelPlan.value.hotel_id = selectedHotel.value.id;

  // Check for duplicate keys
  const PlanSet = new Set();
  const newPlanKey = `${newHotelPlan.value.name}-${newHotelPlan.value.hotel_id}`;
  for (const plan of hotelPlans.value) {
    const planKey = `${plan.name}-${plan.hotel_id}`;
    PlanSet.add(planKey);
    if (PlanSet.has(newPlanKey)) {
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: '選択したホテルに対してプラン名はユニークである必要があります。', life: 3000
      });
      return;
    }
  }
  try {
    await createHotelPlan(newHotelPlan.value);
    await fetchPlansHotel();
    hotelPlans.value = plans.value;
    showHotelDialog.value = false;
    newHotelPlan.value = {
      hotel_id: null,
      name: '',
      description: '',
      plan_type: 'per_room',
      colorHEX: 'D3D3D3',
      plans_global_id: null
    };
    toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン追加されました。', life: 3000 });
  } catch (err) {
    console.error('ホテルプランの保存エラー:', err);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの保存に失敗しました', life: 3000 });
  }
};
const updateHotel = async () => {
  editHotelPlan.value.hotel_id = selectedHotel.value.id;

  // Filter out the current id from hotelPlans
  const filteredPlans = hotelPlans.value.filter(plan => plan.id !== editHotelPlan.value.id);

  // Check for duplicate keys
  const PlanSet = new Set();
  const newPlanKey = `${editHotelPlan.value.name}-${editHotelPlan.value.hotel_id}`;
  for (const plan of filteredPlans) {
    const planKey = `${plan.name}-${plan.hotel_id}`;
    PlanSet.add(planKey);
    if (PlanSet.has(newPlanKey)) {
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: '選択したホテルに対してプラン名はユニークである必要があります。', life: 3000
      });
      return;
    }
  }

  try {
    await updateHotelPlan(editHotelPlan.value.id, editHotelPlan.value);
    await fetchPlansHotel();
    hotelPlans.value = plans.value;
    showEditHotelDialog.value = false;
    editHotelPlan.value = {
      id: null,
      hotel_id: null,
      plans_global_id: null,
      name: '',
      description: '',
      colorHEX: 'D3D3D3'
    };
    toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン更新されました。', life: 3000 });
  } catch (err) {
    console.error('ホテルプランの更新エラー:', err);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの更新に失敗しました', life: 3000 });
  }
};

// Rates
const showGlobalRatePanel = ref(false);
const showHotelRatePanel = ref(false);
const selectedPlan = ref({});
const switchEditGlobalPlanRate = (plan, context = 'global') => {
  if (plan === null || isEmptyObject(plan)) {
    showGlobalRatePanel.value = false;
    selectedPlan.value = {};
  } else {
    showGlobalRatePanel.value = true;
    selectedPlan.value = { ...plan, context };
  }
};
const switchEditHotelPlanRate = (plan, context = 'hotel') => {
  if (plan === null || isEmptyObject(plan)) {
    showHotelRatePanel.value = false;
    selectedPlan.value = {};
  } else {
    showHotelRatePanel.value = true;
    selectedPlan.value = { ...plan, context };
  }
};

onMounted(async () => {
  loading.value = true

  try {
    await fetchPlansGlobal();
    globalPlans.value = plans.value;
    await fetchPlansHotel();
    hotelPlans.value = plans.value;
    await fetchHotels();
    planTypeCategories.value = await fetchPlanTypeCategories();
    planPackageCategories.value = await fetchPlanPackageCategories();

    if (hotels.value.length > 0) {
      selectedHotelId.value = hotels.value[0].id; // Initialize selectedHotelId
    }
  } catch (error) {
    console.error('Error in ManagePlans mounted hook:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: '初期データの読み込みに失敗しました。', life: 5000 });
  } finally {
    loading.value = false;
  }
});

// Watcher for selectedHotelId
watch(selectedHotelId, async (newVal) => {
  if (newVal) {
    loading.value = true;
    await fetchPlansHotel(newVal, true);
    // Enhance hotelPlans with category names
    hotelPlans.value = plans.value.map(plan => ({
      ...plan,
      id: plan.plan_key, // Map plan_id to plan_key for DataTable dataKey
      plan_type_category_name: planTypeCategories.value.find(cat => cat.id === plan.plan_type_category_id)?.name,
      plan_package_category_name: planPackageCategories.value.find(cat => cat.id === plan.plan_package_category_id)?.name,
    }));
    loading.value = false;
  }
});
</script>