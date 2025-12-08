<template>
    <div class="p-4">
      <Panel :header="`プラン (${selectedHotelName})`" class="mb-4">
        <div class="mb-4 mt-6">
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
                  <Column :rowReorder="true" headerStyle="width: 3rem" :reorderableColumn="false" />
                  <Column field="plan_name" header="名称"></Column>
                  <Column field="plan_type" headerClass="text-center">
                    <template #header>
                      <span class="font-bold text-center w-full block">プランタイプ</span>
                    </template>
                    <template #body="slotProps">
                      <div class="flex items-center justify-center">  
                        <i v-if="slotProps.data.plan_type === 'per_person'" class="pi pi-id-card" style="color: darkgoldenrod;" v-tooltip="'1人あたり'"></i>
                        <i v-if="slotProps.data.plan_type === 'per_room'" class="pi pi-shop" style="color: brown;" v-tooltip="'部屋あたり'"></i>                      
                      </div>
                    </template>
                  </Column>

                  <Column header="カテゴリー">
                    <template #body="slotProps">
                      <Badge :value="slotProps.data.type_category" severity="primary" class="mr-2"></Badge>
                      <Badge :value="slotProps.data.package_category" severity="secondary"></Badge>
                    </template>
                  </Column>                  
                  <Column headerClass="text-center">
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

      
        <ManagePlansPatterns :selectedHotelId="selectedHotelId" :selectedHotelName="selectedHotelName" />
      

      <AddHotelPlanDialog
        :visible="showHotelDialog"
        @update:visible="showHotelDialog = $event"
        @planAdded="onPlanModified"
        :selectedHotelId="selectedHotelId"
        :planTypeCategories="planTypeCategories"
        :planPackageCategories="planPackageCategories"
        :sb_options="sb_options"
        :hotelPlans="hotelPlans"
      />

      <EditHotelPlanDialog
        :visible="showEditHotelDialog"
        @update:visible="showEditHotelDialog = $event"
        @planUpdated="onPlanModified"
        @orderChanged="handleOrderChange"
        :selectedHotelId="selectedHotelId"
        :selectedHotelName="selectedHotelName"
        :planTypeCategories="planTypeCategories"
        :planPackageCategories="planPackageCategories"
        :sb_options="sb_options"
        :hotelPlans="hotelPlans"
        :initialEditHotelPlan="editHotelPlan"
      />
      <CopyPlansDialog :visible="showCopyPlansDialog" @update:visible="showCopyPlansDialog = $event" @planCopied="onPlanCopied" />
    </div>
</template>
  
<script setup>
  // Vue
  import { ref, onMounted, watch, computed } from 'vue';

  import ManagePlansRates from './components/ManagePlansRates.vue';
  import ManagePlansPatterns from './components/ManagePlansPatterns.vue';
  import CopyPlansDialog from './components/dialogs/CopyPlansDialog.vue';
  import AddHotelPlanDialog from './components/dialogs/AddHotelPlanDialog.vue';
  import EditHotelPlanDialog from './components/dialogs/EditHotelPlanDialog.vue';

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { usePlansStore } from '@/composables/usePlansStore';
  const { plans, fetchPlansForHotel, createHotelPlan, updateHotelPlan, updatePlansOrderBulk, fetchPlanTypeCategories, fetchPlanPackageCategories } = usePlansStore();  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
import Panel from 'primevue/panel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import FloatLabel from 'primevue/floatlabel';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Badge from 'primevue/badge';  

  // Helper
  const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  };
    
  const hotelPlans = ref([]); 
  const loading = ref(false);
  const selectedHotelId = ref(null); // Renamed from currentHotelId

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

  // Hotel Dialog
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

      const onPlanModified = async () => {
        if (selectedHotelId.value) {
          await fetchPlansForHotel(selectedHotelId.value);      hotelPlans.value = plans.value;
    }
  };

  const onRowReorder = async (event) => {
    hotelPlans.value = event.value;
    const plansWithNewOrder = hotelPlans.value.map((plan, index) => ({
      ...plan,
      display_order: index,
    }));
    try {
      await updatePlansOrderBulk(selectedHotelId.value, plansWithNewOrder);
    toast.add({ severity: 'success', summary: '成功', detail: 'プランの表示順序が更新されました。', life: 3000 });
    }
  };

  const handleOrderChange = (updatedPlan) => {
    const plans = [...hotelPlans.value];
    const oldIndex = plans.findIndex(p => p.id === updatedPlan.id);
    if (oldIndex > -1) {
      plans.splice(oldIndex, 1);
    }
    plans.splice(updatedPlan.display_order, 0, updatedPlan);
    
    onRowReorder({ value: plans });
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
      await fetchPlansForHotel(selectedHotelId.value);
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
      await fetchPlansForHotel(newVal);

      // Enhance hotelPlans with category names
            hotelPlans.value = plans.value.map(plan => ({
              ...plan,
              id: plan.plan_id, // Map plan_id to id for DataTable dataKey
              plan_type_category_name: planTypeCategories.value.find(cat => cat.id === plan.plan_type_category_id)?.name,
              plan_package_category_name: planPackageCategories.value.find(cat => cat.id === plan.plan_package_category_id)?.name,
            }));                        loading.value = false;
                      }  });
</script>