<template>
  <FloatLabel>
    <AutoComplete
      v-model="modelValueProxy"
      :suggestions="suggestions"
      :optionLabel="optionLabel"
      :placeholder="placeholder"
      :forceSelection="forceSelection"
      :loading="loading"
      :dropdown=false
      :panelClass="panelClass"
      @complete="$emit('complete', $event)"
      @option-select="$emit('option-select', $event)"
      @change="$emit('change', $event)"
      @clear="$emit('clear', $event)"
      fluid      
    >
      <template #option="slotProps">
        <slot name="option" v-bind="slotProps">
          <div>
            <p>
              <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
              <i v-else class="pi pi-user"></i>
              {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
              <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
            </p>
            <div class="flex items-center gap-2">
              <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
              <p v-if="slotProps.option.email" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
              <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
            </div>
          </div>
        </slot>
      </template>
      <template #empty>
        <slot name="empty">
          <div class="p-3 text-center text-gray-500">該当するクライアントが見つかりません。</div>
        </slot>
      </template>
    </AutoComplete>
    <label>{{ label }}</label>
  </FloatLabel>
</template>

<script setup>
import { computed } from 'vue';
import AutoComplete from 'primevue/autocomplete';
import FloatLabel from 'primevue/floatlabel';

const props = defineProps({
  modelValue: { type: [Object, String, Number], default: null },
  suggestions: { type: Array, default: () => [] },
  optionLabel: { type: String, default: 'display_name' },
  placeholder: { type: [String, null], default: null },
  label: { type: String, default: '個人氏名　||　法人名称' },
  forceSelection: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  dropdown: { type: Boolean, default: true },
  panelClass: { type: String, default: 'max-h-60 overflow-y-auto' },
});

const emit = defineEmits(['update:modelValue', 'complete', 'option-select', 'change', 'clear']);

const modelValueProxy = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
});
</script>

