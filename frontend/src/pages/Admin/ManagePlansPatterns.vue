<template>
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
                <div class="flex justify-end mb-2">
                  <Button @click="showGlobalDialog = true"
                    icon="pi pi-plus"
                    label="パターン追加"
                    class="p-button-right"
                  ></Button>
                </div>
                <DataTable :value="globalPatterns">
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
                                @click="openEditGlobalPattern(slotProps.data)"
                                v-tooltip="'パターン編集'"
                            />                            
                        </div>
                        </template>
                    </Column>
                </DataTable>
            </TabPanel>
            <TabPanel value="1">
                <DataTable :value="hotels">
                    <Column field="name" header="名称"></Column>
                    <Column>
                        <template #header>
                            <span class="font-bold">パターンカウント</span>
                        </template>
                        <template #body="slotProps">
                            <Badge 
                                :value="getPatternCount(slotProps.data.id)"
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
                            >
                                選択する
                            </Button>
                    </template>
                    </Column>
                </DataTable>
            </TabPanel>
            <TabPanel 
                v-if="selectedHotel" 
                :value="2"
            >
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
            </TabPanel>
        </TabPanels>
    </Tabs>

    <!-- Dialog for Global Pattern -->
    <Dialog header="グローバルパターン追加" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-2">
                <FloatLabel>
                    <InputText v-model="newGlobalPattern.name" fluid />
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
                            :options="globalPlans"
                            optionLabel="name"
                            optionValue="plan_key"
                            class="w-full"
                        />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>        
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveGlobalPattern" class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
    <!-- Dialog for Global Pattern Edit -->
    <Dialog header="グローバルパターン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-2">
                <FloatLabel>
                    <InputText v-model="editGlobalPattern.name" fluid />
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
                            :options="globalPlans"
                            optionLabel="name"
                            optionValue="plan_key"
                            class="w-full"
                        />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>        
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateGlobalPattern" class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false" class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>

    <!-- Dialog for Hotel Pattern -->
    <Dialog header="ホテルパターン追加" v-model:visible="showHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-2">
                <FloatLabel>
                    <InputText v-model="newHotelPattern.name" fluid />
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
                            optionValue="plan_key"
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
    <Dialog header="グローバルパターン編集" v-model:visible="showEditHotelDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
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
                            optionValue="plan_key"
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
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, Dialog,
        FloatLabel, InputText, Select, Button, Badge
     } from 'primevue'

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, fetchHotels } = useHotelStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { patterns, plans, fetchGlobalPatterns, fetchHotelPatterns, fetchPlansGlobal, fetchPlansForHotel, createPlanPattern, updatePlanPattern } = usePlansStore();

    // Tabs
    const activeTab = ref(0);
    const onTabChange = (newTabValue) => {
        activeTab.value = newTabValue;
    };
    const daysOfWeek = ref([ 
        { label: '月曜日', value: 'mon' }, 
        { label: '火曜日', value: 'tue' }, 
        { label: '水曜日', value: 'wed' }, 
        { label: '木曜日', value: 'thu' }, 
        { label: '金曜日', value: 'fri' }, 
        { label: '土曜日', value: 'sat' }, 
        { label: '日曜日', value: 'sun' } 
    ]);
    const dayPlanSelections = ref({ mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null });

    // Tabs Global
    const globalPatterns = ref([]);
    const globalPlans = ref([]);
    const newGlobalPattern = ref(null);
    const editGlobalPattern = ref(null);
    const showGlobalDialog = ref(false);
    const showEditGlobalDialog = ref(false);
    const newGlobalPatternReset = () => {
        newGlobalPattern.value = { 
            hotel_id: null,
            name: '',
            template: {}
        };
    };
    const editGlobalPatternReset = () => {
        editGlobalPattern.value = { 
            id: null, 
            hotel_id: null,
            name: '', 
            template: {}
        };
    };
    const openEditGlobalPattern = async (data) => {
        editGlobalPattern.value = { 
            ...data            
        };
        // Populate dayPlanSelections based on template
        for (const day of daysOfWeek.value) {
            const templateEntry = editGlobalPattern.value.template?.[day.value];
            if (templateEntry && templateEntry.plan_key) {
                dayPlanSelections.value[day.value] = templateEntry.plan_key;
            } else {
                // Optional: Clear selection if not found
                dayPlanSelections.value[day.value] = null;
            }
        }
        console.log('openEditGlobalPattern data:', editGlobalPattern.value);
        console.log('openEditGlobalPattern dayPlanSelections:', dayPlanSelections.value);
        showEditGlobalDialog.value = true;
    };
    const saveGlobalPattern = async() => {
        // Validation
        if (!newGlobalPattern.value.name?.trim()) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
            return;
        }
        const isDuplicate = globalPatterns.value.some(pattern => 
            pattern.hotel_id === newGlobalPattern.value.hotel_id &&
            pattern.name.trim().toLowerCase() === newGlobalPattern.value.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }


        const template = {};

        for (const day of daysOfWeek.value) { 
            const planKey = dayPlanSelections.value[day.value];
            if (!planKey) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planKey) { 
                const match = planKey.match(/^(\d*)h(\d+)?$/);
                if (!match) {
                    console.warn(`Invalid plan key format for ${day.value}:`, planKey);
                    continue; // Skip invalid values
                }
                const plans_global_id = match[1]; 
                const plans_hotel_id = match[2] ?? null; 

                template[day.value] = { 
                    plan_key: planKey, 
                    plans_global_id, 
                    plans_hotel_id 
                };
            } 
        }

        newGlobalPattern.value.template = template;

        await createPlanPattern(newGlobalPattern.value);
        newGlobalPatternReset();
        await fetchGlobalPatterns();
        globalPatterns.value = patterns.value;

        showGlobalDialog.value = false;
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン追加成功', life: 3000 });        
    };
    const updateGlobalPattern = async() => {
        // Validation
        if (!editGlobalPattern.value.name?.trim()) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
            return;
        }
        const isDuplicate = globalPatterns.value.some(pattern => 
            pattern.hotel_id === editGlobalPattern.value.hotel_id &&
            pattern.name.trim().toLowerCase() === editGlobalPattern.value.name.trim().toLowerCase() &&
            pattern.id !== editGlobalPattern.value.id 
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }

        const template = {};

        for (const day of daysOfWeek.value) { 
            const planKey = dayPlanSelections.value[day.value];
            if (!planKey) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planKey) { 
                const match = planKey.match(/^(\d*)h(\d+)?$/);
                if (!match) {
                    console.warn(`Invalid plan key format for ${day.value}:`, planKey);
                    continue; // Skip invalid values
                }
                const plans_global_id = match[1]; 
                const plans_hotel_id = match[2] ?? null; 

                template[day.value] = { 
                    plan_key: planKey, 
                    plans_global_id, 
                    plans_hotel_id 
                };
            } 
        }

        editGlobalPattern.value.template = template;

        await updatePlanPattern(editGlobalPattern.value.id, editGlobalPattern.value);
        editGlobalPatternReset();
        await fetchGlobalPatterns();
        globalPatterns.value = patterns.value;

        showEditGlobalDialog.value = false;
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン編集成功', life: 3000 });        
    };
    
    // Tabs Hotel
    const selectedHotel = ref(null);
    const selectHotel = async (hotel) => {    
        selectedHotel.value = hotel; 
        activeTab.value = 2;
        newHotelPatternReset(selectedHotel.value.id);
        editHotelPatternReset(selectedHotel.value.id);        
        await fetchPlansForHotel(selectedHotel.value.id);
        hotelPlans.value = plans.value;

        console.log('selectHotel hotel:', selectedHotel.value);
        console.log('selectHotel hotelPlans:', hotelPlans.value);
    };
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
        console.log('getPatternCount hotel_id:', hotel_id);
        console.log('getPatternCount allHotelPatterns:', allHotelPatterns.value);
        return allHotelPatterns.value.filter(pattern => pattern.hotel_id === hotel_id).length;
    };
    const newHotelPatternReset = (hotel_id) => {
        newHotelPattern.value = { 
            hotel_id: hotel_id,
            name: '',
            template: {}
        };
    };
    const editHotelPatternReset = (hotel_id) => {
        editHotelPattern.value = { 
            id: null, 
            hotel_id: hotel_id,
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
            if (templateEntry && templateEntry.plan_key) {
                dayPlanSelections.value[day.value] = templateEntry.plan_key;
            } else {
                // Optional: Clear selection if not found
                dayPlanSelections.value[day.value] = null;
            }
        }
        console.log('openEditHotelPattern data:', editHotelPattern.value);
        console.log('openEditHotelPattern dayPlanSelections:', dayPlanSelections.value);
        showEditHotelDialog.value = true;
    };
    const saveHotelPattern = async() => {
        // Validation
        if (!newHotelPattern.value.name?.trim()) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
            return;
        }
        const isDuplicate = hotelPatterns.value.some(pattern => 
            pattern.hotel_id === newHotelPattern.value.hotel_id &&
            pattern.name.trim().toLowerCase() === newHotelPattern.value.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }


        const template = {};

        for (const day of daysOfWeek.value) { 
            const planKey = dayPlanSelections.value[day.value];
            if (!planKey) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planKey) { 
                const match = planKey.match(/^(\d*)h(\d+)?$/);                
                if (!match) {
                    console.warn(`Invalid plan key format for ${day.value}:`, planKey);
                    continue; // Skip invalid values
                }
                const plans_global_id = match[1]; 
                const plans_hotel_id = match[2] ?? null; 

                template[day.value] = { 
                    plan_key: planKey, 
                    plans_global_id, 
                    plans_hotel_id 
                };
            } 
        }

        newHotelPattern.value.template = template;

        console.log('saveHotelPattern newHotelPattern:', newHotelPattern.value);
        
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
        const isDuplicate = hotelPatterns.value.some(pattern => 
            pattern.hotel_id === editHotelPattern.value.hotel_id &&
            pattern.name.trim().toLowerCase() === editHotelPattern.value.name.trim().toLowerCase() &&
            pattern.id !== editHotelPattern.value.id 
        );
        if (isDuplicate) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
            return;
        }

        const template = {};

        for (const day of daysOfWeek.value) { 
            const planKey = dayPlanSelections.value[day.value];
            if (!planKey) { 
                toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
                return;
            }
            if (planKey) { 
                const match = planKey.match(/^(\d*)h(\d+)?$/);
                if (!match) {
                    console.warn(`Invalid plan key format for ${day.value}:`, planKey);
                    continue; // Skip invalid values
                }
                const plans_global_id = match[1]; 
                const plans_hotel_id = match[2] ?? null; 

                template[day.value] = { 
                    plan_key: planKey, 
                    plans_global_id, 
                    plans_hotel_id 
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
        newGlobalPatternReset();
        editGlobalPatternReset();

        await fetchHotels();
        await fetchGlobalPatterns();
        globalPatterns.value = patterns.value;
        await fetchHotelPatterns();
        allHotelPatterns.value = patterns.value;
        await fetchPlansGlobal();
        globalPlans.value = plans.value;
                
        console.log('onMounted ManagePlansPatterns patterns:', patterns.value);
        console.log('onMounted ManagePlansPatterns globalPlans:', globalPlans.value);
        console.log('onMounted ManagePlansPatterns globalPlans:', globalPlans.value);

    });

    watch(dayPlanSelections, (newSelections) => {
        console.log('dayPlanSelections changed:', newSelections);
    }, { deep: true });

</script>