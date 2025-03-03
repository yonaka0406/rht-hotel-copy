<template>
    <div class="p-4">
        <h2 class="text-xl font-bold mb-4">Client Merge</h2>

        <div class="grid grid-cols-3 gap-4">
            <!-- New Client Data -->
            <Card class="p-4">
                <template #title>New Client</template>
                <template #content>
                    <div v-if="newClient">
                        <div
                        v-for="field in fields"
                        :key="field"
                        class="mb-2"
                        >
                        <span class="font-bold">{{ field.replace(/_/g, ' ').toUpperCase() }}:</span>
                        <span
                            :class="
                            selectedFields[field] === 'New'
                                ? 'text-blue-500'
                                : 'text-gray-500'
                            "
                        >
                            {{ newClient[field] || 'N/A' }}
                        </span>
                        </div>
                    </div>
                    <p v-else class="text-gray-400">Loading...</p>
                </template>
            </Card>        

            <!-- Merged Data -->
            <Card class="p-4 border-2 border-blue-500">
                <template #title>Merged Result</template>
                <template #content>                    
                    <div v-if="mergedClient">                        
                        <div v-for="field in fields" :key="field" class="mt-4">
                            <label class="block font-semibold mb-1">{{ field.replace(/_/g, ' ').toUpperCase() }}:</label>
                            <ToggleButton
                                v-model="selectedFields[field]"
                                onLabel="New"
                                offLabel="Old"
                                onIcon="pi pi-arrow-right-arrow-left"
                                offIcon="pi pi-arrow-right-arrow-left"                                
                                class="mb-2"
                            />
                        </div>
                    </div>
                </template>
            </Card>

            <!-- Old Client Data -->
            <Card class="p-4">
                <template #title>Old Client</template>
                <template #content>
                    <div v-if="oldClient">
                        <div
                        v-for="field in fields"
                        :key="field"
                        class="mb-2"
                        >
                        <span class="font-bold">{{ field.replace(/_/g, ' ').toUpperCase() }}:</span>
                        <span
                            :class="
                            selectedFields[field] === 'Old'
                                ? 'text-red-500'
                                : 'text-gray-500'
                            "
                        >
                            {{ oldClient[field] || 'N/A' }}
                        </span>
                        </div>
                    </div>
                    <p v-else class="text-gray-400">Loading...</p>
                </template>
            </Card>      
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useClientStore } from '@/composables/useClientStore';
import { Card, ToggleButton } from 'primevue';

const props = defineProps({
  oldID: String,
  newID: String
});

const { fetchClient } = useClientStore();

const oldClient = ref(null);
const newClient = ref(null);
const mergedClient = ref({});
const selectedFields = ref({});

// Fetch client data when props change
const fetchData = async () => {
    if (props.oldID) {
        const response = await fetchClient(props.oldID);        
        if (response && response.client) {
            oldClient.value = response.client;
        } else {
            oldClient.value = null; // Or handle the error as needed
        }
    }

    if (props.newID) {
        const response = await fetchClient(props.newID);

        if (response && response.client) {
            newClient.value = response.client;
        } else {
            newClient.value = null; // Or handle the error as needed
        }
    }
  
    mergeClients();
};

watch(() => [props.oldID, props.newID], fetchData, { immediate: true });

// Merge logic: prioritize `newClient` data
const mergeClients = () => {
  if (!newClient.value && !oldClient.value) return;

  mergedClient.value = fields.reduce((acc, field) => {
    const newValue = newClient.value?.[field] || '';
    const oldValue = oldClient.value?.[field] || '';
    
    acc[field] = selectedFields.value[field] === 'new' ? newValue : oldValue;
    return acc;    
  }, {});
};

const fields = [
  'name',
  'name_kana',
  'name_kanji',
  'date_of_birth',
  'legal_or_natural_person',
  'gender',
  'email',
  'phone',
  'fax',
];
// Initialize selectedFields with default values
fields.forEach((field) => {
  if (!selectedFields.value[field]) {
    selectedFields.value[field] = 'New';
  }
});
const toggleFields = computed(() => {
  return fields.map((field) => ({
    name: field,
    label: field.replace(/_/g, ' ').toUpperCase(),
  }));
});


</script>