<template>
    <Panel :header="`プランパターン (${props.selectedHotelName})`">
        <Tabs :value="activeTab" @update:value="onTabChange">
            <TabList>
                <Tab value="0">
                    <i class="pi pi-globe"></i> グローバル
                </Tab>
                <Tab value="1">
                    <i class="pi pi-building"></i> ホテル
                </Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="0">
                    <div class="flex justify-end mb-2">
                        <Button @click="showGlobalDialog = true" icon="pi pi-plus" label="パターン追加"
                            class="p-button-right"></Button>
                    </div>
                    <DataTable :value="globalPatterns">
                        <Column field="name" header="名称"></Column>
                        <Column headerClass="text-center">
                            <template #header>
                                <span class="font-bold text-center w-full block">操作</span>
                            </template>
                            <template #body="slotProps">
                                <div class="flex items-center justify-center">
                                    <Button icon="pi pi-pencil" class="p-button-text p-button-sm"
                                        @click="openEditGlobalPattern(slotProps.data)" v-tooltip="'パターン編集'" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
                <TabPanel value="1">
                    <div class="flex justify-end mb-2">
                        <Button @click="showHotelDialog = true" icon="pi pi-plus" label="パターン追加"
                            class="p-button-right"></Button>
                    </div>
                    <DataTable :value="hotelPatterns">
                        <Column field="name" header="名称"></Column>
                        <Column headerClass="text-center">
                            <template #header>
                                <span class="font-bold text-center w-full block">操作</span>
                            </template>
                            <template #body="slotProps">
                                <div class="flex items-center justify-center">
                                    <Button icon="pi pi-pencil" class="p-button-text p-button-sm"
                                        @click="openEditHotelPattern(slotProps.data)" v-tooltip="'パターン編集'" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </Panel>

    <!-- Dialog for Global Pattern -->
    <Dialog header="グローバルパターン追加" v-model:visible="showGlobalDialog" :modal="true" :style="{ width: '600px' }"
        class="p-fluid" :closable="true">
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
                        <Select v-model="dayPlanSelections[day.value]" :options="globalPlans" optionLabel="name"
                            optionValue="plan_key" class="w-full" />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveGlobalPattern"
                class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showGlobalDialog = false"
                class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
    <!-- Dialog for Global Pattern Edit -->
    <Dialog header="グローバルパターン編集" v-model:visible="showEditGlobalDialog" :modal="true" :style="{ width: '600px' }"
        class="p-fluid" :closable="true">
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
                        <Select v-model="dayPlanSelections[day.value]" :options="globalPlans" optionLabel="name"
                            optionValue="plan_key" class="w-full" />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateGlobalPattern"
                class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="showEditGlobalDialog = false"
                class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>

    <!-- Dialog for Hotel Pattern -->
    <AddHotelPatternDialog v-if="showHotelDialog && hotelPlans.length > 0" :visible="showHotelDialog"
        @update:visible="showHotelDialog = $event" @patternAdded="onPatternModified"
        :selectedHotelId="props.selectedHotelId" :hotelPlans="hotelPlans" :allHotelPatterns="allHotelPatterns"
        :daysOfWeek="daysOfWeek" />
    <!-- Dialog for Hotel Pattern Edit -->
    <EditHotelPatternDialog v-if="showEditHotelDialog && hotelPlans.length > 0" :visible="showEditHotelDialog"
        @update:visible="showEditHotelDialog = $event" @patternUpdated="onPatternModified"
        :selectedHotelId="props.selectedHotelId" :hotelPlans="hotelPlans" :allHotelPatterns="allHotelPatterns"
        :initialEditHotelPattern="editHotelPattern" :daysOfWeek="daysOfWeek" />
</template>
<script setup>
// Vue
import { ref, computed, watch, onMounted } from 'vue';

import AddHotelPatternDialog from './dialogs/AddHotelPatternDialog.vue';
import EditHotelPatternDialog from './dialogs/EditHotelPatternDialog.vue';

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
import {
    Tabs, TabList, Tab, TabPanels, TabPanel, Dialog,
    FloatLabel, InputText, Select, Badge
} from 'primevue'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Panel from 'primevue/panel';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { patterns, plans, fetchGlobalPatterns, fetchHotelPatterns, fetchPlansGlobal, fetchPlansForHotel, createPlanPattern, updatePlanPattern } = usePlansStore();

// Utils
import { daysOfWeek } from '@/utils/dateUtils';

// Tabs
const activeTab = ref(0);
const onTabChange = (newTabValue) => {
    activeTab.value = newTabValue;
};
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
    // console.log('openEditGlobalPattern data:', editGlobalPattern.value);
    // console.log('openEditGlobalPattern dayPlanSelections:', dayPlanSelections.value);
    showEditGlobalDialog.value = true;
};
const saveGlobalPattern = async () => {
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
const updateGlobalPattern = async () => {
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
const allHotelPatterns = ref([]);
const hotelPatterns = computed(() => {
    if (!selectedHotel.value) {
        return [];
    }
    // Filter hotel patterns based on selected hotel
    return allHotelPatterns.value.filter(pattern => pattern.hotel_id === selectedHotel.value.id);
});
const hotelPlans = ref([]);
const editHotelPattern = ref(null);
const showHotelDialog = ref(false);
const showEditHotelDialog = ref(false);
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

    // console.log('onMounted ManagePlansPatterns patterns:', patterns.value);
    // console.log('onMounted ManagePlansPatterns globalPlans:', globalPlans.value);
    // console.log('onMounted ManagePlansPatterns globalPlans:', globalPlans.value);

});

watch(() => props.selectedHotelId, async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
        await fetchPatternsForHotel(newVal);
        allHotelPatterns.value = patterns.value;
        await fetchPlansForHotel(newVal);
        hotelPlans.value = plans.value;
    }
}, { immediate: true });

</script>