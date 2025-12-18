<template>
    <Dialog header="グローバルパターン追加" :visible="visible" :modal="true" :style="{ width: '70vw' }"
        class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
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
                            optionValue="plan_key" fluid />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveGlobalPattern"
                class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)"
                class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { usePlansStore } from '@/composables/usePlansStore';
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';

const props = defineProps({
    visible: Boolean,
    globalPlans: Array,
    globalPatterns: Array,
    daysOfWeek: Array,
});

const emit = defineEmits(['update:visible', 'patternAdded']);

const toast = useToast();
const { createPlanPattern } = usePlansStore();

const newGlobalPattern = ref({
    hotel_id: null,
    name: '',
    template: {}
});

const dayPlanSelections = ref({
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null
});

watch(() => props.visible, (newVal) => {
    if (newVal) {
        // Reset form when dialog opens
        newGlobalPattern.value = {
            hotel_id: null,
            name: '',
            template: {}
        };
        // Reset day selections
        dayPlanSelections.value = {
            mon: null,
            tue: null,
            wed: null,
            thu: null,
            fri: null,
            sat: null,
            sun: null
        };
    }
});

const saveGlobalPattern = async () => {
    // Validation
    if (!newGlobalPattern.value.name?.trim()) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
        return;
    }

    const isDuplicate = props.globalPatterns.some(pattern =>
        pattern.hotel_id === newGlobalPattern.value.hotel_id &&
        pattern.name.trim().toLowerCase() === newGlobalPattern.value.name.trim().toLowerCase()
    );

    if (isDuplicate) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
        return;
    }

    const template = {};

    for (const day of props.daysOfWeek) {
        const planKey = dayPlanSelections.value[day.value];
        if (!planKey) {
            toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
            return;
        }

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

    const patternData = {
        hotel_id: newGlobalPattern.value.hotel_id,
        name: newGlobalPattern.value.name,
        template: JSON.stringify(template)
    };
    
    console.log('AddGlobalPatternDialog: Sending pattern data:', patternData);

    try {
        await createPlanPattern(patternData);
        emit('patternAdded');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン追加成功', life: 3000 });
    } catch (err) {
        console.error('グローバルパターンの保存エラー:', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルパターンの保存に失敗しました', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>