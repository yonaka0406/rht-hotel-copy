<template>
    <div class="p-4">
      <Panel header="プラン">
        <Tabs 
          :value="activeTab"
          @update:value="onTabChange"
        >
          <TabList>
            <Tab value="0">
              <i class="pi pi-globe"></i> グローバル
            </Tab>
            <Tab value="1">
              <i class="pi pi-building"></i> ホテル
            </Tab>
            <Tab 
              v-if="selectedHotel" 
              :value="2"
            >
              <i class="pi pi-building-columns"></i> {{ selectedHotel.name }}
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="0">
              <div id="globalTabPanel" v-show="!showGlobalRatePanel">
                <div class="flex justify-end mb-2">
                  <Button @click="showGlobalDialog = true"
                    icon="pi pi-plus"
                    label="プラン追加"
                    class="p-button-right"
                  ></Button>
                </div>
                <DataTable :value="globalPlans">
                  <Column field="name" header="名称"></Column>
                  <Column field="plan_type" headerClass="text-center">
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
                  <Column field="description" header="詳細"></Column>
                  <Column headerClass="text-center">
                    <template #header>
                      <span class="font-bold text-center w-full block">操作</span>
                    </template>
                    <template #body="slotProps">   
                      <div class="flex items-center justify-center">                 
                        <Button 
                          icon="pi pi-pencil" 
                          class="p-button-text p-button-sm" 
                          @click="openEditGlobalPlan(slotProps.data)"
                          v-tooltip="'プラン編集'"
                        />
                        <Button 
                          icon="pi pi-dollar" 
                          class="p-button-text p-button-sm" 
                          @click="switchEditGlobalPlanRate(slotProps.data)"
                          v-tooltip="'料金編集'"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </div>
              <div id="globalTabPanelRate" v-show="showGlobalRatePanel">
                <div class="grid xs:grid-cols-1 grid-cols-3 gap-2">
                  <div class="flex justify-start mb-2">
                    <Button @click="switchEditGlobalPlanRate({})" icon="pi pi-arrow-left" label="前へ" class="p-button-secondary mb-2" />
                  </div>
                  <div class="flex justify-start mb-2">
                    <span class="font-bold text-lg">{{ selectedPlan.name }}</span>
                  </div>                  
                </div>
                                
                <ManagePlansRates :plan="selectedPlan" v-if="showGlobalRatePanel" />
              </div>
            </TabPanel>
            <TabPanel value="1">
              <DataTable :value="hotels">
                <Column field="name" header="名称"></Column>
                <Column>
                  <template #header>
                    <span class="font-bold">プランカウント</span>
                  </template>
                  <template #body="slotProps">
                    <Badge 
                    :value="getPlansCount(slotProps.data.id)"
                    severity="secondary"
                    ></Badge>
                  </template>
                </Column>
                <Column header="操作">
                  <template #body="slotProps">
                    <Button 
                      @click="selectHotel(slotProps.data)"
                      severity="info"
                      rounded 
                    >選択する</Button>
                  </template>
                </Column>
              </DataTable>
            </TabPanel>
            <TabPanel 
              v-if="selectedHotel" 
              :value="2"
            >
              <div id="hotelTabPanel" v-show="!showHotelRatePanel">
                <div class="flex justify-end mb-2">
                  <Button                
                    @click="showHotelDialog = true"
                    icon="pi pi-plus"
                    label="プラン追加"
                    class="p-button-right"
                  ></Button>
                </div> 
                <DataTable :value="filteredHotelPlans">
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
                  <Column headerClass="text-center" style="width: 10%">
                    <template #header>
                      <span class="font-bold text-center w-full block">ステータス</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center">
                        <i v-if="slotProps.data.plans_global_id" class="pi pi-link" style="color: blue;"></i>
                      </div>                      
                    </template>                    
                  </Column>                  
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
                                
                <ManagePlansRates :plan="selectedPlan" v-if="showHotelRatePanel" />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Panel>

      <Panel header="プランパターン" class="mt-4">
        <ManagePlansPatterns />
      </Panel>

      <Dialog header="グローバルプラン追加" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="newGlobalPlan.name" fluid />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="flex grid-cols-2 justify-center items-center">
              <FloatLabel>
                <InputText v-model="newGlobalPlan.colorHEX"></InputText>
                <label>プラン表示HEX</label>
              </FloatLabel>
              <ColorPicker v-model="newGlobalPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
            </div>
          </div>
          <div class="col-6">            
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">請求種類：</span>
              <SelectButton 
                v-model="newGlobalPlan.plan_type" 
                :options="sb_options"
                optionLabel="label"
                optionValue="value"
              />
            </div>
          </div>
        </div>
        <div class="pt-6">        
          <FloatLabel>
            <Textarea v-model="newGlobalPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="saveGlobalPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
      </Dialog>

      <Dialog header="グローバルプラン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="editGlobalPlan.name" />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="flex grid-cols-2 justify-center items-center">
              <FloatLabel>
                <InputText v-model="editGlobalPlan.colorHEX"></InputText>
                <label>プラン表示HEX</label>
              </FloatLabel>
              <ColorPicker v-model="editGlobalPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
            </div>
          </div>
          <div class="col-6">            
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">請求種類：</span>
              <SelectButton 
                v-model="editGlobalPlan.plan_type" 
                :options="sb_options"
                optionLabel="label"
                optionValue="value"
              />
            </div>
          </div>
        </div>
        <div class="pt-6">
          <FloatLabel>
            <Textarea v-model="editGlobalPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="updateGlobal" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" />
        </template>
      </Dialog>

      <Dialog header="ホテルプラン追加" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="newHotelPlan.name" fluid />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="flex grid-cols-2 justify-center items-center">
              <FloatLabel>
                <InputText v-model="newHotelPlan.colorHEX"></InputText>
                <label>プラン表示HEX</label>
              </FloatLabel>
              <ColorPicker v-model="newHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
            </div>
          </div>
          <div class="col-6">
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
        </div>
        <div class="pt-6">        
          <FloatLabel>
            <Textarea v-model="newHotelPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
        <div class="pt-2">
          <label for="globalPlanSelect" class="block mb-2">グローバルプランにリンクする（任意）</label>
          <Select 
            id="globalPlanSelect"
            v-model="newHotelPlan.plans_global_id" 
            :options="globalPlans"
            optionLabel="name" 
            optionValue="id" 
            placeholder="Select a Global Plan" 
            class="w-full"
            showClear
            filter 
          />            
          
        </div>
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="saveHotelPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
      </Dialog>

      <Dialog header="ホテルプラン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="editHotelPlan.name" />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="flex grid-cols-2 justify-center items-center">
              <FloatLabel>
                <InputText v-model="editHotelPlan.colorHEX"></InputText>
                <label>プラン表示HEX</label>
              </FloatLabel>
              <ColorPicker v-model="editHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
            </div>
          </div>
          <div class="col-6">
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
        </div>
        <div class="pt-6">
          <FloatLabel>
            <Textarea v-model="editHotelPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>      
        <div class="pt-2">
          <label for="globalPlanSelectEdit" class="block mb-2">グローバルプランにリンクする（任意）</label>
          <Select 
            id="globalPlanSelectEdit"
            v-model="editHotelPlan.plans_global_id" 
            :options="globalPlans"
            optionLabel="name"
            optionValue="id"
            placeholder="グローバルプランを選択する" 
            class="w-full"  
            showClear
            filter    
          /> 
        </div>
        <template #footer>
          <Button label="保存" icon="pi pi-check" @click="updateHotelPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" />
        </template>
      </Dialog>
    </div>
