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
        
        <!-- Extracted Plans Table Component -->
        <ManageHotelPlansTable
            :hotelPlans="hotelPlans"
            :showHotelRatePanel="showHotelRatePanel"
            :selectedHotelId="selectedHotelId"
            @openAddPlanDialog="showHotelDialog = true"
            @openCopyPlansDialog="showCopyPlansDialog = true"
            @openEditPlanDialog="openEditHotelDialog"
            @switchEditHotelPlanRate="switchEditHotelPlanRate"
            @orderChanged="handleOrderChange"
        />

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
  import ManageHotelPlansTable from './components/ManageHotelPlansTable.vue';

  // Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { hotels, fetchHotels } = useHotelStore();
  import { usePlansStore } from '@/composables/usePlansStore';
  const { plans, fetchPlansForHotel, createHotelPlan, updateHotelPlan, updatePlansOrderBulk, fetchPlanTypeCategories, fetchPlanPackageCategories } = usePlansStore();  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import Panel from 'primevue/panel';
  import FloatLabel from 'primevue/floatlabel';
  import Select from 'primevue/select';
  import Button from 'primevue/button';

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
      ,colorHEX: data.color.replace('#', '')
    };
    showEditHotelDialog.value = true;
  };

  const onPlanModified = async () => {
    if (selectedHotelId.value) {
      await fetchPlansForHotel(selectedHotelId.value, true);      
      hotelPlans.value = plans.value;
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
    // Assuming updatedPlansArray is the new ordered array of plans from the child DataTable
    hotelPlans.value = updatedPlansArray; // Update parent's hotelPlans
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
      
  // Rates
  const showHotelRatePanel = ref(false);
  const selectedPlan = ref({});
  const switchEditHotelPlanRate = (plan) => {
    if (plan === null || isEmptyObject(plan)) {
      showHotelRatePanel.value = false;
      selectedPlan.value = {};
    } else {
      showHotelRatePanel.value = true;          
      selectedPlan.value = { ...plan };
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
      await fetchPlansForHotel(selectedHotelId.value, true);
      hotelPlans.value = plans.value;
    }
  };

  onMounted(async () => {
    loading.value = true;

    try {
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
      await fetchPlansForHotel(newVal, true);

      // Enhance hotelPlans with category names
            hotelPlans.value = plans.value.map(plan => ({
              ...plan,
              id: plan.plan_id, // Map plan_id to id for DataTable dataKey
              plan_type_category_name: planTypeCategories.value.find(cat => cat.id === plan.plan_type_category_id)?.name,
              plan_package_category_name: planPackageCategories.value.find(cat => cat.id === plan.plan_package_category_id)?.name,
            }));                        loading.value = false;
                      }  });
</script>