<template>
    <Dialog header="ホテルパターン編集" :visible="visible" :modal="true" :style="{ width: '70vw' }" class="p-fluid"
        :closable="true" @update:visible="$emit('update:visible', $event)">
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
                        <Select v-model="dayPlanSelections[day.value]" :options="hotelPlans" optionLabel="name"
                            optionValue="plan_key" fluid />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateHotelPattern"
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
    selectedHotelId: Number,
    hotelPlans: Array,
    allHotelPatterns: Array, // For duplicate check
    initialEditHotelPattern: Object, // The pattern to edit
    daysOfWeek: Array,
});

// Debug props on component mount
console.log('EditHotelPatternDialog - Component mounted with props:', {
    visible: props.visible,
    selectedHotelId: props.selectedHotelId,
    hotelPlans: props.hotelPlans,
    allHotelPatterns: props.allHotelPatterns,
    initialEditHotelPattern: props.initialEditHotelPattern,
    daysOfWeek: props.daysOfWeek
});

const emit = defineEmits(['update:visible', 'patternUpdated']);

const toast = useToast();
const { updatePlanPattern } = usePlansStore();

const editHotelPattern = ref({});
const dayPlanSelections = ref({});

// Watch for changes to initialEditHotelPattern
watch(() => props.initialEditHotelPattern, (newVal) => {
    console.log('EditHotelPatternDialog - initialEditHotelPattern changed:', newVal);
}, { deep: true });

// Watch for changes to hotelPlans
watch(() => props.hotelPlans, (newVal) => {
    console.log('EditHotelPatternDialog - hotelPlans changed:', newVal);
    if (newVal && newVal.length > 0) {
        console.log('EditHotelPatternDialog - First hotelPlan structure:', newVal[0]);
        console.log('EditHotelPatternDialog - Available properties:', Object.keys(newVal[0]));
    }
}, { deep: true });

watch(() => props.visible, (newVal) => {
    console.log('EditHotelPatternDialog - visible changed:', newVal);
    console.log('EditHotelPatternDialog - initialEditHotelPattern:', props.initialEditHotelPattern);
    console.log('EditHotelPatternDialog - hotelPlans:', props.hotelPlans);
    console.log('EditHotelPatternDialog - daysOfWeek:', props.daysOfWeek);

    if (newVal && props.initialEditHotelPattern) {
        console.log('EditHotelPatternDialog - Setting up edit data...');
        editHotelPattern.value = { ...props.initialEditHotelPattern };
        console.log('EditHotelPatternDialog - editHotelPattern set to:', editHotelPattern.value);

        // Populate dayPlanSelections based on initialEditHotelPattern's template
        dayPlanSelections.value = {};
        console.log('EditHotelPatternDialog - Processing template:', editHotelPattern.value.template);

        for (const day of props.daysOfWeek) {
            const templateEntry = editHotelPattern.value.template?.[day.value];
            console.log(`EditHotelPatternDialog - Day ${day.value} (${day.label}) template entry:`, templateEntry);

            if (templateEntry && templateEntry.plan_key) {
                dayPlanSelections.value[day.value] = templateEntry.plan_key;
                console.log(`EditHotelPatternDialog - Set ${day.value} to plan_key:`, templateEntry.plan_key);
            } else {
                dayPlanSelections.value[day.value] = null;
                console.log(`EditHotelPatternDialog - Set ${day.value} to null (no template entry or plan_key)`);
            }
        }

        console.log('EditHotelPatternDialog - Final dayPlanSelections:', dayPlanSelections.value);
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
        const planKey = dayPlanSelections.value[day.value];
        if (!planKey) {
            toast.add({ severity: 'error', summary: 'エラー', detail: `全曜日にプランを設定してください (${day.label})。`, life: 3000 });
            return;
        }
        
        // Parse plan_key to extract plans_global_id and plans_hotel_id
        const match = planKey.match(/^(\d*)h(\d+)?$/);
        if (!match) {
            toast.add({ severity: 'error', summary: 'エラー', detail: `無効なプランキー形式です (${day.label})。`, life: 3000 });
            return;
        }
        const plans_global_id = match[1] ? parseInt(match[1]) : null;
        const plans_hotel_id = match[2] ? parseInt(match[2]) : null;

        if (plans_global_id === null && plans_hotel_id === null) {
            toast.add({ severity: 'error', summary: 'エラー', detail: `無効なプランキー形式です (${day.label})。`, life: 3000 });
            return;
        }
        
        template[day.value] = {
            plan_key: planKey,
            plans_global_id,
            plans_hotel_id
        };
    }

    editHotelPattern.value.template = template;

    try {
        await updatePlanPattern(editHotelPattern.value.id, {
            name: editHotelPattern.value.name,
            template: JSON.stringify(template)
        });
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