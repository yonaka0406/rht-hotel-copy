<template>
    <Dialog :header="`ホテルプラン編集 (${props.selectedHotelName})`" :visible="visible" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="editHotelPlan.plan_name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="editHotelPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="editHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
          <small class="text-gray-500">カテゴリー色: <span :style="{ color: selectedTypeCategoryColor }">{{ selectedTypeCategoryColor }}</span></small>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton
              v-model="editHotelPlan.plan_type"
              :options="sb_options"
              optionLabel="label"
              optionValue="value"
            />
          </div>
        </div>
        <div class="col-span-1 pt-6">
          <FloatLabel>
              <Select
                  v-model="editHotelPlan.plan_type_category_id"
                  :options="planTypeCategories"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="タイプカテゴリーを選択"
                  class="w-full"
              />
              <label>タイプカテゴリー</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 pt-6">
          <FloatLabel>
              <Select
                  v-model="editHotelPlan.plan_package_category_id"
                  :options="planPackageCategories"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="パッケージカテゴリーを選択"
                  class="w-full"
              />
              <label>パッケージカテゴリー</label>
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
        <Button label="保存" icon="pi pi-check" @click="updateHotel" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-danger p-button-text p-button-sm" text />
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

const emit = defineEmits(['update:visible', 'planUpdated']);

const toast = useToast();
const { updateHotelPlan } = usePlansStore();

const editHotelPlan = ref({});

const selectedTypeCategoryColor = computed(() => {
  const category = props.planTypeCategories.find(cat => cat.id === editHotelPlan.value.plan_type_category_id);
  return category ? category.color : 'カテゴリー色なし';
});

watch(() => props.visible, (newVal) => {
  if (newVal && props.initialEditHotelPlan) {
    const initialData = props.initialEditHotelPlan;
    editHotelPlan.value = {
      ...initialData,
      colorHEX: initialData.color ? initialData.color.replace('#', '') : '',
      plan_type_category_id: props.planTypeCategories.find(cat => cat.name === initialData.type_category)?.id || null,
      plan_package_category_id: props.planPackageCategories.find(cat => cat.name === initialData.package_category)?.id || null,
    };
  }
}, { immediate: true });

const updateHotel = async () => {
  editHotelPlan.value.hotel_id = props.selectedHotelId;
  
  // Filter out the current id from hotelPlans
  const filteredPlans = props.hotelPlans.filter(plan => plan.id !== editHotelPlan.value.id);

  // Check for duplicate keys
  const PlanSet = new Set();
  const newPlanKey = `${editHotelPlan.value.name}-${editHotelPlan.value.hotel_id}`;
  for (const plan of filteredPlans) {
    const planKey = `${plan.name}-${plan.hotel_id}`;
    PlanSet.add(planKey);              
    if (PlanSet.has(newPlanKey)) {
      toast.add({ 
        severity: 'error', 
        summary: 'エラー',
        detail: '選択したホテルに対してプラン名はユニークである必要があります。', life: 3000
      });
      return;
    }
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

  try {
    await updateHotelPlan(editHotelPlan.value.id, editHotelPlan.value);
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
