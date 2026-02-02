<template>
  <Dialog v-model:visible="dialogVisible" :header="dialogTitle" :modal="true" :style="{ width: '60vw' }" class="p-fluid"
    @hide="close">
    <form @submit.prevent="save" class="flex flex-col gap-y-3">
      <div class="field">
        <FloatLabel>
          <label for="client">クライアント</label>
          <ClientAutoCompleteWithStore id="client" v-model="selectedClientObjectForForm" @option-select="onClientSelect"
            placeholder="クライアントを選択・検索" :hideLabel="true"
            :disabled="actionFormMode === 'edit' && !!currentActionFormData.client_id" style="width: 100%;" />
        </FloatLabel>
      </div>

      <div class="field">
        <FloatLabel>
          <label for="actionDateTime">アクション日時</label>
          <DatePicker id="actionDateTime" v-model="currentActionFormData.action_datetime" :showTime="true"
            :showSeconds="false" hourFormat="24" dateFormat="yy/mm/dd" class="w-full" />
        </FloatLabel>
      </div>

      <div class="field">
        <FloatLabel>
          <label for="subject">件名</label>
          <InputText id="subject" v-model.trim="currentActionFormData.subject" class="w-full" />
        </FloatLabel>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div class="field">
          <FloatLabel>
            <label for="actionType">アクション種別</label>
            <Select id="actionType" v-model="currentActionFormData.action_type" :options="actionTypeOptions"
              optionLabel="label" optionValue="value" placeholder="選択してください" class="w-full" />
          </FloatLabel>
        </div>

        <div class="field">
          <FloatLabel>
            <label for="status">ステータス</label>
            <Select id="status" v-model="currentActionFormData.status" :options="statusOptions" optionLabel="label"
              optionValue="value" placeholder="選択してください" class="w-full" />
          </FloatLabel>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div class="field">
          <FloatLabel>
            <label for="assignedTo">担当者</label>
            <Select id="assignedTo" v-model="currentActionFormData.assigned_to" :options="userOptions"
              optionLabel="name" optionValue="id" placeholder="選択してください" class="w-full" :filter="true"
              :showClear="true" />
          </FloatLabel>
        </div>

        <div class="field">
          <FloatLabel>
            <label for="dueDate">対応期日</label>
            <DatePicker id="dueDate" v-model="currentActionFormData.due_date" dateFormat="yy/mm/dd" :showTime="false"
              class="w-full" />
          </FloatLabel>
        </div>
      </div>

      <div class="field">
        <FloatLabel>
          <label for="details">詳細</label>
          <Textarea id="details" v-model="currentActionFormData.details" rows="3" class="w-full" />
        </FloatLabel>
      </div>

      <div class="field">
        <FloatLabel>
          <label for="outcome">結果</label>
          <Textarea id="outcome" v-model="currentActionFormData.outcome" rows="2" class="w-full" />
        </FloatLabel>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button label="キャンセル" icon="pi pi-times" class="p-button-text p-button-danger" @click="close" />
        <Button type="submit" :label="actionFormMode === 'create' ? '作成' : '保存'" icon="pi pi-check"
          class="p-button-text" />
      </div>
    </form>
  </Dialog>
</template>

<script setup>
// Vue
import { ref, computed, watch } from 'vue';
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  actionData: { // This will be the full action object when editing
    type: Object,
    default: null,
  },
  actionFormMode: { // 'create' or 'edit'
    type: String,
    default: 'create',
  },
  allClients: { // Full list of clients for AutoComplete search
    type: Array,
    default: () => [],
  },
  clientsIsLoading: { // Loading state for clients
    type: Boolean,
    default: false,
  },
  actionTypeOptions: { // Options for action type select
    type: Array,
    default: () => [],
  },
  statusOptions: { // Options for status select
    type: Array,
    default: () => [],
  },
  userOptions: { // Options for assigned to select
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['save-action', 'close-dialog']);

// Stores
import { useClientStore } from '@/composables/useClientStore';
const { fetchClient } = useClientStore();

// Primevue
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';
import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

// --- Form Data State ---
const initialFormData = { // For resetting the form
  id: null,
  client_id: null,
  action_type: 'call', // Default action type
  action_datetime: new Date(),
  subject: '',
  details: '',
  outcome: '',
  assigned_to: null,
  due_date: null,
  status: 'pending' // Default status
};

const currentActionFormData = ref({ ...initialFormData });
const selectedClientObjectForForm = ref(null);

