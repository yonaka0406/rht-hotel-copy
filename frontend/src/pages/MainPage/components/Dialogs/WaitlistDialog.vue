<template>
  <Dialog
    :visible="visible"
    @update:visible="handleClose"
    :header="`順番待ちリスト登録 - ${initialHotelName}`"
    :closable="true"
    :modal="true"
    :style="{ width: '50vw' }"
  >
    <!-- Step Navigation -->
    <div class="flex justify-center mb-4">
      <div class="flex items-center space-x-4">
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
               :class="currentStep === '1' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'">
            1
          </div>
          <span class="ml-2 text-sm font-medium" :class="currentStep === '1' ? 'text-blue-500' : 'text-gray-600'">
            顧客情報
          </span>
        </div>
        <div class="w-8 h-1 bg-gray-200"></div>
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
               :class="currentStep === '2' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'">
            2
          </div>
          <span class="ml-2 text-sm font-medium" :class="currentStep === '2' ? 'text-blue-500' : 'text-gray-600'">
            予約情報
          </span>
        </div>
      </div>
    </div>

    <!-- Step 1: Client Information -->
    <div v-if="currentStep === '1'" class="grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
      <!-- Client Selection/Creation for Waitlist -->
      <div class="col-span-2 mb-2">
        <FloatLabel>
          <AutoComplete
            v-model="internalForm.client_name_waitlist"
            :suggestions="filteredClients"
            optionLabel="display_name"
            @complete="localFilterClients"
            @option-select="onClientSelectForWaitlist"
            fluid
          >
            <template #option="slotProps">
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
                </div>
              </div>
            </template>
          </AutoComplete>
          <label>顧客名（検索または新規入力）</label>
        </FloatLabel>
      </div>

      <div class="col-span-1" v-if="!isClientSelectedForWaitlist">
        <SelectButton
          v-model="internalForm.client_legal_or_natural_person_waitlist"
          :options="personTypeOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>
      <div class="col-span-1" v-if="!isClientSelectedForWaitlist && internalForm.client_legal_or_natural_person_waitlist === 'natural'">
        <div class="flex gap-3">
          <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
            <RadioButton
              v-model="internalForm.client_gender_waitlist"
              :inputId="`dialog_waitlist_gender_${option.value}`"
              :name="`dialog_waitlist_gender`"
              :value="option.value"
            />
            <label :for="`dialog_waitlist_gender_${option.value}`">{{ option.label }}</label>
          </div>
        </div>
      </div>

      <div class="col-span-2"></div>

      <div class="col-span-1">
        <FloatLabel>
          <InputText
            v-model="internalForm.contact_email"
            type="email"
            fluid
            :required="internalForm.communication_preference === 'email'"
            :disabled="isClientSelectedForWaitlist && selectedClientForWaitlist && selectedClientForWaitlist.email"
          />
          <label>連絡用メールアドレス{{ internalForm.communication_preference === 'email' ? ' *' : '' }}</label>
        </FloatLabel>
      </div>

      <div class="col-span-1">
        <FloatLabel>
          <InputText
            v-model="internalForm.contact_phone"
            type="tel"
            fluid
            :required="internalForm.communication_preference === 'phone'"
            :disabled="isClientSelectedForWaitlist && selectedClientForWaitlist && !!selectedClientForWaitlist.phone"
          />
          <label>連絡用電話番号{{ internalForm.communication_preference === 'phone' ? ' *' : '' }}</label>
        </FloatLabel>
      </div>

      <div class="col-span-2">
        <label class="font-semibold mb-2 block">希望連絡方法 *</label>
        <div class="flex gap-4">
          <div class="flex items-center">
            <RadioButton v-model="internalForm.communication_preference" inputId="dialog_comm_email_waitlist" name="dialog_comm_pref" value="email" />
            <label for="dialog_comm_email_waitlist" class="ml-2">メール</label>
          </div>
          <div class="flex items-center">
            <RadioButton v-model="internalForm.communication_preference" inputId="dialog_comm_phone_waitlist" name="dialog_comm_pref" value="phone" />
            <label for="dialog_comm_phone_waitlist" class="ml-2">電話</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Reservation Information -->
    <div v-if="currentStep === '2'" class="grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
      <!-- Smoking Preference Selection -->
      <div class="col-span-2">
        <label class="font-semibold mb-2 block">喫煙設定の希望 *</label>
        <div class="flex gap-4">
          <div v-for="option in smokingOptionsDialog" :key="option.value" class="flex items-center">
            <RadioButton
              v-model="selectedSmokingPreferenceDialog"
              :inputId="`dialog_smoking_${option.value}`"
              name="dialogSmokingPreference"
              :value="option.value"
              @change="updateFormSmokingPreference"
            />
            <label :for="`dialog_smoking_${option.value}`" class="ml-1">{{ option.label }}</label>
          </div>
        </div>
      </div>

      <div class="col-span-2">
        <FloatLabel>
          <Textarea v-model="internalForm.notes" rows="3" fluid />
          <label>備考（部屋タイプ詳細など）</label>
        </FloatLabel>
      </div>

      <div class="col-span-1">
         <FloatLabel>
            <Select
                v-model="internalForm.room_type_id"
                :options="allRoomTypes"
                optionLabel="room_type_name"
                optionValue="room_type_id"                
                fluid
                :showClear="true"
            />
            <label>希望部屋タイプ（任意）</label>
        </FloatLabel>
      </div>
      <div class="col-span-1">
        <FloatLabel>
          <InputNumber 
            v-model="internalForm.number_of_rooms" 
            :min="1" 
            :max="10"
            fluid 
          />
          <label>部屋数</label>
        </FloatLabel>
      </div>
      <div class="col-span-1">
        <FloatLabel>
          <InputNumber 
            v-model="internalForm.number_of_guests" 
            :min="1" 
            :max="50"
            fluid 
          />
          <label>合計人数</label>
        </FloatLabel>
      </div>
      <div class="col-span-1">
        <FloatLabel>
          <InputText 
            v-model="internalForm.requested_check_in_date" 
            type="date"
            fluid 
          />
          <label>希望チェックイン</label>
        </FloatLabel>
      </div>
      <div class="col-span-1">
        <FloatLabel>
          <InputText 
            v-model="internalForm.requested_check_out_date" 
            type="date"
            fluid 
          />
          <label>希望チェックアウト</label>
        </FloatLabel>
      </div>
    </div>

    <!-- Navigation Buttons -->
    <div class="flex justify-between mt-6">
      <Button 
        v-if="currentStep === '2'" 
        label="前へ" 
        severity="secondary" 
        icon="pi pi-arrow-left" 
        @click="goToStep(1)" 
      />
      <div v-else></div>
      
      <Button 
        v-if="currentStep === '1'" 
        label="次へ" 
        icon="pi pi-arrow-right" 
        iconPos="right" 
        @click="goToStep(2)" 
      />
    </div>

    <template #footer>
      <Button label="閉じる" icon="pi pi-times" @click="handleClose" class="p-button-text p-button-danger p-button-sm" />
      <Button 
        v-if="currentStep === '2' && isFormValid" 
        label="登録" 
        icon="pi pi-check" 
        @click="handleSubmit" 
        :loading="isLoading" 
        class="p-button-text p-button-success p-button-sm" 
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { Dialog, FloatLabel, AutoComplete, SelectButton, RadioButton, InputText, Textarea, InputNumber, Button, Select } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { useWaitlistStore } from '@/composables/useWaitlistStore';
import { useClientStore } from '@/composables/useClientStore';

