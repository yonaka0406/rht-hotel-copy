<template>
  <Dialog 
    :header="localCategory.id ? `${categoryType}カテゴリー編集` : `${categoryType}カテゴリー追加`" 
    :visible="visible" 
    :modal="true" 
    :style="{ width: '50vw' }" 
    class="p-fluid"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="grid grid-cols-1 gap-4 pt-4">
      <div class="mt-6">
        <FloatLabel>
          <InputText v-model="localCategory.name" fluid />
          <label>名称 *</label>
        </FloatLabel>
      </div>
      <div class="mt-6">
        <FloatLabel>
          <Textarea v-model="localCategory.description" rows="3" fluid />
          <label>説明</label>
        </FloatLabel>
      </div>
      <div class="flex items-center gap-2 mt-6">
        <FloatLabel class="flex-1">
          <InputText v-model="localCategory.color" fluid />
          <label>色 (HEX)</label>
        </FloatLabel>
        <ColorPicker v-model="localCategory.color" format="hex" />
      </div>
      <div class="mt-6">
        <FloatLabel>
          <InputNumber v-model="localCategory.display_order" fluid />
          <label>表示順</label>
        </FloatLabel>
      </div>
    </div>
    <template #footer>
      <Button label="キャンセル" icon="pi pi-times" @click="$emit('update:visible', false)" text />
      <Button label="保存" icon="pi pi-check" @click="handleSave" />
    </template>
  </Dialog>
</template>

<script setup>
import { computed, watch, ref } from 'vue';
import { useToast } from 'primevue/usetoast';

// PrimeVue Components
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import ColorPicker from 'primevue/colorpicker';
import Button from 'primevue/button';

const props = defineProps({
  visible: Boolean,
  category: {
    type: Object,
    default: () => ({
      id: null,
      name: '',
      description: '',
      color: '#D3D3D3',
      display_order: 0,
    })
  },
  categoryType: {
    type: String,
    required: true, // 'タイプ' or 'パッケージ'
  }
});

const emit = defineEmits(['update:visible', 'save']);

const toast = useToast();

// Local reactive copy of category to avoid mutating props
const localCategory = ref({ ...props.category });

// Watch for changes in props.category to update local copy
watch(() => props.category, (newCategory) => {
  localCategory.value = { ...newCategory };
}, { deep: true, immediate: true });

const handleSave = () => {
  if (!localCategory.value.name?.trim()) {
    toast.add({ severity: 'error', summary: 'エラー', detail: '名称を入力してください', life: 3000 });
    return;
  }

  emit('save', localCategory.value);
};
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>