</template>
  
<script setup>
  // Vue
  import { ref, computed, watch, onMounted } from 'vue';

  import ManagePlansRates from '@/pages/Admin/ManagePlansRates.vue';
  import ManagePlansPatterns from '@/pages/Admin/ManagePlansPatterns.vue';

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { usePlansStore } from '@/composables/usePlansStore';
  const { plans, fetchPlansGlobal, fetchPlansHotel, createGlobalPlan, updateGlobalPlan } = usePlansStore();
  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { Panel, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column,
    FloatLabel, InputText, ColorPicker, Textarea, Select, SelectButton, Button, Badge } from 'primevue'  

  // Helper
  const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };
    
  // Tabs
  const activeTab = ref(0);  
  const selectedHotel = ref(null);
  const globalPlans = ref([]);
  const hotelPlans = ref([]); 
  const loading = ref(false);
  const error = ref(null);  
  const sb_options = ref([
    { label: '部屋', value: 'per_room' },
    { label: '１人当たり', value: 'per_person' },
  ]);
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
      ,colorHEX: data.color.replace('#', '')
    };
    showEditGlobalDialog.value = true;
  };
  const saveGlobalPlan = async () => {
    // Check for duplicate keys
    const PlanSet = new Set();
    for (const plan of globalPlans.value) {
      PlanSet.add(plan.name);
      if (PlanSet.has(newGlobalPlan.name)) {
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Plan name must be unique', life: 3000 
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
      toast.add({ severity: 'success', summary: 'Success', detail: 'グローバルプラン追加されました。', life: 3000 });
    } catch (err) {
      console.error('Error saving global plan:', err);
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global plan', life: 3000 });
    }
  };
  const updateGlobal = async () => {            
    // Filter out the current id from globalPlans
    const filteredPlans = globalPlans.value.filter(plan => plan.id !== editGlobalPlan.value.id);

    // Check for duplicate keys
    const PlanSet = new Set();
    for (const plan of filteredPlans) {
      PlanSet.add(plan.name);
      if (PlanSet.has(editGlobalPlan.name)) {
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Plan name must be unique', life: 3000 
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
      toast.add({ severity: 'success', summary: 'Success', detail: 'グローバルプラン更新されました。', life: 3000 });
    } catch (err) {
      console.error('Error updating global plan:', err);
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update global plan', life: 3000 });
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
    plans_global_id: null,
    name: '', 
    description: '',
    colorHEX: 'D3D3D3'
  });
  const showHotelDialog = ref(false);
  const showEditHotelDialog = ref(false);
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
  const openEditHotelDialog = async (data) => {
    editHotelPlan.value = { 
      ...data
      ,colorHEX: data.color.replace('#', '')
    };
    showEditHotelDialog.value = true;
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
          summary: 'Error', 
          detail: 'Plan name must be unique for the selected hotel', life: 3000 
        });
        return;
      }
    }
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/plans/hotel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...newHotelPlan.value })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      hotelPlans.value.push(data);
      showHotelDialog.value = false;
      newHotelPlan.value = { 
        hotel_id: null, 
        name: '', 
        description: '', 
        plan_type: 'per_room',
        colorHEX: 'D3D3D3', 
        plans_global_id: null 
      };
      toast.add({ severity: 'success', summary: 'Success', detail: 'ホテルプラン追加されました。', life: 3000 });
    } catch (err) {
      console.error('Error saving hotel plan:', err);
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save hotel plan', life: 3000 });
    }
  };
  const updateHotelPlan = async () => {
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
          summary: 'Error', 
          detail: 'Plan name must be unique for the selected hotel', life: 3000 
        });
        return;
      }
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/plans/hotel/${editHotelPlan.value.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editHotelPlan.value)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const index = hotelPlans.value.findIndex(plan => plan.id === data.id);
      if (index !== -1) {
        hotelPlans.value[index] = data;
      }
      showEditHotelDialog.value = false;
      editHotelPlan.value = { 
        id: null, 
        hotel_id: null,
        plans_global_id: null,
        name: '', 
        description: '',
        colorHEX: 'D3D3D3'
      };
      toast.add({ severity: 'success', summary: 'Success', detail: 'ホテルプラン更新されました。', life: 3000 });
    } catch (err) {
      console.error('Error updating hotel plan:', err);
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update hotel plan', life: 3000 });
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

    await fetchPlansGlobal();
      globalPlans.value = plans.value;
    await fetchPlansHotel();
      hotelPlans.value = plans.value;
    await fetchHotels();

    loading.value = false
    // console.log('onMounted ManagePlans:', globalPlans.value);
    // console.log('onMounted ManagePlans:', hotelPlans.value);

  });
</script>