const props = defineProps({
  visible: Boolean,
  initialHotelId: Number,
  initialHotelName: String,
  initialRoomTypeId: Number,
  initialCheckInDate: String,
  initialCheckOutDate: String,
  initialNumberOfGuests: Number,
  initialSmokingPreference: String,
  initialNotes: String,
  allClients: {
    type: Array,
    default: () => []
  },
  allRoomTypes: {
      type: Array,
      default: () => []
  }
  // initialSmokingPreference and smokingPreferenceOptions props are removed
  // as the selection will now be managed internally within this dialog.
});

const emit = defineEmits(['update:visible', 'submitted']);

// Internal state for smoking preference
const selectedSmokingPreferenceDialog = ref('any');
const smokingOptionsDialog = ref([
    { label: '指定なし', value: 'any' },
    { label: '喫煙', value: 'smoking' },
    { label: '禁煙', value: 'non_smoking' },
]);

// Stores
const toast = useToast();
const waitlistStore = useWaitlistStore();
const clientStore = useClientStore(); // For createBasicClient and potentially fetching full client list if not passed

// Internal State
const internalForm = ref({});
const selectedClientForWaitlist = ref(null);
const isClientSelectedForWaitlist = ref(false);
const filteredClients = ref([]);
const isLoading = ref(false);
const currentStep = ref('1');

