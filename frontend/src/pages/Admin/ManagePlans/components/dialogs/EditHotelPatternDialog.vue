<template>
    <Dialog header="ホテルパターン編集" :visible="visible" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
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
            <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-danger p-button-text p-button-sm" text />
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
import Panel from 'primevue/panel';
import Column from 'primevue/column';

const props = defineProps({
    visible: Boolean,
    selectedHotelId: Number,
    hotelPlans: Array,
    allHotelPatterns: Array, // For duplicate check
    initialEditHotelPattern: Object, // The pattern to edit
    daysOfWeek: Array,
});

const emit = defineEmits(['update:visible', 'patternUpdated']);

const toast = useToast();
const { updatePlanPattern } = usePlansStore();

const editHotelPattern = ref({});
const dayPlanSelections = ref({});

watch(() => props.visible, (newVal) => {
    if (newVal && props.initialEditHotelPattern) {
        editHotelPattern.value = { ...props.initialEditHotelPattern };
        // Populate dayPlanSelections based on initialEditHotelPattern's template
        dayPlanSelections.value = {};
        for (const day of props.daysOfWeek) {
            const templateEntry = editHotelPattern.value.template?.[day.value];
            if (templateEntry && templateEntry.plan_id) {
                dayPlanSelections.value[day.value] = templateEntry.plan_id;
            } else {
                dayPlanSelections.value[day.value] = null;
            }
        }
    }
}, { immediate: true });

const updateHotelPattern = async () => {
    // Validation
    if (!editHotelPattern.value.name?.trim()) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
        return;
    }
    const isDuplicate = props.allHotelPatterns.some(pattern =>
        pattern.hotel_id === props.selectedHotelId &&
        pattern.name.trim().toLowerCase() === editHotelPattern.value.name.trim().toLowerCase() &&
        pattern.id !== editHotelPattern.value.id
    );
    if (isDuplicate) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称重複不可能', life: 3000 });
        return;
    }

    const template = {};
    for (const day of props.daysOfWeek) {
        const planId = dayPlanSelections.value[day.value];
        if (!planId) {
            toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
            return;
        }
        template[day.value] = {
            plan_id: planId,
        };
    }

    editHotelPattern.value.template = template;

    try {
        await updatePlanPattern(editHotelPattern.value.id, editHotelPattern.value);
        emit('patternUpdated');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン編集成功', life: 3000 });
    } catch (error) {
        console.error('パターン更新エラー:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'パターン更新失敗', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>
