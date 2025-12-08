<template>
    <Dialog header="ホテルプラン追加" :visible="visible" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true" @update:visible="$emit('update:visible', $event)">
      <div class="grid grid-cols-2 gap-2 pt-6">
        <div class="col-span-1 mb-6">
          <FloatLabel>
            <InputText v-model="newHotelPlan.name" fluid />
            <label>名称</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 mb-6">
          <div class="flex grid-cols-2 justify-center items-center">
            <FloatLabel>
              <InputText v-model="newHotelPlan.colorHEX" fluid />
              <label>プラン表示HEX</label>
            </FloatLabel>
            <ColorPicker v-model="newHotelPlan.colorHEX" inputId="cp-hex" format="hex" class="ml-2" />
          </div>
        </div>
        <div class="col-span-2">
          <div class="p-float-label flex align-items-center gap-2">
            <span class="inline-block align-middle font-bold">請求種類：</span>
            <SelectButton
              v-model="newHotelPlan.plan_type"
              :options="sb_options"
              optionLabel="label"
              optionValue="value"
            />
          </div>
        </div>
        <div class="col-span-1 pt-6">
          <FloatLabel>
              <Select
                  v-model="newHotelPlan.plan_type_category_id"
                  :options="planTypeCategories"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="タイプカテゴリーを選択"
                  class="w-full"
                  showClear
              />
              <label>タイプカテゴリー</label>
          </FloatLabel>
        </div>
        <div class="col-span-1 pt-6">
          <FloatLabel>
              <Select
                  v-model="newHotelPlan.plan_package_category_id"
                  :options="planPackageCategories"
                  optionLabel="name"
                  optionValue="id"
                  placeholder="パッケージカテゴリーを選択"
                  class="w-full"
                  showClear
              />
              <label>パッケージカテゴリー</label>
          </FloatLabel>
        </div>
        <div class="col-span-2 pt-6 mb-2">
          <FloatLabel>
            <Textarea v-model="newHotelPlan.description" fluid />
            <label>詳細</label>
          </FloatLabel>
        </div>
      </div>
      <template #footer>
        <Button label="保存" icon="pi pi-check" @click="saveHotelPlan" class="p-button-success p-button-text p-button-sm" />
        <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-danger p-button-text p-button-sm" text />
      </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { usePlansStore } from '@/composables/usePlansStore';

const props = defineProps({
  visible: Boolean,
  selectedHotelId: Number,
  planTypeCategories: Array,
  planPackageCategories: Array,
  sb_options: Array,
  hotelPlans: Array, // For duplicate check
});

const emit = defineEmits(['update:visible', 'planAdded']);

const toast = useToast();
const { createHotelPlan } = usePlansStore();

const newHotelPlan = ref({
  hotel_id: null,
  name: '',
  description: '',
  plan_type: 'per_room',
  colorHEX: 'D3D3D3',
  plan_type_category_id: null,
  plan_package_category_id: null,
  display_order: 0,
  is_active: true,
  available_from: null,
  available_until: null,
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    // Reset form when dialog opens
    newHotelPlan.value = { 
      hotel_id: props.selectedHotelId, // Set hotel_id immediately
      name: '', 
      description: '', 
      plan_type: 'per_room',
      colorHEX: 'D3D3D3', 
      plan_type_category_id: null,
      plan_package_category_id: null,
      display_order: 0,
      is_active: true,
      available_from: null,
      available_until: null,
    };
  }
}, { immediate: true });

const saveHotelPlan = async () => {
  newHotelPlan.value.hotel_id = props.selectedHotelId;            

  const PlanSet = new Set();
  const newPlanKey = `${newHotelPlan.value.name}-${newHotelPlan.value.hotel_id}`;
  if (props.hotelPlans) {
    for (const plan of props.hotelPlans) {
      const planKey = `${plan.name}-${plan.hotel_id}`;
      PlanSet.add(planKey);              
    }
  }
  
  if (PlanSet.has(newPlanKey)) {
    toast.add({ 
      severity: 'error', 
      summary: 'エラー',
      detail: '選択したホテルに対してプラン名はユニークである必要があります。', life: 3000
    });
    return;
  }

  try {
    await createHotelPlan(newHotelPlan.value);
    emit('planAdded');
    emit('update:visible', false);
    toast.add({ severity: 'success', summary: '成功', detail: 'ホテルプラン追加されました。', life: 3000 });
  } catch (err) {
    console.error('ホテルプランの保存エラー:', err);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルプランの保存に失敗しました', life: 3000 });
  }
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>