const personTypeOptions = ref([
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
]);
const genderOptions = ref([
    { label: '男性', value: 'male' },
    { label: '女性', value: 'female' },
    { label: 'その他', value: 'other' },
]);

// const smokingOptionsToDisplay = computed(() => props.smokingPreferenceOptions); // No longer needed as prop

// Initialize form when dialog becomes visible or props change
watch(() => props.visible, (newVal) => {
  if (newVal) {
    currentStep.value = '1';
    selectedSmokingPreferenceDialog.value = props.initialSmokingPreference || 'any'; // Initialize from prop or default
    internalForm.value = {
      client_id: null,
      hotel_id: props.initialHotelId,
      room_type_id: props.initialRoomTypeId,
      requested_check_in_date: props.initialCheckInDate,
      requested_check_out_date: props.initialCheckOutDate,
      number_of_guests: props.initialNumberOfGuests,
      number_of_rooms: 1,
      contact_email: '',
      contact_phone: '',
      communication_preference: 'email',
      notes: props.initialNotes || '',
      preferred_smoking_status: selectedSmokingPreferenceDialog.value, // Initialize from local ref
      client_name_waitlist: '',
      client_legal_or_natural_person_waitlist: 'legal',
      client_gender_waitlist: 'other',
      client_email_waitlist: '',
      client_phone_waitlist: ''
    };
    selectedClientForWaitlist.value = null;
    isClientSelectedForWaitlist.value = false;
    filteredClients.value = []; // Reset suggestions
  }
}, { immediate: true });


// Client Search Logic (adapted from ReservationsNewCombo)
const normalizePhone = (phone) => {
    if (!phone) return '';
    let normalized = phone.replace(/\D/g, '');
    normalized = normalized.replace(/^0+/, '');
    return normalized;
};
const normalizeKana = (str) => {
    if (!str) return '';
    let normalizedStr = str.normalize('NFKC');
    normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) + 0x60)
    );
    normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xFEC0)
    );
    return normalizedStr;
};

