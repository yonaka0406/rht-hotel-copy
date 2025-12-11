<template>
  <Dialog 
    :header="isEdit ? 'ホテルアドオン編集' : '新規ホテルアドオン'" 
    v-model:visible="isVisible" 
    :modal="true" 
    :style="{ width: '60vw' }" 
    class="p-fluid" 
    :closable="true"
    @update:visible="handleClose"
  >
    <div class="grid grid-cols-2 gap-2 pt-6">
      <div class="col-span-1 mb-6">
        <FloatLabel>
          <InputText v-model="localAddon.name" fluid />
          <label>名称</label>
        </FloatLabel>
      </div>
      <div class="col-span-1 mb-6">
        <FloatLabel>
          <Select
            v-model="localAddon.addon_category_id"
            :options="addonTypes"
            optionLabel="name"
            optionValue="id"
            fluid
          />
          <label>アドオン区分</label>
        </FloatLabel>
      </div>
      <div class="col-span-1 mb-6">
        <FloatLabel>
          <InputNumber
            v-model="localAddon.price"
            mode="currency"
            currency="JPY"
            locale="ja-JP"
            fluid
          />
          <label>単価（税込）</label>
        </FloatLabel>
        <small class="text-gray-500">
          税抜価格: {{ formatCurrency(netPrice) }}
        </small>
      </div>
      <div class="col-span-1 mb-6">
        <FloatLabel>
          <Select
            v-model="localAddon.tax_type_id"
            :options="taxTypes"
            optionLabel="name"
            optionValue="id"
            fluid
          />
          <label>税区分</label>
        </FloatLabel>
      </div>
      <div class="col-span-2 mb-2">
        <FloatLabel>
          <Textarea v-model="localAddon.description" fluid />
          <label>詳細</label>
        </FloatLabel>
      </div>
      <div v-if="isEdit" class="col-span-2 pt-2 flex items-center justify-center">
        <ToggleButton
          v-model="localAddon.visible"
          onLabel="表示"
          offLabel="非表示"
          onIcon="pi pi-eye"
          offIcon="pi pi-eye-slash"
          aria-label="ステータス切り替え"
        />
      </div>
    </div>
    <template #footer>
      <Button 
        label="保存" 
        icon="pi pi-check" 
        @click="handleSave" 
        class="p-button-success p-button-text p-button-sm" 
      />
      <Button 
        label="閉じる" 
        icon="pi pi-times" 
        @click="handleClose" 
        class="p-button-danger p-button-text p-button-sm" 
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Dialog, FloatLabel, InputText, InputNumber, Textarea, Select, ToggleButton, Button } from 'primevue';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  addon: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  addonTypes: {
    type: Array,
    default: () => []
  },
  taxTypes: {
    type: Array,
    default: () => []
  },
  defaultTaxTypeId: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['update:visible', 'save']);

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const localAddon = ref({
  id: null,
  hotel_id: null,
  name: '',
  description: '',
  addon_category_id: 5,
  tax_type_id: props.defaultTaxTypeId,
  price: 0,
  visible: true
});

const resetAddon = () => {
  localAddon.value = {
    id: null,
    hotel_id: null,
    name: '',
    description: '',
    addon_category_id: 5,
    tax_type_id: props.defaultTaxTypeId,
    price: 0,
    visible: true
  };
};

watch(() => props.addon, (newAddon) => {
  if (newAddon) {
    localAddon.value = { ...newAddon };
  } else {
    resetAddon();
  }
}, { immediate: true });

watch(() => props.visible, (newVisible) => {
  if (newVisible && !props.addon) {
    resetAddon();
  }
});

const taxRate = computed(() => {
  if (!props.taxTypes || props.taxTypes.length === 0) {
    return 0;
  }
  const taxType = props.taxTypes.find(t => t.id === localAddon.value.tax_type_id);
  return taxType ? taxType.percentage : 0;
});

const netPrice = computed(() => {
  if (localAddon.value.price === null || localAddon.value.price === undefined || localAddon.value.price === '') {
    return 0;
  }
  const price = Number(localAddon.value.price);
  const rate = Number(taxRate.value);

  if (isNaN(price)) {
    return 0;
  }

  if (rate === 0) {
    return price;
  } else {
    return Math.floor(price / (1 + rate));
  }
});

const formatCurrency = (value) => {
  if (value == null) return '';
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const handleSave = () => {
  emit('save', { ...localAddon.value, tax_rate: taxRate.value });
};

const handleClose = () => {
  emit('update:visible', false);
};
</script>
