<template>
    <div class="p-4">
      <Panel header="Plans">
        <Tabs 
          :value="activeTab"
          @update:value="onTabChange"
        >
          <TabList>
            <Tab value="0">
              <i class="pi pi-globe"></i> グローバル
            </Tab>
            <Tab value="1">
              <i class="pi pi-building"></i> Hotels
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
                    label="Add Plan"
                    class="p-button-right"
                  ></Button>
                </div>
                <DataTable :value="globalPlans">
                  <Column field="name" header="Name"></Column>
                  <Column field="plan_type">
                    <template #header>
                      <span class="font-bold items-center">Plan Type</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center">  
                        <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;"></i>
                        <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;"></i>                      
                      </div>
                    </template>
                  </Column>
                  <Column field="description" header="Description"></Column>
                  <Column>
                    <template #header>
                      <span class="font-bold items-center">Actions</span>
                    </template>
                    <template #body="slotProps">   
                      <div class="flex items-center justify-center">                 
                        <Button 
                          icon="pi pi-pencil" 
                          class="p-button-text p-button-sm" 
                          @click="openEditGlobalPlan(slotProps.data)"
                          v-tooltip="'Edit Plan'"
                        />
                        <Button 
                          icon="pi pi-dollar" 
                          class="p-button-text p-button-sm" 
                          @click="switchEditGlobalPlanRate(slotProps.data)"
                          v-tooltip="'Edit Rate'"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </div>
              <div id="globalTabPanelRate" v-show="showGlobalRatePanel">
                <div class="grid xs:grid-cols-1 grid-cols-3 gap-2">
                  <div class="flex justify-start mb-2">
                    <Button @click="switchEditGlobalPlanRate({})" icon="pi pi-arrow-left" label="Back" class="p-button-secondary mb-2" />
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
                <Column field="name" header="Name"></Column>
                <Column>
                  <template #header>
                    <span class="font-bold">Plans Count</span>
                  </template>
                  <template #body="slotProps">
                    <Badge 
                    :value="getPlansCount(slotProps.data.id)"
                    severity="secondary"
                    ></Badge>
                  </template>
                </Column>
                <Column header="Actions">
                  <template #body="slotProps">
                    <Button 
                      @click="selectHotel(slotProps.data)"
                      severity="info"
                      rounded 
                    >Select</Button>
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
                    label="Add Plan"
                    class="p-button-right"
                  ></Button>
                </div> 
                <DataTable :value="filteredHotelPlans">
                  <Column field="name" header="Name"></Column>
                  <Column field="plan_type">
                    <template #header>
                      <span class="font-bold items-center">Plan Type</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center">  
                        <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;"></i>
                        <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;"></i>                      
                      </div>
                    </template>
                  </Column>
                  <Column field="description" header="Description"></Column>
                  <Column>
                    <template #header>
                      <span class="font-bold items-center">Actions</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center"> 
                        <Button 
                          icon="pi pi-pencil" 
                          class="p-button-text p-button-sm" 
                          @click="openEditHotelDialog(slotProps.data)"
                          v-tooltip="'Edit Plan'"
                        />
                        <Button 
                          icon="pi pi-dollar" 
                          class="p-button-text p-button-sm" 
                          @click="switchEditHotelPlanRate(slotProps.data)"
                          v-tooltip="'Edit Rate'"
                        />
                      </div>
                    </template>
                  </Column>
                </DataTable>
              </div>
              <div id="hotelTabPanelRate" v-show="showHotelRatePanel">
                <div class="grid xs:grid-cols-1 grid-cols-3 gap-2">
                  <div class="flex justify-start mb-2">
                    <Button @click="switchEditHotelPlanRate({})" icon="pi pi-arrow-left" label="Back" class="p-button-secondary mb-2" />
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

      <Dialog header="Add New Global Plan" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="newGlobalPlan.name" fluid />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">            
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">Billing by:</span>
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

      <Dialog header="Edit Global Plan" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="editGlobalPlan.name" />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">            
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">Billing by:</span>
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
          <Button label="保存" icon="pi pi-check" @click="updateGlobalPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" />
        </template>
      </Dialog>

      <Dialog header="Add New Hotel Plan" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="newHotelPlan.name" fluid />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">Billing by:</span>
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
          <label for="globalPlanSelect" class="block mb-2">Link to Global Plan (optional)</label>
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

      <Dialog header="Edit Hotel Plan" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
          <div class="col-6">
            <FloatLabel>
              <InputText v-model="editHotelPlan.name" />
              <label>名称</label>
            </FloatLabel>
          </div>
          <div class="col-6">
            <div class="p-float-label flex align-items-center gap-2">
              <span class="inline-block align-middle font-bold">Billing by:</span>
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
          <label for="globalPlanSelectEdit" class="block mb-2">Link to Global Plan (optional)</label>
          <Select 
            id="globalPlanSelectEdit"
            v-model="editHotelPlan.plans_global_id" 
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
          <Button label="保存" icon="pi pi-check" @click="updateHotelPlan" class="p-button-success p-button-text p-button-sm" />
          <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" />
        </template>
      </Dialog>
    </div>
