<template>
    <Panel :header="`プランパターン (${props.selectedHotelName})`">
        <div class="flex justify-end mb-2">
            <Button @click="showHotelDialog = true"
                icon="pi pi-plus"
                label="パターン追加"
                class="p-button-right"
            ></Button>
        </div>
        <DataTable :value="hotelPatterns">
            <Column field="name" header="名称"></Column>                    
            <Column headerClass="text-center">
                <template #header>
                <span class="font-bold text-center w-full block">操作</span>
                </template>
                <template #body="slotProps">   
                <div class="flex items-center justify-center">                 
                    <Button 
                        icon="pi pi-pencil" 
                        class="p-button-text p-button-sm" 
                        @click="openEditHotelPattern(slotProps.data)"
                        v-tooltip="'パターン編集'"
                    />                            
                </div>
                </template>
            </Column>
        </DataTable>
    </Panel>
    <AddHotelPatternDialog
        v-if="showHotelDialog && hotelPlans.length > 0"
        :visible="showHotelDialog"
        @update:visible="showHotelDialog = $event"
        @patternAdded="onPatternModified"
        :selectedHotelId="props.selectedHotelId"
        :hotelPlans="hotelPlans"
        :allHotelPatterns="allHotelPatterns"
        :daysOfWeek="daysOfWeek"
    />

    <EditHotelPatternDialog
        v-if="showEditHotelDialog && hotelPlans.length > 0"
        :visible="showEditHotelDialog"
        @update:visible="showEditHotelDialog = $event"
        @patternUpdated="onPatternModified"
        :selectedHotelId="props.selectedHotelId"
        :hotelPlans="hotelPlans"
        :allHotelPatterns="allHotelPatterns"
        :initialEditHotelPattern="editHotelPattern"
        :daysOfWeek="daysOfWeek"
    />
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted  } from 'vue';
        
    const props = defineProps({
        selectedHotelId: {
            type: Number,
            required: false,
            default: null,
        },
        selectedHotelName: {
            type: String,
            default: 'ホテル選択'
        }
    });
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';    
    import Button from 'primevue/button';    
    import Panel from 'primevue/panel';
    import AddHotelPatternDialog from './dialogs/AddHotelPatternDialog.vue';
    import EditHotelPatternDialog from './dialogs/EditHotelPatternDialog.vue';

    // Stores
    import { usePlansStore } from '@/composables/usePlansStore';
    const { patterns, plans, fetchPatternsForHotel, /*createPlanPattern, updatePlanPattern,*/ fetchPlansForHotel } = usePlansStore();
    const allHotelPatterns = ref([]);
    const hotelPatterns = computed(() => {
        if (!props.selectedHotelId) { // Use props.selectedHotelId here
            return [];
        }
        // Filter hotel patterns based on selected hotel
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === props.selectedHotelId);
    });
    const hotelPlans = ref([]);
    const editHotelPattern = ref(null);
    const showHotelDialog = ref(false);
    const showEditHotelDialog = ref(false);
    const getPatternCount = (hotel_id) => {
        // console.log('getPatternCount hotel_id:', hotel_id);
        // console.log('getPatternCount allHotelPatterns:', allHotelPatterns.value);
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === hotel_id).length;
    };
    const openEditHotelPattern = async (data) => {
        console.log('ManagePlansPatterns - openEditHotelPattern called with data:', data);
        console.log('ManagePlansPatterns - Current hotelPlans:', hotelPlans.value);
        console.log('ManagePlansPatterns - Current daysOfWeek:', daysOfWeek);
        
        editHotelPattern.value = { 
            ...data            
        };
        console.log('ManagePlansPatterns - editHotelPattern set to:', editHotelPattern.value);
        
        showEditHotelDialog.value = true;
        console.log('ManagePlansPatterns - showEditHotelDialog set to true');
    };
    
    const onPatternModified = async () => {
        if (props.selectedHotelId) {
            await fetchPatternsForHotel(props.selectedHotelId);
            allHotelPatterns.value = patterns.value;
            toast.add({ severity: 'success', summary: '成功', detail: 'パターンが更新されました。', life: 3000 });
        }
    };

    import { daysOfWeek } from '@/utils/dateUtils';
    onMounted(async () => {
        // Removed fetchHotels call
    });

    // Removed watch on props.selectedHotelId for selectedHotelIdInternal
    // Removed watch on selectedHotelIdInternal

    watch(() => props.selectedHotelId, async (newVal, oldVal) => {
        if (newVal && newVal !== oldVal) {
            await fetchPatternsForHotel(newVal);
            allHotelPatterns.value = patterns.value;
            await fetchPlansForHotel(newVal);
            hotelPlans.value = plans.value;
        }
    }, { immediate: true });
</script>