<template>
  <Dialog v-model:visible="visible" :modal="true" :closable="false" header="検索を保存" :style="{ width: '350px' }">
    <div class="mb-4">
      <label for="searchName" class="block mb-2 font-bold">検索名</label>
      <InputText id="searchName" v-model="searchName" class="w-full" placeholder="例: 今週の未確定" />
    </div>
    <div class="mb-4">
      <label for="searchCategory" class="block mb-2 font-bold">カテゴリ</label>
      <Select id="searchCategory" v-model="category" :options="categoryOptions" optionLabel="label" optionValue="value" editable class="w-full" placeholder="カテゴリを選択または入力" />
    </div>
    <div class="flex justify-end gap-2">
      <Button label="キャンセル" text @click="onCancel" />
      <Button label="保存" :disabled="!searchName.trim()" @click="onSave" />
    </div>
  </Dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { useSavedSearch } from '@/composables/useSavedSearch'

const props = defineProps({
  visible: Boolean,
  modelValue: String,
  category: String,
  editId: String // Pass id if editing
})
const emit = defineEmits(['saved', 'cancel', 'update:modelValue'])

const searchName = ref(props.modelValue || '')
const visible = ref(props.visible)
const category = ref(props.category || '')
const categoryOptions = [
  { label: '業務', value: '業務' },
  { label: '個人', value: '個人' },
  { label: '高額', value: '高額' }
]

const { create, update } = useSavedSearch()

watch(() => props.visible, (val) => {
  visible.value = val
  if (val) {
    searchName.value = props.modelValue || ''
    category.value = props.category || ''
  }
})
watch(() => props.modelValue, (val) => {
  if (visible.value) searchName.value = val || ''
})
watch(() => props.category, (val) => {
  if (visible.value) category.value = val || ''
})

async function onSave() {
  const payload = {
    name: searchName.value.trim(),
    category: category.value.trim(),
    filters: {}, // TODO: pass actual filters from parent
    favorite: false
  }
  let result
  if (props.editId) {
    result = await update(props.editId, payload)
  } else {
    result = await create(payload)
  }
  if (result) emit('saved', result)
  visible.value = false
}
function onCancel() {
  emit('cancel')
  visible.value = false
}
</script> 