// Handle client selection from ClientAutoCompleteWithStore
const onClientSelect = (event) => {
  const selectedClient = event.value;
  selectedClientObjectForForm.value = selectedClient;
  if (selectedClient && selectedClient.id) {
    currentActionFormData.value.client_id = selectedClient.id;
  } else {
    currentActionFormData.value.client_id = null;
  }
};

// --- Computed Properties ---
const dialogVisible = computed({
  get() {
    return props.isOpen;
  },
  set(value) {
    if (!value) {
      emit('close-dialog');
    }
  },
});

const dialogTitle = computed(() => {
  return props.actionFormMode === 'create' ? '新規アクション作成' : 'アクション編集';
});

// --- Form Management Methods ---
const resetForm = () => {
  currentActionFormData.value = { ...initialFormData };
  selectedClientObjectForForm.value = null;
};

const populateForm = async (data) => {
  currentActionFormData.value = {
    ...initialFormData, // Start with defaults to ensure all fields are present
    id: data?.id || null,
    client_id: data?.client_id || null,
    action_type: data?.action_type || 'call',
    subject: data?.subject || '',
    details: data?.details || '',
    outcome: data?.outcome || '',
    assigned_to: data?.assigned_to || null,
    status: data?.status || 'pending',
    action_datetime: data?.action_datetime ? new Date(data.action_datetime) : new Date(),
    due_date: data?.due_date ? new Date(data.due_date) : null,
  };

  if (currentActionFormData.value.client_id) {
    // Try to find in the provided list first
    const clientObj = props.allClients.find(c => c.id === currentActionFormData.value.client_id);
    if (clientObj) {
      selectedClientObjectForForm.value = {
        ...clientObj,
        display_name: clientObj.name_kanji || clientObj.name_kana || clientObj.name || `クライアントID: ${clientObj.id}`
      };
    } else {
      // Fetch individual client if not in current list
      try {
        const result = await fetchClient(currentActionFormData.value.client_id);
        const fetchedClient = result.client;
        if (fetchedClient) {
          selectedClientObjectForForm.value = {
            ...fetchedClient,
            display_name: fetchedClient.name_kanji || fetchedClient.name_kana || fetchedClient.name || `クライアントID: ${fetchedClient.id}`
          };
        } else {
          selectedClientObjectForForm.value = null;
        }
      } catch (e) {
        console.error('Failed to fetch client for action form:', e);
        selectedClientObjectForForm.value = null;
      }
    }
  } else {
    selectedClientObjectForForm.value = null;
  }

  // Set default assigned_to for new actions if not already set by actionData
  if (props.actionFormMode === 'create' && currentActionFormData.value.assigned_to === null) {
    if (props.userOptions && props.userOptions.length > 0 && props.userOptions[0]) {
      currentActionFormData.value.assigned_to = props.userOptions[0].id;
    }
  }
};


const save = () => {
  // --- Form Validation (Moved from SalesInteractions.vue) ---
  const { client_id, subject, assigned_to } = currentActionFormData.value;
  if (!client_id) {
    toast.add({ severity: "error", summary: "エラー", detail: "クライアントを選択してください", life: 3000 });
    return;
  }
  if (!subject) {
    toast.add({ severity: "error", summary: "エラー", detail: "件名を記入してください", life: 3000 });
    return;
  }
  if (!assigned_to) {
    toast.add({ severity: "error", summary: "エラー", detail: "担当者を選択してください", life: 3000 });
    return;
  }

  // Emit the data, parent will handle add/edit logic and API calls
  emit('save-action', currentActionFormData.value);
  // Parent component is responsible for closing the dialog by setting isOpen to false
};

const close = () => {
  emit('close-dialog');
  resetForm(); // Reset form when closing
};

// --- Watchers ---  
// Watch for isOpen changes to manage form state when dialog opens/closes
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    populateForm(props.actionData);
    // Only set to current time for create mode
    if (props.actionFormMode === 'create') {
      currentActionFormData.value.action_datetime = new Date();
    }
  } else {
    resetForm();
  }
}, { immediate: true });

// Watch for selectedClientObjectForForm changes to update currentActionFormData.client_id
watch(selectedClientObjectForForm, (newVal) => {
  if (newVal && typeof newVal === 'object' && newVal.id) {
    currentActionFormData.value.client_id = newVal.id;
  } else if (!newVal && currentActionFormData.value.client_id !== null) {
    currentActionFormData.value.client_id = null;
  }
});
</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.p-autocomplete-input {
  width: 100%;
}

.client-option-item:hover {
  background-color: #f9fafb;
}
</style>
