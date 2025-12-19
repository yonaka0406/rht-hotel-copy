<template>
    <Dialog :header="`ホテルプラン編集 (${props.selectedHotelName})`" :visible="visible" :modal="true"
        :style="{ width: '70vw' }" class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
        <div class="grid grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-6">
                <FloatLabel>
                    <InputText v-model="editHotelPlan.name" fluid />
                    <label>名称</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-6">
                <div class="flex grid-cols-2 justify-center items-center">
                    <FloatLabel class="flex-1">
                        <InputText v-model="editHotelPlan.colorHEX" fluid />
                        <label>プラン表示HEX</label>
                    </FloatLabel>
                    <ColorPicker v-model="editHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
                </div>
                <small class="text-gray-500">カテゴリー色: <span :style="{ color: selectedTypeCategoryColor }">{{
                        selectedTypeCategoryColor }}</span></small>
            </div>
            <div class="col-span-2">
                <div class="p-float-label flex align-items-center gap-2">
                    <span class="inline-block align-middle font-bold">請求種類：</span>
                    <SelectButton v-model="editHotelPlan.plan_type" :options="sb_options" optionLabel="label"
                        optionValue="value" />
                </div>
            </div>
            <div class="col-span-1 pt-6">
                <FloatLabel>
                    <Select v-model="editHotelPlan.plan_type_category_id" :options="planTypeCategories"
                        optionLabel="name" optionValue="id" placeholder="タイプカテゴリーを選択" fluid />
                    <label>タイプカテゴリー</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 pt-6">
                <FloatLabel>
                    <Select v-model="editHotelPlan.plan_package_category_id" :options="planPackageCategories"
                        optionLabel="name" optionValue="id" placeholder="パッケージカテゴリーを選択" fluid />
                    <label>パッケージカテゴリー</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 pt-6">
                <FloatLabel>
                    <InputNumber v-model="editHotelPlan.display_order" fluid />
                    <label>表示順</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 flex items-center pt-6">
                <Checkbox v-model="editHotelPlan.is_active" inputId="isActive" :binary="true" />
                <label for="isActive" class="ml-2">有効</label>
            </div>
            <div class="col-span-1 pt-6">
                <FloatLabel>
                    <DatePicker v-model="editHotelPlan.available_from" dateFormat="yy/mm/dd" showIcon fluid />
                    <label>利用可能日 (開始)</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 pt-6">
                <FloatLabel>
                    <DatePicker v-model="editHotelPlan.available_until" dateFormat="yy/mm/dd" showIcon fluid />
                    <label>利用可能日 (終了)</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 pt-6 mb-2">
                <FloatLabel>
                    <Textarea v-model="editHotelPlan.description" fluid />
                    <label>詳細</label>
                </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="保存" icon="pi pi-check" @click="updateHotel"
                class="p-button-success p-button-text p-button-sm" />
            <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)"
                class="p-button-danger p-button-text p-button-sm" text />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { usePlansStore } from '@/composables/usePlansStore';
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import ColorPicker from 'primevue/colorpicker';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox'; // Added import
import DatePicker from 'primevue/datepicker'; // Added import

const props = defineProps({
    visible: Boolean,
    selectedHotelId: Number,
    selectedHotelName: String, // Add this line
    planTypeCategories: Array,
    planPackageCategories: Array,
    sb_options: Array,
    hotelPlans: Array, // For duplicate check
    initialEditHotelPlan: Object, // The plan to edit
});

const emit = defineEmits(['update:visible', 'planUpdated', 'orderChanged']);

const toast = useToast();
const { updateHotelPlan } = usePlansStore();

const editHotelPlan = ref({});

const selectedTypeCategoryColor = computed(() => {
    const category = (props.planTypeCategories || []).find(cat => cat.id === editHotelPlan.value.plan_type_category_id);
    return category ? category.color : 'カテゴリー色なし';
});

watch(() => props.visible, (newVal) => {
    if (newVal && props.initialEditHotelPlan) {
        const initialData = props.initialEditHotelPlan;
        console.log('EditHotelPlanDialog: Initializing with data:', initialData, 'ID:', initialData.id);
        editHotelPlan.value = {
            ...initialData,
            colorHEX: initialData.color ? initialData.color.replace('#', '') : '',
            // Use the existing category IDs directly from the data
            plan_type_category_id: initialData.plan_type_category_id || null,
            plan_package_category_id: initialData.plan_package_category_id || null,
            // Ensure plans_hotel_id is set - use plans_hotel_id if it exists, otherwise use id
            plans_hotel_id: initialData.plans_hotel_id || initialData.id,
        };
        console.log('EditHotelPlanDialog: Initialized editHotelPlan:', editHotelPlan.value);
        console.log('EditHotelPlanDialog: plans_hotel_id set to:', editHotelPlan.value.plans_hotel_id);
    }
}, { immediate: true });

