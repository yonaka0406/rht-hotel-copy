<template>
    <Dialog header="プランコピー" :visible="visible" :modal="true" :style="{ width: '80vw' }" class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="col-span-1">
                <FloatLabel>
                    <Select
                        v-model="sourceHotelId"
                        :options="hotels"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="コピー元ホテルを選択"
                        class="w-full"
                        @change="onSourceHotelChange"
                    />
                    <label>コピー元ホテル</label>
                </FloatLabel>
            </div>
            <div class="col-span-1">
                <FloatLabel>
                    <Select
                        v-model="targetHotelId"
                        :options="hotels"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="コピー先ホテルを選択"
                        class="w-full"
                        @change="onTargetHotelChange"
                    />
                    <label>コピー先ホテル</label>
                </FloatLabel>
            </div>
        </div>

        <DataTable :value="plansToCopy" dataKey="id" :rowHover="true" v-model:selection="selectedPlans" class="p-datatable-sm">
            <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
            <Column field="name" header="プラン名" style="width: 20%">
                <template #body="{ data }">
                    <span :class="{ 'line-through text-400': data.conflict }">{{ data.name }}</span>
                </template>
            </Column>
            <Column header="新しいプラン名 (任意)" style="width: 25%">
                <template #body="{ data }">
                    <InputText v-model="data.newName" :placeholder="data.name" class="w-full" :disabled="!selectedPlans.includes(data)"/>
                </template>
            </Column>
            <Column header="オプション" style="width: 45%">
                <template #body="{ data }">
                    <div class="flex items-center gap-2">
                        <Checkbox v-model="data.copyRates" inputId="copyRates" :binary="true" :disabled="!selectedPlans.includes(data)"/>
                        <label for="copyRates" class="mr-4">料金もコピー</label>

                        <Checkbox v-model="data.copyAddons" inputId="copyAddons" :binary="true" :disabled="!selectedPlans.includes(data)"/>
                        <label for="copyAddons">アドオンもコピー</label>
                    </div>
                </template>
            </Column>
            <Column header="競合" style="width: 10%">
                <template #body="{ data }">
                    <Badge v-if="data.conflict" value="競合あり" severity="danger"></Badge>
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-danger p-button-text p-button-sm" />
            <Button label="コピー実行" icon="pi pi-check" @click="executeCopy" class="p-button-success p-button-text p-button-sm" :disabled="!canExecuteCopy"/>
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
const { fetchPlansHotel, createHotelPlan } = usePlansStore();

const sourceHotelId = ref(null);
const targetHotelId = ref(null);
const sourcePlans = ref([]);
const plansToCopy = ref([]); // This will hold plans from source, with copy options and conflict status
const selectedPlans = ref([]); // Plans selected for copying

// Computed property to filter target hotel's existing plans for conflict detection
const targetHotelPlans = ref([]);

const canExecuteCopy = computed(() => selectedPlans.value.length > 0 && targetHotelId.value !== null);

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
        sourcePlans.value = await fetchPlansHotel(sourceHotelId.value);
        plansToCopy.value = sourcePlans.value.map(plan => ({
            ...plan,
            newName: '', // For optional renaming
            copyRates: true,
            copyAddons: true,
            conflict: false // Initial conflict status
        }));
        checkConflicts();
    } else {
        sourcePlans.value = [];
        plansToCopy.value = [];
    }
};

const onTargetHotelChange = async () => {
    if (targetHotelId.value) {
        targetHotelPlans.value = await fetchPlansHotel(targetHotelId.value);
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

    plansToCopy.value.forEach(plan => {
        const nameToCheck = plan.newName.trim() || plan.name;
        plan.conflict = targetHotelPlans.value.some(targetPlan => targetPlan.name === nameToCheck);
    });
};

const executeCopy = async () => {
    if (!canExecuteCopy.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: 'コピーを実行するには、ホテルとプランを選択してください。', life: 3000 });
        return;
    }

    // Filter out plans with conflicts if not handled
    const conflictedPlans = selectedPlans.value.filter(plan => plan.conflict);
    if (conflictedPlans.length > 0) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '競合のあるプランはコピーできません。新しい名前を付けてください。', life: 5000 });
        return;
    }

    // Logic to call API to copy plans
    try {
        for (const plan of selectedPlans.value) {
            const newPlanData = {
                hotel_id: targetHotelId.value,
                name: plan.newName.trim() || plan.name,
                description: plan.description,
                plan_type: plan.plan_type,
                colorHEX: plan.color, // Assuming color is stored in plan.color
                category: plan.category, // Assuming category is available
                // Add any other relevant plan fields
            };

            // Call API to create new plan
            const createdPlan = await createHotelPlan(newPlanData);

            // If rates/addons need to be copied, this would involve more API calls
            // For now, just creating the plan
            if (plan.copyRates) {
                // Logic to copy rates (requires API for rate copying)
                // await copyRatesApi(plan.id, createdPlan.id);
            }
            if (plan.copyAddons) {
                // Logic to copy addons (requires API for addon copying)
                // await copyAddonsApi(plan.id, createdPlan.id);
            }
        }
        toast.add({ severity: 'success', summary: '成功', detail: '選択されたプランがコピーされました。', life: 3000 });
        emit('planCopied'); // Notify parent component that plans have been copied
        closeDialog();
    } catch (error) {
        console.error('プランのコピー中にエラーが発生しました:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'プランのコピー中にエラーが発生しました。', life: 5000 });
    }
};

onMounted(async () => {
    await fetchHotels();
});

watch(props, (newProps) => {
    if (newProps.visible) {
        resetForm();
    }
});

watch([sourceHotelId, targetHotelId, plansToCopy], checkConflicts, { deep: true });
</script>

<style scoped>
/* Add any specific styles for the dialog here */
</style>
