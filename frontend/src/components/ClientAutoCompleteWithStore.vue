<template>
  <ClientAutoComplete
    v-model="selectedClientProxy"
    :suggestions="filteredClients"
    :loading="clientsIsLoading"
    @complete="handleComplete"
    @option-select="handleOptionSelect"
    @change="handleChange"
    @clear="handleClear"
    :optionLabel="optionLabel"
    :placeholder="placeholder"
    :label="label"    
  />
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useClientStore } from '@/composables/useClientStore';
import ClientAutoComplete from './ClientAutoComplete.vue';

const props = defineProps({
  modelValue: { type: [Object, String, Number], default: null },
  optionLabel: { type: String, default: 'display_name' },
  placeholder: { type: [String, null], default: null },
  label: { type: String, default: '個人氏名　||　法人名称' },
});
const emit = defineEmits(['update:modelValue', 'option-select', 'change', 'clear']);

const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();

watch(() => props.modelValue, (val) => {
  console.log('[ClientAutoCompleteWithStore] props.modelValue changed:', val);
});

const selectedClientProxy = computed({
  get: () => {
    console.log('[ClientAutoCompleteWithStore] selectedClientProxy.get:', props.modelValue);
    return props.modelValue;
  },
  set: v => {
    console.log('[ClientAutoCompleteWithStore] selectedClientProxy.set:', v);
    emit('update:modelValue', v);
  },
});

const filteredClients = ref([]);

const normalizeKana = (str) => {
  if (!str) return '';
  let normalizedStr = str.normalize('NFKC');
  normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
  normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEC0));
  return normalizedStr;
};
const normalizePhone = (phone) => {
  if (!phone) return '';
  let normalized = phone.replace(/\D/g, '');
  normalized = normalized.replace(/^0+/, '');
  return normalized;
};

const ensureDisplayName = (client) => {
  if (!client.display_name) {
    client.display_name = client.name_kanji || client.name_kana || client.name || '';
  }
  return client;
};

const filterClients = (event) => {
  console.log('[ClientAutoCompleteWithStore] Search/filter event:', event.query);
  const query = event.query.toLowerCase();
  const normalizedQuery = normalizePhone(query);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  if (!query || !clients.value || !Array.isArray(clients.value)) {
    filteredClients.value = [];
    return;
  }

  filteredClients.value = clients.value.filter((client) => {
    const matchesName =
      (client.name && client.name.toLowerCase().includes(query)) ||
      (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
      (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
    const matchesPhoneFax = isNumericQuery &&
      ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) ||
      (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
    const matchesEmail = client.email && client.email.toLowerCase().includes(query);
    return matchesName || matchesPhoneFax || matchesEmail;
  }).map(ensureDisplayName);
};

const handleComplete = (event) => {
  console.log('[ClientAutoCompleteWithStore] @complete event:', event);
  filterClients(event);
};
const handleOptionSelect = (event) => {
  console.log('[ClientAutoCompleteWithStore] @option-select event:', event);
  emit('option-select', event);
};
const handleChange = (event) => {
  console.log('[ClientAutoCompleteWithStore] @change event:', event);
  emit('change', event);
};
const handleClear = (event) => {
  console.log('[ClientAutoCompleteWithStore] @clear event:', event);
  emit('clear', event);
};

watch(selectedClientProxy, (val) => {
  console.log('[ClientAutoCompleteWithStore] v-model changed:', val);
});

onMounted(async () => {
  console.log('[ClientAutoCompleteWithStore] Loading clients...');
  if (!clients.value || clients.value.length === 0) {
    setClientsIsLoading(true);
    const clientsTotalPages = await fetchClients(1);
    for (let page = 2; page <= clientsTotalPages; page++) {
      await fetchClients(page);
    }
    setClientsIsLoading(false);
  }
  // Ensure all loaded clients have display_name
  if (clients.value && Array.isArray(clients.value)) {
    clients.value.forEach(ensureDisplayName);
  }
  console.log('[ClientAutoCompleteWithStore] Clients loaded.');
});
</script> 