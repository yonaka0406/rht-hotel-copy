<template>
  <ClientAutoComplete v-model="selectedClientProxy" :suggestions="filteredClients" :loading="clientsIsLoading"
    @complete="handleComplete" @option-select="handleOptionSelect" @change="handleChange" @clear="handleClear"
    :optionLabel="optionLabel" :placeholder="placeholder" :label="hideLabel ? '' : label" :useFloatLabel="useFloatLabel"
    :forceSelection="forceSelection" />
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useClientStore } from '@/composables/useClientStore';
import ClientAutoComplete from './ClientAutoComplete.vue';

const props = defineProps({
  modelValue: { type: [Object, String, Number], default: null },
  optionLabel: { type: String, default: 'display_name' },
  placeholder: { type: [String, null], default: null },
  label: { type: String, default: '個人氏名　||　法人名称' },
  hideLabel: { type: Boolean, default: false },
  personTypeFilter: { type: String, default: null, validator: (value) => !value || ['legal', 'natural'].includes(value) },
  useFloatLabel: { type: Boolean, default: true },
  forceSelection: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue', 'option-select', 'change', 'clear']);

const { clientsIsLoading, setClientsIsLoading } = useClientStore();

const selectedClientProxy = computed({
  get: () => {
    return props.modelValue;
  },
  set: v => {
    emit('update:modelValue', v);
  },
});

const filteredClients = ref([]);
let debounceTimer = null;

const performSearch = async (query) => {
  if (!query) {
    filteredClients.value = [];
    return;
  }

  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    console.warn('[ClientAutoCompleteWithStore] No authToken found. Search aborted.');
    filteredClients.value = [];
    return;
  }

  try {
    setClientsIsLoading(true);

    // Build URL with search query and optional personType filter
    let url = `/api/client-list/1?limit=20&search=${encodeURIComponent(query)}`;
    if (props.personTypeFilter) {
      url += `&personType=${encodeURIComponent(props.personTypeFilter)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();

    const results = data.clients || [];

    filteredClients.value = results.map(client => ({
      ...client,
      display_name: client.name_kanji || client.name_kana || client.name || ''
    }));
  } catch (error) {
    console.error('[ClientAutoCompleteWithStore] Search failed:', error);
    filteredClients.value = [];
  } finally {
    setClientsIsLoading(false);
  }
};

const handleComplete = (event) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(event.query);
  }, 400);
};

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
});
const handleOptionSelect = (event) => {
  emit('option-select', event);
};
const handleChange = (event) => {
  emit('change', event);
};
const handleClear = (event) => {
  emit('clear', event);
};

</script>