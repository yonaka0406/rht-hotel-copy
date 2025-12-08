<template>
    <Panel header="プランパターン">
        <div class="mb-4">
            <FloatLabel>
                <Select
                    v-model="selectedHotelIdInternal"
                    :options="hotels"
                    optionLabel="name"
                    optionValue="id"
                    placeholder="ホテルを選択"
                    class="w-full"
                />
                <label>ホテル選択</label>
            </FloatLabel>
        </div>
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
        :visible="showHotelDialog"
        @update:visible="showHotelDialog = $event"
        @patternAdded="onPatternModified"
        :selectedHotelId="selectedHotelIdInternal"
        :hotelPlans="hotelPlans"
        :allHotelPatterns="allHotelPatterns"
        :daysOfWeek="daysOfWeek"
    />

    <EditHotelPatternDialog
        :visible="showEditHotelDialog"
        @update:visible="showEditHotelDialog = $event"
        @patternUpdated="onPatternModified"
        :selectedHotelId="selectedHotelIdInternal"
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
            type: [Number, null], 
            required: true,
        }
    });
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import DataTable from 'primevue/datatable';
    import Column from 'primevue/column';
    import FloatLabel from 'primevue/floatlabel';
    import InputText from 'primevue/inputtext';
    import Select from 'primevue/select';
    import Button from 'primevue/button';
    import Badge from 'primevue/badge';
    import Panel from 'primevue/panel';
    import AddHotelPatternDialog from './dialogs/AddHotelPatternDialog.vue';
    import EditHotelPatternDialog from './dialogs/EditHotelPatternDialog.vue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { patterns, plans, fetchPatternsForHotel, /*createPlanPattern, updatePlanPattern,*/ fetchPlansForHotel } = usePlansStore();
    // Internal state for selected hotel, synced with prop
    const selectedHotelIdInternal = ref(props.selectedHotelId);
    const allHotelPatterns = ref([]);
    const hotelPatterns = computed(() => {
        if (!selectedHotelIdInternal.value) { // Use selectedHotelIdInternal here
            return [];
        }
        // Filter hotel patterns based on selected hotel
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === selectedHotelIdInternal.value);
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
        editHotelPattern.value = { 
            ...data            
        };
        showEditHotelDialog.value = true;
    };
    
    const onPatternModified = async () => {
        if (selectedHotelIdInternal.value) {
            await fetchPatternsForHotel(selectedHotelIdInternal.value);
            allHotelPatterns.value = patterns.value;
        }
    };

    const daysOfWeek = [ // Moved definition here
        { label: '月曜日', value: 'mon' },
        { label: '火曜日', value: 'tue' },
        { label: '水曜日', value: 'wed' },
        { label: '木曜日', value: 'thu' },
        { label: '金曜日', value: 'fri' },
        { label: '土曜日', value: 'sat' },
        { label: '日曜日', value: 'sun' }
    ];

    onMounted(async () => {
        await fetchHotels();
    });

    watch(() => props.selectedHotelId, (newVal) => {
        selectedHotelIdInternal.value = newVal;
    });

    watch(selectedHotelIdInternal, async (newVal, oldVal) => {
        if (newVal && newVal !== oldVal) {
            await fetchPatternsForHotel(newVal);
            allHotelPatterns.value = patterns.value;
            await fetchPlansForHotel(newVal);
            hotelPlans.value = plans.value;
        }
    }, { immediate: true });
</script>