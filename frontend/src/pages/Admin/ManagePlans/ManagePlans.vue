<template>
    <div class="p-4">
      <Panel header="プラン">
        <div class="mb-4">
          <FloatLabel>
            <Select
              v-model="selectedHotelId"
              :options="hotels"
              optionLabel="name"
              optionValue="id"
              placeholder="ホテルを選択"
              class="w-full"
            />
            <label>ホテル選択</label>
          </FloatLabel>
        </div>
              <div id="hotelTabPanel" v-show="!showHotelRatePanel">
                <div class="flex justify-end mb-2">
                  <Button                
                    @click="showHotelDialog = true"
                    icon="pi pi-plus"
                    label="プラン追加"
                    class="p-button-right"
                  ></Button>
                  <Button                
                    @click="openCopyPlansDialog"
                    icon="pi pi-copy"
                    label="プランコピー"
                    class="p-button-right ml-2"
                  ></Button>
                </div> 
                <DataTable :value="hotelPlans" editMode="row" dataKey="id" @rowReorder="onRowReorder">
                  <Column rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />
                  <Column field="name" header="名称" style="width: 20%"></Column>
                  <Column field="plan_type" headerClass="text-center" style="width: 10%">
                    <template #header>
                      <span class="font-bold text-center w-full block">プランタイプ</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center">  
                        <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;"></i>
                        <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;"></i>                      
                      </div>
                    </template>
                  </Column>
                  <Column field="description" header="詳細" style="width: 20%"></Column>
                  <Column field="plan_type_category_name" header="タイプカテゴリー" style="width: 15%"></Column>
                  <Column field="plan_package_category_name" header="パッケージカテゴリー" style="width: 15%"></Column>                  
                  <Column headerClass="text-center" style="width: 10%">
                    <template #header>
                      <span class="font-bold text-center w-full block">操作</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center"> 
                        <Button 
                          icon="pi pi-pencil" 
                          class="p-button-text p-button-sm" 
                          @click="openEditHotelDialog(slotProps.data)"
                          v-tooltip="'プラン編集'"
                        />
                        <Button 
                          icon="pi pi-dollar" 
                          class="p-button-text p-button-sm" 
                          @click="switchEditHotelPlanRate(slotProps.data)"
                          v-tooltip="'料金編集'"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </div>
              <div id="hotelTabPanelRate" v-show="showHotelRatePanel">
                <div class="grid xs:grid-cols-1 grid-cols-3 gap-2">
                  <div class="flex justify-start mb-2">
                    <Button @click="switchEditHotelPlanRate({})" icon="pi pi-arrow-left" label="前へ" class="p-button-secondary mb-2" />
                  </div>
                  <div class="flex justify-start mb-2">
                    <span class="font-bold text-lg">{{ selectedPlan.name }}</span>
                  </div>                  
                </div>
                                
                <ManagePlansRates :plan="selectedPlan" :selectedHotelId="selectedHotelId" v-if="showHotelRatePanel" />
              </div>
      </Panel>

      <Panel header="プランパターン" class="mt-4">
        <ManagePlansPatterns :selectedHotelId="selectedHotelId" />
      </Panel>

      <Dialog header="ホテルプラン追加" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true">
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
              <SelectButton
                v-model="newHotelPlan.plan_type"
                :options="sb_options"
                optionLabel="label"
                optionValue="value"
              />
            </div>
          </div>
          <div class="col-span-1 pt-6">
            <FloatLabel>
                <Select
                    v-model="newHotelPlan.plan_type_category_id"
                    :options="planTypeCategories"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="タイプカテゴリーを選択"
                    class="w-full"
                    showClear
                />
                <label>タイプカテゴリー</label>
            </FloatLabel>
          </div>
          <div class="col-span-1 pt-6">
            <FloatLabel>
                <Select
                    v-model="newHotelPlan.plan_package_category_id"
                    :options="planPackageCategories"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="パッケージカテゴリーを選択"
                    class="w-full"
                    showClear
                />
                <label>パッケージカテゴリー</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 pt-6 mb-2">
            <FloatLabel>
              <Textarea v-model="newHotelPlan.description" fluid />
              <label>詳細</label>
            </FloatLabel>
          </div>
        </div>
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="saveHotelPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
      </Dialog>

      <Dialog header="ホテルプラン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true">
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
              <SelectButton
                v-model="editHotelPlan.plan_type"
                :options="sb_options"
                optionLabel="label"
                optionValue="value"
              />
            </div>
          </div>
          <div class="col-span-1 pt-6">
            <FloatLabel>
                <Select
                    v-model="editHotelPlan.plan_type_category_id"
                    :options="planTypeCategories"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="タイプカテゴリーを選択"
                    class="w-full"
                    showClear
                />
                <label>タイプカテゴリー</label>
            </FloatLabel>
          </div>
          <div class="col-span-1 pt-6">
            <FloatLabel>
                <Select
                    v-model="editHotelPlan.plan_package_category_id"
                    :options="planPackageCategories"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="パッケージカテゴリーを選択"
                    class="w-full"
                    showClear
                />
                <label>パッケージカテゴリー</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 pt-6 mb-2">
            <FloatLabel>
              <Textarea v-model="editHotelPlan.description" fluid />
              <label>詳細</label>
            </FloatLabel>
          </div>
        </div>
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="updateHotel" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
      </Dialog>
      <CopyPlansDialog :visible="showCopyPlansDialog" @update:visible="showCopyPlansDialog = $event" @planCopied="onPlanCopied" />
    </div>
</template>
  