const localFilterClients = (event) => {
    const query = event.query.toLowerCase();
    const normalizedQuery = normalizePhone(query);
    const isNumericQuery = /^\d+$/.test(normalizedQuery);

    if (!query || !props.allClients || !Array.isArray(props.allClients)) {
        filteredClients.value = [];
        return;
    }

    filteredClients.value = props.allClients.filter((client) => {
        const matchesName =
            (client.name && client.name.toLowerCase().includes(query)) ||
            (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
            (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
        const matchesPhoneFax = isNumericQuery &&
            ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) ||
            (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
        const matchesEmail = client.email && client.email.toLowerCase().includes(query);
        return matchesName || matchesPhoneFax || matchesEmail;
    });
};

const onClientSelectForWaitlist = (event) => {
    selectedClientForWaitlist.value = event.value;
    isClientSelectedForWaitlist.value = true;
    internalForm.value.client_id = selectedClientForWaitlist.value.id;
    internalForm.value.contact_email = selectedClientForWaitlist.value.email || '';
    internalForm.value.contact_phone = selectedClientForWaitlist.value.phone || '';
    internalForm.value.client_name_waitlist = selectedClientForWaitlist.value.name_kanji || selectedClientForWaitlist.value.name_kana || selectedClientForWaitlist.value.name;
    // If client is selected, their details might override the new client type/gender
    internalForm.value.client_legal_or_natural_person_waitlist = selectedClientForWaitlist.value.legal_or_natural_person || 'legal';
    internalForm.value.client_gender_waitlist = selectedClientForWaitlist.value.gender || 'other';
};

const resetWaitlistClientSelection = () => {
    selectedClientForWaitlist.value = null;
    isClientSelectedForWaitlist.value = false;
    internalForm.value.client_id = null;
};

watch(() => internalForm.value.client_name_waitlist, (newName) => {
    if (isClientSelectedForWaitlist.value && newName !== (selectedClientForWaitlist.value?.name_kanji || selectedClientForWaitlist.value?.name_kana || selectedClientForWaitlist.value?.name)) {
        if (!newName || newName.trim() === '') {
            resetWaitlistClientSelection();
            internalForm.value.contact_email = '';
            internalForm.value.contact_phone = '';
        } else {
            resetWaitlistClientSelection();
        }
    }
});

const updateFormSmokingPreference = () => {
    internalForm.value.preferred_smoking_status = selectedSmokingPreferenceDialog.value;
};

watch(selectedSmokingPreferenceDialog, (newValue) => {
    internalForm.value.preferred_smoking_status = newValue;
});

const handleClose = () => {
  emit('update:visible', false);
};

const handleSubmit = async () => {
  isLoading.value = true;
  internalForm.value.preferred_smoking_status = selectedSmokingPreferenceDialog.value; // Ensure latest is used

  if (internalForm.value.communication_preference === 'email' && !internalForm.value.contact_email) {
    toast.add({ severity: 'error', summary: '検証エラー', detail: 'メール連絡をご希望の場合は、メールアドレスは必須です。', life: 3000 });
    isLoading.value = false;
    return;
  }
  if (internalForm.value.communication_preference === 'phone' && !internalForm.value.contact_phone) {
    toast.add({ severity: 'error', summary: '検証エラー', detail: '電話連絡をご希望の場合は、電話番号は必須です。', life: 3000 });
    isLoading.value = false;
    return;
  }

  let finalClientId = internalForm.value.client_id;
  if (!isClientSelectedForWaitlist.value && internalForm.value.client_name_waitlist) {
    try {
      const newClientData = await clientStore.createBasicClient(
        internalForm.value.client_name_waitlist, null,
        internalForm.value.client_legal_or_natural_person_waitlist,
        internalForm.value.client_gender_waitlist,
        internalForm.value.client_email_waitlist || internalForm.value.contact_email,
        internalForm.value.client_phone_waitlist || internalForm.value.contact_phone
      );
      finalClientId = newClientData.client.id;
      toast.add({ severity: 'info', summary: '顧客作成', detail: `新規顧客「${newClientData.client.name}」が作成されました。`, life: 3000 });
      // Optionally emit an event or have parent refresh client list
      // For now, assume parent handles client list updates if needed globally
    } catch (error) {
      toast.add({ severity: 'error', summary: '顧客作成エラー', detail: '新規顧客の作成に失敗しました： ' + error.message, life: 3000 });
      isLoading.value = false;
      return;
    }
  } else if (!finalClientId) {
    toast.add({ severity: 'error', summary: '検証エラー', detail: '顧客を選択するか、新規顧客名を入力してください。', life: 3000 });
    isLoading.value = false;
    return;
  }

  const entryData = {
    client_id: finalClientId,
    hotel_id: internalForm.value.hotel_id,
    room_type_id: internalForm.value.room_type_id,
    requested_check_in_date: internalForm.value.requested_check_in_date,
    requested_check_out_date: internalForm.value.requested_check_out_date,
    number_of_guests: internalForm.value.number_of_guests,
    number_of_rooms: internalForm.value.number_of_rooms,
    contact_email: internalForm.value.contact_email,
    contact_phone: internalForm.value.contact_phone,
    communication_preference: internalForm.value.communication_preference,
    notes: internalForm.value.notes,
    preferred_smoking_status: internalForm.value.preferred_smoking_status
  };

  const result = await waitlistStore.addEntry(entryData);
  isLoading.value = false;
  if (result) {
    emit('submitted');
    handleClose();
  }
  // Toast for success/failure is handled by waitlistStore.addEntry
};

const goToStep = (step) => {
  console.log('goToStep called with step:', step, 'current step before:', currentStep.value);
  currentStep.value = step.toString();
  console.log('current step after:', currentStep.value);
};

// Validation logic
const isFormValid = computed(() => {
  // Basic validation - check if required fields are filled
  const hasClientInfo = internalForm.value.client_name_waitlist && internalForm.value.client_name_waitlist.trim() !== '';
  const hasContactInfo = internalForm.value.contact_email || internalForm.value.contact_phone;
  const hasCommunicationPreference = internalForm.value.communication_preference;
  const hasSmokingPreference = selectedSmokingPreferenceDialog.value;
  
  // Additional validation based on communication preference
  const hasValidContact = 
    (internalForm.value.communication_preference === 'email' && internalForm.value.contact_email) ||
    (internalForm.value.communication_preference === 'phone' && internalForm.value.contact_phone);
  
  return hasClientInfo && hasContactInfo && hasCommunicationPreference && hasSmokingPreference && hasValidContact;
});

</script>

<style scoped>
/* Add any specific styles for this dialog if needed */
</style>
