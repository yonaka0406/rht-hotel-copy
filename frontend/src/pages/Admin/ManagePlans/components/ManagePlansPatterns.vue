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
                <Message class="mt-2">
                    <template #icon>
                        <i class="pi pi-info-circle"></i>
                    </template>
                    ホテルパターンの使用を推奨します。
                </Message>
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
                                    <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                                        @click="deleteGlobalPattern(slotProps.data)" v-tooltip="'パターン削除'" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
                <TabPanel value="1">
                    <div class="flex justify-end mb-2">
                        <Button @click="showHotelDialog = true" icon="pi pi-plus" label="パターン追加"
                            class="p-button-right" :disabled="hotelPlans.length === 0" 
                            v-tooltip="hotelPlans.length === 0 ? 'プランが登録されていないため、パターンを作成できません。' : ''"></Button>
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
                                        @click="openEditHotelPattern(slotProps.data)" 
                                        :disabled="hotelPlans.length === 0"
                                        v-tooltip="hotelPlans.length === 0 ? 'プランが登録されていないため、編集できません。' : 'パターン編集'" />
                                    <Button icon="pi pi-trash" class="p-button-text p-button-sm p-button-danger"
                                        @click="deleteHotelPattern(slotProps.data)" v-tooltip="'パターン削除'" />
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </TabPanel>
            </TabPanels>
        </Tabs>
    </Panel>

    <!-- Global Pattern Dialogs - Use only global plans -->
    <AddGlobalPatternDialog :visible="showGlobalDialog" @update:visible="showGlobalDialog = $event"
        @patternAdded="onGlobalPatternModified" :globalPlans="globalPlans" :globalPatterns="globalPatterns"
        :daysOfWeek="daysOfWeek" />
    
    <EditGlobalPatternDialog :visible="showEditGlobalDialog" @update:visible="showEditGlobalDialog = $event"
        @patternUpdated="onGlobalPatternModified" :globalPlans="globalPlans" :globalPatterns="globalPatterns"
        :daysOfWeek="daysOfWeek" :initialEditGlobalPattern="editGlobalPattern" />

    <!-- Hotel Pattern Dialogs - Use combined global + hotel plans -->
    <AddHotelPatternDialog v-if="showHotelDialog" :visible="showHotelDialog"
        @update:visible="showHotelDialog = $event" @patternAdded="onPatternModified"
        :selectedHotelId="props.selectedHotelId" :hotelPlans="hotelPlans" :allHotelPatterns="allHotelPatterns"
        :daysOfWeek="daysOfWeek" />
    
    <EditHotelPatternDialog v-if="showEditHotelDialog" :visible="showEditHotelDialog"
        @update:visible="showEditHotelDialog = $event" @patternUpdated="onPatternModified"
        :selectedHotelId="props.selectedHotelId" :hotelPlans="hotelPlans" :allHotelPatterns="allHotelPatterns"
        :initialEditHotelPattern="editHotelPattern" :daysOfWeek="daysOfWeek" />
        
    <ConfirmDialog group="delete-pattern" />
</template>
<script setup>
// Vue
import { ref, computed, watch, onMounted } from 'vue';

import AddHotelPatternDialog from './dialogs/AddHotelPatternDialog.vue';
import EditHotelPatternDialog from './dialogs/EditHotelPatternDialog.vue';
import AddGlobalPatternDialog from './dialogs/AddGlobalPatternDialog.vue';
import EditGlobalPatternDialog from './dialogs/EditGlobalPatternDialog.vue';

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
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import {
    Tabs, TabList, Tab, TabPanels, TabPanel, Dialog,
    FloatLabel, InputText, Select, Badge, ConfirmDialog
} from 'primevue'
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Panel from 'primevue/panel';
import Message from 'primevue/message';

// Note: Hotels are managed by parent component
import { usePlansStore } from '@/composables/usePlansStore';
const { patterns, plans, hotelPlans, fetchGlobalPatterns, fetchHotelPatterns, fetchPatternsForHotel, fetchPlansGlobal, fetchHotelPlans, deletePlanPattern } = usePlansStore();

// Utils
import { daysOfWeek } from '@/utils/dateUtils';

// Tabs
const activeTab = ref(0);
const onTabChange = (newTabValue) => {
    activeTab.value = newTabValue;
};


// Tabs Global
const globalPatterns = ref([]);
const globalPlans = ref([]);
const editGlobalPattern = ref(null);
const showGlobalDialog = ref(false);
const showEditGlobalDialog = ref(false);

const openEditGlobalPattern = async (data) => {
    editGlobalPattern.value = { ...data };
    showEditGlobalDialog.value = true;
};

const onGlobalPatternModified = async () => {
    await fetchGlobalPatterns();
    globalPatterns.value = patterns.value;
};

const deleteGlobalPattern = async (pattern) => {
    confirm.require({
        group: 'delete-pattern',
        message: `パターン「${pattern.name}」を削除しますか？この操作は取り消せません。`,
        header: 'パターン削除確認',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: '削除',
            severity: 'danger'
        },
        accept: async () => {
            try {
                await deletePlanPattern(pattern.id);
                await onGlobalPatternModified();
                toast.add({ severity: 'success', summary: '成功', detail: 'グローバルパターンが削除されました。', life: 3000 });
            } catch (error) {
                console.error('グローバルパターンの削除エラー:', error);
                toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルパターンの削除に失敗しました。', life: 3000 });
            }
        }
    });
};

// Tabs Hotel
const allHotelPatterns = ref([]);
const hotelPatterns = computed(() => {
    if (!props.selectedHotelId) {
        return [];
    }
    // Filter hotel patterns based on selected hotel
    return allHotelPatterns.value.filter(pattern => pattern.hotel_id === props.selectedHotelId);
});
// hotelPlans is now imported from the store
const editHotelPattern = ref(null);
const showHotelDialog = ref(false);
const showEditHotelDialog = ref(false);
const openEditHotelPattern = async (data) => {
    editHotelPattern.value = {
        ...data
    };
    showEditHotelDialog.value = true;
};

const onPatternModified = async () => {
    if (props.selectedHotelId) {
        await fetchPatternsForHotel(props.selectedHotelId);
        allHotelPatterns.value = patterns.value;
        toast.add({ severity: 'success', summary: '成功', detail: 'パターンが更新されました。', life: 3000 });
    }
};

const deleteHotelPattern = async (pattern) => {
    confirm.require({
        group: 'delete-pattern',
        message: `パターン「${pattern.name}」を削除しますか？この操作は取り消せません。`,
        header: 'パターン削除確認',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: '削除',
            severity: 'danger'
        },
        accept: async () => {
            try {
                await deletePlanPattern(pattern.id);
                await onPatternModified();
                toast.add({ severity: 'success', summary: '成功', detail: 'ホテルパターンが削除されました。', life: 3000 });
            } catch (error) {
                console.error('ホテルパターンの削除エラー:', error);
                toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルパターンの削除に失敗しました。', life: 3000 });
            }
        }
    });
};

onMounted(async () => {
    await fetchGlobalPatterns();
    globalPatterns.value = patterns.value;
    await fetchHotelPatterns();
    allHotelPatterns.value = patterns.value;
    await fetchPlansGlobal();
    globalPlans.value = plans.value;
});

watch(() => props.selectedHotelId, async (newVal, oldVal) => {
    if (newVal && newVal !== oldVal) {
        await fetchPatternsForHotel(newVal);
        allHotelPatterns.value = patterns.value;
        // Fetch combined global + hotel plans for hotel patterns
        await fetchHotelPlans(newVal);
    }
}, { immediate: true });

</script>