<script setup>
  // Vue
  import { ref, computed, onMounted } from 'vue';

  import ManagePlansRates from '../ManagePlansRates.vue';
  import ManagePlansPatterns from '@/pages/Admin/ManagePlans/components/ManagePlansPatterns.vue';
  import CopyPlansDialog from './components/CopyPlansDialog.vue';

  import CopyPlansDialog from './components/CopyPlansDialog.vue'; // Assuming this is where it's located
  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { usePlansStore } from '@/composables/usePlansStore';
  const { plans, fetchPlansHotel, createHotelPlan, updateHotelPlan, fetchPlanTypeCategories, fetchPlanPackageCategories } = usePlansStore();  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { Panel, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column,
    FloatLabel, InputText, ColorPicker, Textarea, Select, SelectButton, Button, Badge } from 'primevue'  

  // Helper
  const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };
    
  const hotelPlans = ref([]); 
  const loading = ref(false);
  const selectedHotelId = ref(null); // Renamed from currentHotelId

  const sb_options = ref([
    { label: '部屋', value: 'per_room' },
    { label: '１人当たり', value: 'per_person' },
  ]);

  const planTypeCategories = ref([]);
  const planPackageCategories = ref([]);

  // Hotel Dialog
  const newHotelPlan = ref({
    hotel_id: null,
    name: '',
    description: '',
    plan_type: 'per_room',
    colorHEX: 'D3D3D3',
    plan_type_category_id: null, // New field
    plan_package_category_id: null, // New field
    display_order: 0,
    is_active: true,
    available_from: null,
    available_until: null,
  });
  const editHotelPlan = ref({
    id: null,
    hotel_id: null,
    name: '',
    description: '',
    plan_type: 'per_room',
    colorHEX: 'D3D3D3',
    plan_type_category_id: null, // New field
    plan_package_category_id: null, // New field
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
      ,colorHEX: data.color.replace('#', '')
    };
    showEditHotelDialog.value = true;
  };
  const saveHotelPlan = async () => {
    newHotelPlan.value.hotel_id = selectedHotelId.value;            

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
      await fetchPlansHotel(selectedHotelId.value);
      hotelPlans.value = plans.value;      
      showHotelDialog.value = false;
      newHotelPlan.value = { 
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
      };
      toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン追加されました。', life: 3000 });
    } catch (err) {
      console.error('ホテルプランの保存エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの保存に失敗しました', life: 3000 });
    }
  };
  const updateHotel = async () => {
    editHotelPlan.value.hotel_id = selectedHotelId.value;
    
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
      await fetchPlansHotel(selectedHotelId.value);
      hotelPlans.value = plans.value;
      showEditHotelDialog.value = false;
      editHotelPlan.value = { 
        id: null, 
        hotel_id: null,
        name: '', 
        description: '',
        colorHEX: 'D3D3D3',
        plan_type_category_id: null,
        plan_package_category_id: null,
        display_order: 0,
        is_active: true,
        available_from: null,
        available_until: null,
      };
      toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン更新されました。', life: 3000 });
    } catch (err) {
      console.error('ホテルプランの更新エラー:', err);
      toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの更新に失敗しました', life: 3000 });
    }
  };

  const onRowReorder = async (event) => {
    hotelPlans.value = event.value;
    for (let i = 0; i < hotelPlans.value.length; i++) {
      const planToUpdate = { ...hotelPlans.value[i] }; // Create a copy
      planToUpdate.display_order = i;
      try {
        await updateHotelPlan(planToUpdate.id, planToUpdate); // Send the full updated object
      } catch (err) {
        console.error('プランの表示順序の更新エラー:', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'プランの表示順序の更新に失敗しました', life: 3000 });
      }
    }
    toast.add({ severity: 'success', summary: '成功', detail: 'プランの表示順序が更新されました。', life: 3000 });
  };
      
  // Rates
  const showHotelRatePanel = ref(false);
  const selectedPlan = ref({});
  const switchEditHotelPlanRate = (plan) => { // Removed context parameter
    if (plan === null || isEmptyObject(plan)) {
      showHotelRatePanel.value = false;
      selectedPlan.value = {};
    } else {
      showHotelRatePanel.value = true;          
      selectedPlan.value = { ...plan }; // Removed context from selectedPlan
    }
  };

  // Copy Plans Dialog
  const showCopyPlansDialog = ref(false);
  const openCopyPlansDialog = () => {
    showCopyPlansDialog.value = true;
  };
  const onPlanCopied = async () => {
    // Refresh plans after copy operation
    if (selectedHotelId.value) {
      await fetchPlansHotel(selectedHotelId.value);
      hotelPlans.value = plans.value;
    }
  };

  onMounted(async () => {
    loading.value = true;

    await fetchHotels();
    planTypeCategories.value = await fetchPlanTypeCategories();
    planPackageCategories.value = await fetchPlanPackageCategories();

    if (hotels.value.length > 0) {
      selectedHotelId.value = hotels.value[0].id; // Initialize selectedHotelId
    }

    loading.value = false;
  });

  // Watcher for selectedHotelId
  watch(selectedHotelId, async (newVal) => {
    if (newVal) {
      loading.value = true;
      await fetchPlansHotel(newVal);

      // Enhance hotelPlans with category names
      hotelPlans.value = plans.value.map(plan => ({
        ...plan,
        plan_type_category_name: planTypeCategories.value.find(cat => cat.id === plan.plan_type_category_id)?.name,
        plan_package_category_name: planPackageCategories.value.find(cat => cat.id === plan.plan_package_category_id)?.name,
      }));
      loading.value = false;
    }
  });
</script>