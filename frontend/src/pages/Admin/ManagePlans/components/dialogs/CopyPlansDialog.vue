<template>
    <Dialog header="プランコピー" :visible="visible" :modal="true" :style="{ width: '80vw' }" class="p-fluid" :closable="true"
        @update:visible="$emit('update:visible', $event)">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <Select v-model="sourceHotelId" :options="hotels" optionLabel="name" optionValue="id"
                        placeholder="コピー元ホテルを選択" class="w-full" @change="onSourceHotelChange" />
                    <label>コピー元ホテル</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mt-6">
                <FloatLabel>
                    <Select v-model="targetHotelId" :options="hotels" optionLabel="name" optionValue="id"
                        placeholder="コピー先ホテルを選択" class="w-full" @change="onTargetHotelChange" />
                    <label>コピー先ホテル</label>
                </FloatLabel>
            </div>
        </div>

        <DataTable :value="plansToCopy" :dataKey="getDataKey" :rowHover="true" v-model:selection="selectedPlans"
            class="p-datatable-sm">
            <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
            <Column field="name" header="プラン名" style="width: 20%">
                <template #body="{ data }">
                    <span :class="{ 'line-through text-400': data.conflict }">{{ data.name || data.plan_name }}</span>
                </template>
            </Column>
            <Column header="新しいプラン名 (任意)" style="width: 25%">
                <template #body="{ data }">
                    <InputText v-model="data.newName" :placeholder="data.name || data.plan_name" class="w-full"
                        :disabled="!selectedPlans.includes(data)" />
                </template>
            </Column>
            <Column header="オプション" style="width: 45%">
                <template #body="{ data }">
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="data.copyRates" :inputId="'copyRates_' + data.id" :binary="true"
                            :disabled="!selectedPlans.includes(data)" />
                        <label :for="'copyRates_' + data.id" class="mr-4">料金もコピー</label>

                        <Checkbox v-model="data.copyAddons" :inputId="'copyAddons_' + data.id" :binary="true"
                            :disabled="!selectedPlans.includes(data)" />
                        <label :for="'copyAddons_' + data.id">アドオンもコピー</label>
                    </div>
                </template>
            </Column>
            <Column header="競合" style="width: 10%">
                <template #body="{ data }">
                    <Badge v-if="data.conflict" value="類似" severity="danger"></Badge>
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="closeDialog"
                class="p-button-danger p-button-text p-button-sm" />
            <Button label="コピー実行" icon="pi pi-check" @click="executeCopy"
                class="p-button-success p-button-text p-button-sm" :disabled="!canExecuteCopy" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Dialog, Select, FloatLabel, Button, DataTable, Column, Checkbox, InputText, Badge } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { useHotelStore } from '@/composables/useHotelStore';
import { usePlansStore } from '@/composables/usePlansStore';

const emit = defineEmits(['update:visible', 'planCopied']);

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const toast = useToast();
const { hotels, fetchHotels } = useHotelStore();
const { fetchPlansForHotel, bulkCopyPlansToHotel } = usePlansStore();

const sourceHotelId = ref(null);
const targetHotelId = ref(null);
const sourcePlans = ref([]);
const plansToCopy = ref([]); // This will hold plans from source, with copy options and conflict status
const selectedPlans = ref([]); // Plans selected for copying

// Reactive ref for target hotel plans to filter conflicts
const targetHotelPlans = ref([]);

// Function to get unique data key for each row
const getDataKey = (data) => {
    // Use the uniqueId we create for each plan
    return data.uniqueId || data.id || `${data.hotel_id}_${data.plan_name}`;
};

const canExecuteCopy = computed(() => {
    return selectedPlans.value.length > 0 &&
        targetHotelId.value !== null &&
        sourceHotelId.value !== null &&
        sourceHotelId.value !== targetHotelId.value;
});

const closeDialog = () => {
    emit('update:visible', false);
    resetForm();
};

const resetForm = () => {
    sourceHotelId.value = null;
    targetHotelId.value = null;
    sourcePlans.value = [];
    plansToCopy.value = [];
    selectedPlans.value = [];
    targetHotelPlans.value = [];
};

const onSourceHotelChange = async () => {
    if (sourceHotelId.value) {
        sourcePlans.value = await fetchPlansForHotel(sourceHotelId.value);
        plansToCopy.value = sourcePlans.value.map((plan, index) => ({
            ...plan,
            uniqueId: `${plan.id || index}_${sourceHotelId.value}`, // Ensure unique ID
            newName: '', // For optional renaming
            copyRates: true,
            copyAddons: true,
            conflict: false // Initial conflict status
        }));
        selectedPlans.value = []; // Clear previous selections
        checkConflicts();
    } else {
        sourcePlans.value = [];
        plansToCopy.value = [];
        selectedPlans.value = [];
    }
};

