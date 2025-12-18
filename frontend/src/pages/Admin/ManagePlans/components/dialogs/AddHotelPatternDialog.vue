<template>
    <Dialog header="ホテルパターン追加" :visible="visible" :modal="true" :style="{ width: '600px' }" class="p-fluid"
        :closable="true" @update:visible="$emit('update:visible', $event)">
        <div class="grid grid-cols-1 gap-2 pt-6">
            <div class="col-span-1 mb-6">
                <FloatLabel>
                    <InputText v-model="newHotelPattern.name" fluid />
                    <label>パターン名</label>
                </FloatLabel>
            </div>
        </div>
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div v-for="day in daysOfWeek" :key="day.value" class="mt-4">
                <div>
                    <span>{{ day.label }}</span>
                </div>
                <div>
                    <FloatLabel>
                        <Select v-if="hotelPlans && hotelPlans.length > 0" v-model="dayPlanSelections[day.value]"
                            :options="hotelPlans" optionLabel="plan_name" optionValue="plan_id" class="w-full" />
                        <label class="font-semibold mb-1 block"></label>
                    </FloatLabel>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="saveHotelPattern"
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
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext'; // Added import

const props = defineProps({
    visible: Boolean,
    selectedHotelId: Number,
    hotelPlans: Array,
    allHotelPatterns: Array, // For duplicate check
    daysOfWeek: Array,
});

const emit = defineEmits(['update:visible', 'patternAdded']);

const toast = useToast();
const { createPlanPattern } = usePlansStore();

const newHotelPattern = ref({
    hotel_id: null,
    name: '',
    template: {}
});

const dayPlanSelections = ref({});

watch(() => props.visible, (newVal) => {
    if (newVal) {
        newHotelPattern.value = {
            hotel_id: props.selectedHotelId,
            name: '',
            template: {}
        };
        // Initialize dayPlanSelections
        dayPlanSelections.value = {};
        for (const day of props.daysOfWeek) {
            dayPlanSelections.value[day.value] = null;
        }
    }
}, { immediate: true });

const saveHotelPattern = async () => {
    // Validation
    if (!newHotelPattern.value.name?.trim()) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称記入してください。', life: 3000 });
        return;
    }
    const isDuplicate = props.allHotelPatterns?.some(pattern =>
        pattern.hotel_id === props.selectedHotelId &&
        pattern.name.trim().toLowerCase() === newHotelPattern.value.name.trim().toLowerCase()
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
            plans_hotel_id: planId,
        };
    }

    try {
        await createPlanPattern({
            hotel_id: newHotelPattern.value.hotel_id,
            name: newHotelPattern.value.name,
            template: JSON.stringify(template)
        });
        emit('patternAdded');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'パターン追加成功', life: 3000 });
    } catch (error) {
        console.error('パターン保存エラー:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'パターン保存失敗', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>