// Watcher for automatic date adjustment
let isAdjusting = false;
watch([() => editHotelPlan.value.available_from, () => editHotelPlan.value.available_until], ([newFrom, newUntil], [oldFrom, oldUntil]) => {
    if (isAdjusting) return;
    const fromDate = newFrom ? new Date(newFrom) : null;
    const untilDate = newUntil ? new Date(newUntil) : null;

    if (fromDate && untilDate && fromDate.getTime() > untilDate.getTime()) {
        isAdjusting = true;
        try {
            // Determine which date was changed to decide which one to adjust
            const newFromTime = fromDate.getTime();
            const oldFromTime = oldFrom ? new Date(oldFrom).getTime() : null;
            const newUntilTime = untilDate.getTime();
            const oldUntilTime = oldUntil ? new Date(oldUntil).getTime() : null;

            if (newFromTime !== oldFromTime) {
                // available_from was changed and is now after available_until
                const newUntilDate = new Date(fromDate);
                newUntilDate.setDate(newUntilDate.getDate() + 1);
                editHotelPlan.value.available_until = newUntilDate;
                toast.add({ severity: 'info', summary: '自動調整', detail: '利用可能日 (終了)は利用可能日 (開始)の翌日に自動調整されました。', life: 3000 });
            } else if (newUntilTime !== oldUntilTime) {
                // available_until was changed and is now before available_from
                const newFromDate = new Date(untilDate);
                newFromDate.setDate(newFromDate.getDate() - 1);
                editHotelPlan.value.available_from = newFromDate;
                toast.add({ severity: 'info', summary: '自動調整', detail: '利用可能日 (開始)は利用可能日 (終了)の前日に自動調整されました。', life: 3000 });
            }
        } finally {
            isAdjusting = false;
        }
    }
});

const updateHotel = async () => {
    editHotelPlan.value.hotel_id = props.selectedHotelId;

    const trimmedPlanName = editHotelPlan.value.name?.trim();
    if (!trimmedPlanName) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '名称を記入してください。', life: 3000 });
        return;
    }

    const isDuplicate = (props.hotelPlans || []).some(plan =>
        plan.id !== editHotelPlan.value.id &&
        (plan.name || '').trim().toLowerCase() === trimmedPlanName.toLowerCase()
    );

    if (isDuplicate) {
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '選択したホテルに対してプラン名はユニークである必要があります。',
            life: 3000
        });
        return;
    }

    // Validation for required category IDs
    if (!editHotelPlan.value.plan_type_category_id) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'タイプカテゴリーを選択してください。', life: 3000 });
        return;
    }
    if (!editHotelPlan.value.plan_package_category_id) {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'パッケージカテゴリーを選択してください。', life: 3000 });
        return;
    }

    // Check if plan ID is valid, using plans_hotel_id consistently
    console.log('updateHotel: editHotelPlan.value before validation:', editHotelPlan.value);
    console.log('updateHotel: plans_hotel_id value:', editHotelPlan.value.plans_hotel_id);
    
    if (editHotelPlan.value.plans_hotel_id === undefined || editHotelPlan.value.plans_hotel_id === null) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '編集対象のプランIDが見つかりません。', life: 3000 });
        console.error('Error: Plan ID is undefined or null when trying to update hotel plan. Full object:', editHotelPlan.value);
        return;
    }

    // Date validation: available_from must not be after available_until
    const fromDate = editHotelPlan.value.available_from ? new Date(editHotelPlan.value.available_from) : null;
    const untilDate = editHotelPlan.value.available_until ? new Date(editHotelPlan.value.available_until) : null;

    if (fromDate && untilDate && fromDate > untilDate) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '利用可能日 (開始)は利用可能日 (終了)より前に設定してください。', life: 3000 });
        return;
    }

    try {
        // Pass plans_hotel_id to the updateHotelPlan action
        const planData = { 
            ...editHotelPlan.value, 
            plan_name: editHotelPlan.value.name, // Map name to plan_name for backend
            color: `#${editHotelPlan.value.colorHEX}` 
        };
        delete planData.colorHEX; // Remove colorHEX as 'color' is sent instead
        delete planData.name; // Remove name as plan_name is sent instead
        await updateHotelPlan(editHotelPlan.value.plans_hotel_id, planData);
        emit('planUpdated');
        emit('update:visible', false);
        toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン更新されました。', life: 3000 });
    } catch (err) {
        console.error('ホテルプランの更新エラー:', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの更新に失敗しました', life: 3000 });
    }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>