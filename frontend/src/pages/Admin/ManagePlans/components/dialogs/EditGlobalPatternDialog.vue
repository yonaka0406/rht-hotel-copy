<template>
    <Dialog header="グローバルパターン編集" :visible="visible" :modal="true" :style="{ width: '70vw' }"
        class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
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
                            optionValue="plan_key" fluid />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateGlobalPattern"
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
    initialEditGlobalPattern: Object,
});

const emit = defineEmits(['update:visible', 'patternUpdated']);

const toast = useToast();
const { updatePlanPattern } = usePlansStore();

const editGlobalPattern = ref({});

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
    if (newVal && props.initialEditGlobalPattern) {
        const initialData = props.initialEditGlobalPattern;
        console.log('EditGlobalPatternDialog: Initializing with data:', initialData);
        
        editGlobalPattern.value = { ...initialData };
        
        // Populate dayPlanSelections based on template
        for (const day of props.daysOfWeek) {
            const templateEntry = editGlobalPattern.value.template?.[day.value];
            if (templateEntry && templateEntry.plan_key) {
                dayPlanSelections.value[day.value] = templateEntry.plan_key;
            } else {
                dayPlanSelections.value[day.value] = null;
            }
        }
        
        console.log('EditGlobalPatternDialog: dayPlanSelections set to:', dayPlanSelections.value);
    } else if (!newVal) {
        // Reset state when closing
        editGlobalPattern.value = {};
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

const updateGlobalPattern = async () => {
    // Validation
    if (!editGlobalPattern.value.name?.trim()) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
        return;
    }

    const isDuplicate = props.globalPatterns.some(pattern =>
        pattern.hotel_id === editGlobalPattern.value.hotel_id &&
        pattern.name.trim().toLowerCase() === editGlobalPattern.value.name.trim().toLowerCase() &&
        pattern.id !== editGlobalPattern.value.id
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
            toast.add({ severity: 'error', summary: 'エラー', detail: `無効なプラン形式です (${day.label}): ${planKey}`, life: 3000 });
            return;
        }
        const plans_global_id = match[1];
        const plans_hotel_id = match[2] ?? null;

        template[day.value] = {
            plan_key: planKey,
            plans_global_id,
            plans_hotel_id
        };
    }

    try {
        await updatePlanPattern(editGlobalPattern.value.id, {
            name: editGlobalPattern.value.name,
            template: JSON.stringify(template)
        });
        emit('patternUpdated');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン編集成功', life: 3000 });
    } catch (err) {
        console.error('グローバルパターンの更新エラー:', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルパターンの更新に失敗しました', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>