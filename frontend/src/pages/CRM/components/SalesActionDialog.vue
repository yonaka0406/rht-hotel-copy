<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    :modal="true"
    :style="{width: '60vw'}"
    class="p-fluid"
    @hide="close"
  >
    <form @submit.prevent="save" class="flex flex-col gap-y-3">
      <div class="field">
        <label for="client">クライアント</label>
        <AutoComplete
          id="client"
          v-model="selectedClientObjectForForm"
          :suggestions="filteredClientsForForm"
          optionLabel="display_name"
          @complete="searchClientsInForm"
          placeholder="クライアントを選択・検索"
          :disabled="actionFormMode === 'edit' && !!currentActionFormData.client_id"
          :loading="clientsIsLoading"
          forceSelection
          dropdown
          style="width: 100%;"
          panelClass="max-h-60 overflow-y-auto"
        >
          <template #option="slotProps">
            <div class="client-option-item p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
              <p class="font-medium">
                <i v-if="slotProps.option.is_legal_person" class="pi pi-building mr-2 text-gray-500"></i>
                <i v-else class="pi pi-user mr-2 text-gray-500"></i>
                {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                <span v-if="slotProps.option.name_kana" class="text-sm text-gray-500"> ({{ slotProps.option.name_kana }})</span>
              </p>
              <div class="flex items-center gap-x-3 mt-1 text-xs">
                <span v-if="slotProps.option.phone" class="text-sky-700"><i class="pi pi-phone mr-1"></i>{{ slotProps.option.phone }}</span>
                <span v-if="slotProps.option.email" class="text-sky-700"><i class="pi pi-at mr-1"></i>{{ slotProps.option.email }}</span>
                <span v-if="slotProps.option.fax" class="text-sky-700"><i class="pi pi-send mr-1"></i>{{ slotProps.option.fax }}</span>
              </div>
            </div>
          </template>
          <template #empty>
            <div class="p-3 text-center text-gray-500">該当するクライアントが見つかりません。</div>
          </template>
        </AutoComplete>
      </div>

      <div class="field">
        <label for="actionDateTime">アクション日時</label>
        <DatePicker
          id="actionDateTime"
          v-model="currentActionFormData.action_datetime"
          :showTime="true"
          :showSeconds="false"
          hourFormat="24"
          dateFormat="yy/mm/dd"
          class="w-full"
        />
      </div>

      <div class="field">
        <label for="subject">件名</label>
        <InputText id="subject" v-model.trim="currentActionFormData.subject" fluid />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div class="field">
          <label for="actionType">アクション種別</label>
          <Select id="actionType" v-model="currentActionFormData.action_type" :options="actionTypeOptions" optionLabel="label" optionValue="value" placeholder="選択してください" class="w-full"/>
        </div>

        <div class="field">
          <label for="status">ステータス</label>
          <Select id="status" v-model="currentActionFormData.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="選択してください" class="w-full"/>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div class="field">
          <label for="assignedTo">担当者</label>
          <Select id="assignedTo" v-model="currentActionFormData.assigned_to" :options="userOptions" optionLabel="name" optionValue="id" placeholder="選択してください" class="w-full" :filter="true" :showClear="true"/>
        </div>

        <div class="field">
          <label for="dueDate">対応期日</label>
          <DatePicker
            id="dueDate"
            v-model="currentActionFormData.due_date"
            dateFormat="yy/mm/dd"
            :showTime="false"
            class="w-full"
          />
        </div>
      </div>

      <div class="field">
        <label for="details">詳細</label>
        <Textarea id="details" v-model="currentActionFormData.details" rows="3" fluid />
      </div>

      <div class="field">
        <label for="outcome">結果</label>
        <Textarea id="outcome" v-model="currentActionFormData.outcome" rows="2" fluid />
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <Button label="キャンセル" icon="pi pi-times" class="p-button-text p-button-danger" @click="close" />
        <Button type="submit" :label="actionFormMode === 'create' ? '作成' : '保存'" icon="pi pi-check" class="p-button-text" />
      </div>
    </form>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import AutoComplete from 'primevue/autocomplete';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast'; // Import useToast for toasts

const toast = useToast();

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
const selectedClientObjectForForm = ref(null); // For AutoComplete v-model
const filteredClientsForForm = ref([]); // For AutoComplete suggestions

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

// --- Normalization Helper Functions (Moved from SalesInteractions.vue) ---
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

// --- Client Search for AutoComplete ---
const searchClientsInForm = (event) => {
  const query = event.query.toLowerCase();
  const normalizedQuery = normalizePhone(query);
  const isNumericQuery = /^\d+$/.test(normalizedQuery);

  if (!props.allClients || !Array.isArray(props.allClients)) {
    filteredClientsForForm.value = [];
    return;
  }

  let results = props.allClients.filter((client) => {
    const clientName = client.name || '';
    const clientNameKana = client.name_kana || '';
    const clientNameKanji = client.name_kanji || '';
    const clientEmail = client.email || '';
    const clientPhone = client.phone || '';
    const clientFax = client.fax || '';

    const matchesName =
      clientName.toLowerCase().includes(query) ||
      (clientNameKana && normalizeKana(clientNameKana).toLowerCase().includes(normalizeKana(query))) ||
      clientNameKanji.toLowerCase().includes(query);

    const matchesPhoneFax = isNumericQuery &&
      ((clientFax && normalizePhone(clientFax).includes(normalizedQuery)) ||
        (clientPhone && normalizePhone(clientPhone).includes(normalizedQuery)));

    const matchesEmail = clientEmail.toLowerCase().includes(query);

    return matchesName || matchesPhoneFax || matchesEmail;
  });

  // Add display_name to results for AutoComplete input field rendering via optionLabel
  filteredClientsForForm.value = results.map(client => ({
    ...client,
    display_name: client.name_kanji || client.name || `ID: ${client.id}` // Fallback display name
  }));
};

// --- Form Management Methods ---
const resetForm = () => {
  currentActionFormData.value = { ...initialFormData };
  selectedClientObjectForForm.value = null;
};

const populateForm = (data) => {
  currentActionFormData.value = {
    ...initialFormData, // Start with defaults to ensure all fields are present
    ...data, // Override with provided data
    action_datetime: data.action_datetime ? new Date(data.action_datetime) : null,
    due_date: data.due_date ? new Date(data.due_date) : null,
  };

  if (data.client_id) {
    const clientObj = props.allClients.find(c => c.id === data.client_id);
    if (clientObj) {
      selectedClientObjectForForm.value = {
        ...clientObj,
        display_name: clientObj.name_kanji || clientObj.name || `ID: ${clientObj.id}`
      };
    } else {
      selectedClientObjectForForm.value = null;
      toast.add({ severity: "warn", summary: "注意", detail: "関連クライアントが見つかりませんでした。リストを更新してください。", life: 4000 });
    }
  } else {
    selectedClientObjectForForm.value = null;
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
    // When dialog opens
    if (props.actionFormMode === 'edit' && props.actionData) {
      populateForm(props.actionData);
    } else {
      resetForm();
      // Set default assigned_to for new actions
      if (props.userOptions && props.userOptions.length > 0 && props.userOptions[0]) {
        currentActionFormData.value.assigned_to = props.userOptions[0].id; // Assuming first user is current or default
      }
      currentActionFormData.value.action_datetime = new Date(); // Default to now for new actions
    }
  }
}, { immediate: true }); // Run immediately to populate if dialog is initially open

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
/* PrimeVue's p-fluid class and grid system (p-formgrid p-grid) handle most layout. */
/* Add custom styles here if needed for specific adjustments */
.field {
  margin-bottom: 1rem; /* Add some spacing between form fields */
}
.field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

/* Ensure AutoComplete input takes full width */
.p-autocomplete-input {
  width: 100%;
}

.client-option-item:hover {
  background-color: #f9fafb; /* Tailwind gray-50 */
}
</style>
