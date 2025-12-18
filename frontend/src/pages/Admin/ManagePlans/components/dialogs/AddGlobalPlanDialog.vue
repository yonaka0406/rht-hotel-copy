<template>
    <Dialog header="グローバルプラン追加" :visible="visible" :modal="true" :style="{ width: '70vw' }" class="p-fluid"
        :closable="true" @update:visible="$emit('update:visible', $event)">
        <div class="grid grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-6">
                <FloatLabel>
                    <InputText v-model="newGlobalPlan.name" fluid />
                    <label>名称</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-6">
                <div class="flex grid-cols-2 justify-center items-center">
                    <FloatLabel class="flex-1">
                        <InputText v-model="newGlobalPlan.colorHEX" fluid />
                        <label>プラン表示HEX</label>
                    </FloatLabel>
                    <ColorPicker v-model="newGlobalPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
                </div>
            </div>
            <div class="col-span-2">
                <div class="p-float-label flex align-items-center gap-2">
                    <span class="inline-block align-middle font-bold">請求種類：</span>
                    <SelectButton v-model="newGlobalPlan.plan_type" :options="sb_options" optionLabel="label"
                        optionValue="value" />
                </div>
            </div>
            <div class="col-span-2 pt-6 mb-2">
                <FloatLabel>
                    <Textarea v-model="newGlobalPlan.description" fluid />
                    <label>詳細</label>
                </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveGlobalPlan"
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
import ColorPicker from 'primevue/colorpicker';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';

const props = defineProps({
    visible: Boolean,
    sb_options: Array,
    globalPlans: Array, // For duplicate check
});

const emit = defineEmits(['update:visible', 'planAdded']);

const toast = useToast();
const { createGlobalPlan } = usePlansStore();

const newGlobalPlan = ref({
    name: '',
    description: '',
    plan_type: 'per_room',
    colorHEX: 'D3D3D3',
});

watch(() => props.visible, (newVal) => {
    if (newVal) {
        // Reset form when dialog opens
        newGlobalPlan.value = {
            name: '',
            description: '',
            plan_type: 'per_room',
            colorHEX: 'D3D3D3',
        };
    }
}, { immediate: true });

const saveGlobalPlan = async () => {
    const trimmedPlanName = newGlobalPlan.value.name?.trim();
    if (!trimmedPlanName) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称を記入してください。', life: 3000 });
        return;
    }

    const isDuplicate = (props.globalPlans || []).some(plan =>
        (plan.name ?? "").trim().toLowerCase() === trimmedPlanName.toLowerCase()
    );

    if (isDuplicate) {
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: 'プラン名はユニークである必要があります。', life: 3000
        });
        return;
    }

    try {
        const planData = { ...newGlobalPlan.value, color: `#${newGlobalPlan.value.colorHEX}` };
        delete planData.colorHEX; // Remove colorHEX as 'color' is sent instead
        
        await createGlobalPlan(planData);
        emit('planAdded');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'グローバルプラン追加されました。', life: 3000 });
    } catch (err) {
        console.error('グローバルプランの保存エラー:', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'グローバルプランの保存に失敗しました', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>