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

    <!-- Dialog for Hotel Pattern -->
    <Dialog header="ホテルパターン追加" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div v-for="day in daysOfWeek" :key="day.value" class="mt-4">
                <div>
                    <span>{{ day.label }}</span>
                </div>
                <div>
                    <FloatLabel>
                        <Select
                            v-model="dayPlanSelections[day.value]"
                            :options="hotelPlans"
                            optionLabel="name"
                            optionValue="id"
                            class="w-full"
                        />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>        
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveHotelPattern" class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
    <!-- Dialog for Hotel Pattern Edit -->
    <Dialog header="ホテルパターン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-2">
                <FloatLabel>
                    <InputText v-model="editHotelPattern.name" fluid />
                    <label>名称</label>
                </FloatLabel>
            </div>            
            <div v-for="day in daysOfWeek" :key="day.value" class="mt-4">
                <div>
                    <span>{{ day.label }}</span>
                </div>
                <div>
                    <FloatLabel>
                        <Select
                            v-model="dayPlanSelections[day.value]"
                            :options="hotelPlans"
                            optionLabel="name"
                            optionValue="id"
                            class="w-full"
                        />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>        
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateHotelPattern" class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showEditHotelDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted  } from 'vue';
    
    const props = defineProps({
        selectedHotelId: {
            type: String, 
            required: true,
        }
    });
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { DataTable, Column, Dialog,
        FloatLabel, InputText, Select, Button, Badge, Panel
     } from 'primevue'

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { patterns, fetchPatternsForHotel, createPlanPattern, updatePlanPattern, fetchPlansForHotel } = usePlansStore();
    // Internal state for selected hotel, synced with prop
    const selectedHotelIdInternal = ref(props.selectedHotelId);
    const allHotelPatterns = ref([]);
    const hotelPatterns = computed(() => {
        if (!selectedHotel.value) {
            return [];
        }
        // Filter hotel patterns based on selected hotel
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === selectedHotel.value.id);
    });
    const hotelPlans = ref([]);
    const newHotelPattern = ref(null);
    const editHotelPattern = ref(null);
    const showHotelDialog = ref(false);
    const showEditHotelDialog = ref(false);
    const getPatternCount = (hotel_id) => {
        // console.log('getPatternCount hotel_id:', hotel_id);
        // console.log('getPatternCount allHotelPatterns:', allHotelPatterns.value);
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === hotel_id).length;
    };
    const newHotelPatternReset = () => {
        newHotelPattern.value = { 
            hotel_id: selectedHotelIdInternal.value,
            name: '',
            template: {}
        };
    };
    const editHotelPatternReset = () => {
        editHotelPattern.value = { 
            id: null, 
            hotel_id: selectedHotelIdInternal.value,
            name: '', 
            template: {}
        };
    };
    const openEditHotelPattern = async (data) => {
        editHotelPattern.value = { 
            ...data            
        };
        // Populate dayPlanSelections based on template
        for (const day of daysOfWeek.value) {
            const templateEntry = editHotelPattern.value.template?.[day.value];
            if (templateEntry && templateEntry.plan_id) {
                dayPlanSelections.value[day.value] = templateEntry.plan_id;
            } else {
                // Optional: Clear selection if not found
                dayPlanSelections.value[day.value] = null;
            }
        }
        // console.log('openEditHotelPattern data:', editHotelPattern.value);
        // console.log('openEditHotelPattern dayPlanSelections:', dayPlanSelections.value);
        showEditHotelDialog.value = true;
    };
    const saveHotelPattern = async() => {
        // Validation
        if (!newHotelPattern.value.name?.trim()) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
            return;
        }
        const isDuplicate = allHotelPatterns.value.some(pattern => 
            pattern.hotel_id === selectedHotelIdInternal.value &&
            pattern.name.trim().toLowerCase() === newHotelPattern.value.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }


        const template = {};

        for (const day of daysOfWeek.value) { 
            const planId = dayPlanSelections.value[day.value];
            if (!planId) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planId) {                 
                template[day.value] = { 
                    plan_id: planId, 
                };
            } 
        }

        newHotelPattern.value.template = template;

        // console.log('saveHotelPattern newHotelPattern:', newHotelPattern.value);
        
        await createPlanPattern(newHotelPattern.value);
        newHotelPatternReset();
        await fetchHotelPatterns();
        hotelPatterns.value = patterns.value;

        showHotelDialog.value = false;
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン追加成功', life: 3000 });        
    };
    const updateHotelPattern = async() => {
        // Validation
        if (!editHotelPattern.value.name?.trim()) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
            return;
        }
        const isDuplicate = allHotelPatterns.value.some(pattern => 
            pattern.hotel_id === selectedHotelIdInternal.value &&
            pattern.name.trim().toLowerCase() === editHotelPattern.value.name.trim().toLowerCase() &&
            pattern.id !== editHotelPattern.value.id 
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }

        const template = {};

        for (const day of daysOfWeek.value) { 
            const planId = dayPlanSelections.value[day.value];
            if (!planId) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planId) { 
                template[day.value] = { 
                    plan_id: planId, 
                };
            } 
        }

        editHotelPattern.value.template = template;

        await updatePlanPattern(editHotelPattern.value.id, editHotelPattern.value);
        editHotelPatternReset();
        await fetchHotelPatterns();
        hotelPatterns.value = patterns.value;

        showEditHotelDialog.value = false;
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン編集成功', life: 3000 });        
    };

    onMounted(async () => {
        await fetchHotels();
    });

    watch(() => props.selectedHotelId, (newVal) => {
        selectedHotelIdInternal.value = newVal;
    });

    watch(selectedHotelIdInternal, async (newVal, oldVal) => {
        if (newVal && newVal !== oldVal) {
            newHotelPatternReset(newVal);
            editHotelPatternReset(newVal);
            await fetchPatternsForHotel(newVal);
            allHotelPatterns.value = patterns.value;
            await fetchPlansForHotel(newVal);
            hotelPlans.value = plans.value;
        }
    }, { immediate: true });

    watch(dayPlanSelections, () => {
        // console.log('dayPlanSelections changed:', newSelections);
    }, { deep: true });

</script>