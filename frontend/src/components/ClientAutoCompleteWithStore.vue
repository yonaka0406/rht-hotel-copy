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
    :label="hideLabel ? '' : label"    
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
  hideLabel: { type: Boolean, default: false },
  personTypeFilter: { type: String, default: null, validator: (value) => !value || ['legal', 'natural'].includes(value) },
});
const emit = defineEmits(['update:modelValue', 'option-select', 'change', 'clear']);

const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();

watch(() => props.modelValue, () => {
});

const selectedClientProxy = computed({
  get: () => {
    return props.modelValue;
  },
  set: v => {
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
  const query = event.query.toLowerCase();
  const normalizedQuery = normalizePhone(query);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  if (!query || !clients.value || !Array.isArray(clients.value)) {
    filteredClients.value = [];
    return;
  }

  filteredClients.value = clients.value.filter((client) => {
    // Apply person type filter if specified
    if (props.personTypeFilter && client.legal_or_natural_person !== props.personTypeFilter) {
      return false;
    }

    const matchesName =
      (client.name && client.name.toLowerCase().includes(query)) ||
      (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
      (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
    const matchesPhoneFax = isNumericQuery &&
      ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) ||
      (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
    const matchesEmail = client.email && client.email.toLowerCase().includes(query);
    const matchesCustomerId = client.customer_id && typeof client.customer_id === 'string' && client.customer_id.toLowerCase().includes(query);
    return matchesName || matchesPhoneFax || matchesEmail || matchesCustomerId;
  }).map(ensureDisplayName);
};

const handleComplete = (event) => {
  filterClients(event);
};
const handleOptionSelect = (event) => {
  emit('option-select', event);
};
const handleChange = (event) => {
  emit('change', event);
};
const handleClear = (event) => {
  emit('clear', event);
};

watch(selectedClientProxy, () => {
});

onMounted(async () => {
  if (!clients.value || clients.value.length === 0) {
    setClientsIsLoading(true);
    const clientsTotalPages = await fetchClients(1);
    const fetchPromises = [];
    for (let page = 2; page <= clientsTotalPages; page++) {
      fetchPromises.push(fetchClients(page));
    }
    await Promise.all(fetchPromises);
    setClientsIsLoading(false);
  }
  // Ensure all loaded clients have display_name
  if (clients.value && Array.isArray(clients.value)) {
    clients.value.forEach(ensureDisplayName);
  }
});
</script> 