</template>
  
<script>
  import { defineAsyncComponent, ref, computed, watch, onMounted } from 'vue';
  import { useToast } from 'primevue/usetoast';

  import Panel from 'primevue/panel';
  import Card from 'primevue/card';
  import Tabs from 'primevue/tabs';
  import TabList from 'primevue/tablist';
  import Tab from 'primevue/tab';
  import TabPanels from 'primevue/tabpanels';
  import TabPanel from 'primevue/tabpanel';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Button from 'primevue/button';
  import Badge from 'primevue/badge';
  import Dialog from 'primevue/dialog';
  import InputText from 'primevue/inputtext';  
  import InputNumber from 'primevue/inputnumber';
  import InputMask from 'primevue/inputmask';
  import Textarea from 'primevue/textarea';
  import Select from 'primevue/select';
  import SelectButton from 'primevue/selectbutton';
  import FloatLabel from 'primevue/floatlabel';  

  export default {
    name: "ManagePlans",
    components: {
      ManagePlansRates: defineAsyncComponent({
        loader: () => import('./ManagePlansRates.vue'),
        loadingComponent: {
          template: `<div>Loading...</div>`,
        },
      }),
      Panel,
      Card,
      Tabs,
      TabList,
      Tab,
      TabPanels,
      TabPanel,
      DataTable,
      Column,
      Button,
      Badge,
      Dialog,
      InputText,      
      InputNumber,
      InputMask,
      Textarea,
      Select,
      SelectButton,
      FloatLabel,      
    },
    setup() {
      const toast = useToast();
      const activeTab = ref(0);
      const hotels = ref([]);
      const selectedHotel = ref(null);
      const globalPlans = ref([]);
      const hotelPlans = ref([]);      

      const showGlobalDialog = ref(false);
      const showEditGlobalDialog = ref(false);
      const newGlobalPlan = ref({ 
        name: '', 
        description: '', 
        plan_type: 'per_room'
      });
      const editGlobalPlan = ref({ 
        id: null, 
        name: '', 
        description: ''        
      });

      const showHotelDialog = ref(false);
      const showEditHotelDialog = ref(false);
      const newHotelPlan = ref({ 
        hotel_id: null,
        name: '', 
        description: '', 
        plan_type: 'per_room',
        plans_global_id: null 
      });
      const editHotelPlan = ref({ 
        id: null, 
        hotel_id: null,
        plans_global_id: null,
        name: '', 
        description: ''        
      });
      
      const sb_options = ref([
        { label: 'Room', value: 'per_room' },
        { label: 'Person', value: 'per_person' },
      ]);

      const loading = ref(false);
      const error = ref(null);

      const filteredHotelPlans = computed(() => {
        if (selectedHotel.value) {
          const filtered = hotelPlans.value.filter(plan => plan.hotel_id === selectedHotel.value.id);
          //console.log('Filtered Hotel:', filtered);
          return filtered;
        }
        return [];
      });

      const fetchGlobalPlans = async () => {
        loading.value = true            
        try {
          const authToken = localStorage.getItem('authToken')
          const response = await fetch('/api/plans/global', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          globalPlans.value = data
          //console.log('Fetched Global:', globalPlans.value);
        } catch (err) {
          console.error('Error fetching global plans:', err)
          error.value = err.message || 'Failed to fetch global plans'
        } finally {
          loading.value = false
        }
      };

      const fetchHotels = async () => {
        try {
          const authToken = localStorage.getItem('authToken')
          const response = await fetch('/api/hotel-list', {
            method: 'GET',            
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
          });
          hotels.value = await response.json();
          //console.log('Fetched Hotels:', hotels.value);
        } catch (error) {
          toast.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: 'Failed to fetch hotels', life: 3000 
          });
        }
      };

      const fetchHotelsPlans = async () => {
        loading.value = true
        try {
          const authToken = localStorage.getItem('authToken')
          const response = await fetch('/api/plans/hotel', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          hotelPlans.value = data
          //console.log('Fetched Hotel Plans:', hotelPlans.value);
        } catch (err) {
          console.error('Error fetching hotel plans:', err)
          error.value = err.message || 'Failed to fetch hotel plans'
        } finally {
          loading.value = false
        }
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
          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/plans/global', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(newGlobalPlan.value)
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          globalPlans.value.push(data);
          showGlobalDialog.value = false;
          newGlobalPlan.value = { 
            name: '', 
            description: '', 
            plan_type: 'per_room' 
          };
          toast.add({ severity: 'success', summary: 'Success', detail: 'Global Plan added successfully', life: 3000 });
        } catch (err) {
          console.error('Error saving global plan:', err);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save global plan', life: 3000 });
        }
      };

      const openEditGlobalPlan = async (data) => {
        editGlobalPlan.value = { ...data};
        showEditGlobalDialog.value = true;
      };

      const updateGlobalPlan = async () => {            
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
          const authToken = localStorage.getItem('authToken');
          const response = await fetch(`/api/plans/global/${editGlobalPlan.value.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(editGlobalPlan.value)
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const index = globalPlans.value.findIndex(plan => plan.id === data.id);
          if (index !== -1) {
            globalPlans.value[index] = data;
          }
          showEditGlobalDialog.value = false;
          editGlobalPlan.value = { 
            id: null, 
            name: '', 
            description: ''            
          };
          toast.add({ severity: 'success', summary: 'Success', detail: 'Global Plan updated successfully', life: 3000 });
        } catch (err) {
          console.error('Error updating global plan:', err);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update global plan', life: 3000 });
        }
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
            plans_global_id: null 
          };
          toast.add({ severity: 'success', summary: 'Success', detail: 'Hotel Plan added successfully', life: 3000 });
        } catch (err) {
          console.error('Error saving hotel plan:', err);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save hotel plan', life: 3000 });
        }
      };

      const openEditHotelDialog = async (data) => {
        editHotelPlan.value = { ...data};
        showEditHotelDialog.value = true;
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
            description: ''
          };
          toast.add({ severity: 'success', summary: 'Success', detail: 'Hotel Plan updated successfully', life: 3000 });
        } catch (err) {
          console.error('Error updating hotel plan:', err);
          toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update hotel plan', life: 3000 });
        }
      };

      const getPlansCount = (hotel_id) => {
        return hotelPlans.value.filter(plan => plan.hotel_id === hotel_id).length;
      };

      const onTabChange = (newTabValue) => {
        activeTab.value = newTabValue; // Update activeTab value when tab changes
      };

      const selectHotel = (hotel) => {
        //console.log('Selected Hotel:', hotel);
        selectedHotel.value = hotel; 
        activeTab.value = 2;        
      };

      const showGlobalRatePanel = ref(false);
      const showHotelRatePanel = ref(false);
      const selectedPlan = ref({});   
      
      const isEmptyObject = (obj) => {
        return Object.keys(obj).length === 0 && obj.constructor === Object;
      };

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

      onMounted(fetchGlobalPlans);
      onMounted(fetchHotels);
      onMounted(fetchHotelsPlans);
/*
      watch(newGlobalPlan, (newVal, oldVal) => {
        console.log('editHotelAddon changed:', newVal);
        // Add your custom logic here
      }, { deep: true });      
*/    
      return {
        activeTab,
        hotels,
        selectedHotel,
        globalPlans,
        hotelPlans,        
        showGlobalDialog,        
        showEditGlobalDialog,
        newGlobalPlan,
        editGlobalPlan,
        showHotelDialog,
        showEditHotelDialog,
        newHotelPlan,
        editHotelPlan,
        sb_options,     
        filteredHotelPlans,
        saveGlobalPlan,
        openEditGlobalPlan,
        updateGlobalPlan,
        saveHotelPlan,
        openEditHotelDialog,
        updateHotelPlan,
        getPlansCount,
        onTabChange,
        selectHotel,
        showGlobalRatePanel,
        showHotelRatePanel,
        selectedPlan,        
        switchEditGlobalPlanRate,
        switchEditHotelPlanRate,
      }
    }
  }
</script>