const onTargetHotelChange = async () => {
    if (targetHotelId.value) {
        targetHotelPlans.value = await fetchPlansForHotel(targetHotelId.value);
        checkConflicts();
    } else {
        targetHotelPlans.value = [];
    }
};

const checkConflicts = () => {
    if (!plansToCopy.value.length || !targetHotelPlans.value.length) {
        plansToCopy.value.forEach(plan => plan.conflict = false);
        return;
    }

    // Get all names that will be used (including custom names)
    const usedNames = new Set();

    plansToCopy.value.forEach(plan => {
        const nameToCheck = plan.newName?.trim() || plan.name || plan.plan_name;

        // Check against existing plans in target hotel
        const existsInTarget = targetHotelPlans.value.some(targetPlan =>
            (targetPlan.name || targetPlan.plan_name) === nameToCheck
        );

        // Check against other plans being copied (duplicate names within selection)
        const duplicateInSelection = usedNames.has(nameToCheck);

        plan.conflict = existsInTarget || duplicateInSelection;
        usedNames.add(nameToCheck);

        console.log('Conflict check for plan:', {
            planName: nameToCheck,
            existsInTarget,
            duplicateInSelection,
            conflict: plan.conflict
        });
    });
};

const executeCopy = async () => {
    if (!canExecuteCopy.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'コピーを実行するには、ホテルとプランを選択してください。', life: 3000 });
        return;
    }

    // Check for conflicts and warn user
    const conflictedPlans = selectedPlans.value.filter(plan => plan.conflict);
    if (conflictedPlans.length > 0) {
        const conflictNames = conflictedPlans.map(p => p.name || p.plan_name).join(', ');
        toast.add({
            severity: 'warn',
            summary: '名前の競合',
            detail: `以下のプランは名前が重複しているため、自動的に番号が付加されます: ${conflictNames}`,
            life: 7000
        });
        // Don't return - let the backend handle the conflict resolution
    }

    // Use the dedicated bulk copy API instead of creating plans individually
    try {
        console.log('Starting plan copy operation', {
            selectedPlans: selectedPlans.value.length,
            sourceHotelId: sourceHotelId.value,
            targetHotelId: targetHotelId.value,
            selectedPlansData: selectedPlans.value
        });

        // Prepare the data for bulk copy - check multiple possible ID fields
        const sourcePlanIds = selectedPlans.value.map(plan => {
            const planId = plan.id || plan.plan_id || plan.plans_hotel_id;
            console.log('Plan ID extraction:', { plan, extractedId: planId });
            return planId;
        });
        const copyOptions = {
            copyRates: {},
            copyAddons: {},
            planNames: {}
        };

        selectedPlans.value.forEach(plan => {
            const pid = plan.id || plan.plan_id || plan.plans_hotel_id;
            if (pid) {
                copyOptions.copyRates[pid] = !!plan.copyRates;
                copyOptions.copyAddons[pid] = !!plan.copyAddons;
                if (plan.newName && plan.newName.trim()) {
                    copyOptions.planNames[pid] = plan.newName.trim();
                }
            }
        });

        // Validate that we have valid plan IDs
        const validPlanIds = sourcePlanIds.filter(id => id != null && id !== undefined);
        if (validPlanIds.length === 0) {
            throw new Error('選択されたプランに有効なIDが見つかりません。');
        }
        if (validPlanIds.length !== sourcePlanIds.length) {
            console.warn('Some plans had invalid IDs:', { sourcePlanIds, validPlanIds });
        }

        console.log('Calling bulkCopyPlansToHotel with:', {
            sourcePlanIds: validPlanIds,
            sourceHotelId: sourceHotelId.value,
            targetHotelId: targetHotelId.value,
            copyOptions
        });

        // Call the dedicated bulk copy API
        const copiedPlans = await bulkCopyPlansToHotel(
            validPlanIds,
            sourceHotelId.value,
            targetHotelId.value,
            copyOptions
        );

        console.log('Plans copied successfully:', copiedPlans);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: `${copiedPlans.length}個のプランがコピーされました。`,
            life: 3000
        });
        emit('planCopied'); // Notify parent component that plans have been copied
        closeDialog();
    } catch (error) {
        console.error('プランのコピー中にエラーが発生しました:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: `プランのコピー中にエラーが発生しました: ${error.message}`,
            life: 5000
        });
    }
};

onMounted(async () => {
    await fetchHotels();
});

watch(() => props.visible, (visible) => {
    if (visible) {
        resetForm();
    }
});

// Watch for selection changes to debug
watch(selectedPlans, (newSelection) => {
    console.log('Selected plans changed:', newSelection.length, newSelection.map(p => p.plan_name));
}, { deep: true });

watch([sourceHotelId, targetHotelId, plansToCopy], checkConflicts, { deep: true });
</script>

<style scoped>
/* Add any specific styles for the dialog here */
</style>