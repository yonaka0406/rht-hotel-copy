<template>
  <Dialog 
    :visible="visible" 
    :modal="true"
    header="部屋タイプ追加"
    :style="{ width: '450px' }"
    class="p-fluid"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col">
        <label for="name" class="font-medium mb-2 block">部屋タイプ名 *</label>
        <InputText 
          id="name"
          v-model="localRoomType.name" 
          required
          autofocus
          fluid
        />
      </div>

      <div class="flex flex-col">
        <label for="description" class="font-medium mb-2 block">詳細</label>
        <Textarea 
          id="description"
          v-model="localRoomType.description" 
          rows="3"
          autoResize
          fluid
        />
      </div>
      
    </div>

    <template #footer>
      <Button 
        label="キャンセル" 
        icon="pi pi-times" 
        @click="closeDialog"
        text 
      />
      <Button 
        label="保存" 
        icon="pi pi-check" 
        @click="save" 
      />
    </template>
  </Dialog>
</template>

<script setup>
import { reactive, watch } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  roomType: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:visible', 'save']);
const toast = useToast();

const localRoomType = reactive({
  name: '',
  description: ''
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (props.roomType) {
      localRoomType.name = props.roomType.name;
      localRoomType.description = props.roomType.description;
    } else {
      localRoomType.name = '';
      localRoomType.description = '';
    }
  }
});

const closeDialog = () => {
  emit('update:visible', false);
};

const save = () => {
  if (!localRoomType.name) {
    toast.add({
      severity: 'error',
      summary: 'バリデーションエラー',
      detail: '名称は必須です。',
      life: 3000
    });
    return;
  }
  emit('save', { ...localRoomType });
};
</script>
