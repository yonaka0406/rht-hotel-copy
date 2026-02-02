<template>
  <div class="p-2 rounded-sm" :class="{ 'bg-cyan-400': isClientSelected, 'bg-lime-400': !isClientSelected }">
    <Card>
      <template #title>
        <div :class="{ 'text-cyan-700': isClientSelected, 'text-lime-700': !isClientSelected }">
          <div v-if="isClientSelected">顧客情報編集</div>
          <div v-else>新規顧客登録</div>
        </div>
      </template>
      <template #content>
        <form @submit.prevent="saveClient">
          <div class="grid grid-cols-3 gap-2 gap-y-6 pt-6">
            <!-- Name of the person making the reservation -->
            <div class="col-span-3 mb-6">
              <FloatLabel>
                <ClientAutoCompleteWithStore v-model="client" @option-select="onClientSelect"
                  @change="onClientChange" @clear="resetClient" :useFloatLabel="false" :forceSelection="false" fluid required />
                <label>個人氏名 || 法人名称</label>
              </FloatLabel>
            </div>
            <div class="col-span-1">
              <FloatLabel>
                <InputText id="name" v-model="clientDetails.name" required fluid />
                <label for="name">氏名・名称</label>
              </FloatLabel>
            </div>
            <div class="col-span-1">
              <FloatLabel>
                <label for="name_kana">カナ</label>
                <InputText id="name_kana" v-model="clientDetails.name_kana" fluid />
              </FloatLabel>
            </div>
            <div class="col-span-1">
              <FloatLabel>
                <label for="name_kanji">漢字</label>
                <InputText v-model="clientDetails.name_kanji" id="name_kanji" fluid />
              </FloatLabel>
            </div>
            <div class="col-span-1">
              <FloatLabel>
                <label for="date_of_birth">生年月日・設立日</label>
                <DatePicker v-model="clientDetails.date_of_birth" :showIcon="true" iconDisplay="input"
                  dateFormat="yy-mm-dd" :selectOtherMonths="true" placeholder="生年月日・設立日" fluid />
              </FloatLabel>
            </div>
            <!-- Type of person (Legal or Natural) -->
            <div class="col-span-1 flex justify-center">
              <SelectButton v-model="clientDetails.legal_or_natural_person" :options="personTypeOptions"
                option-label="label" option-value="value" fluid :disabled="isClientSelected" />
            </div>
            <!-- Gender input if person is natural -->
            <div class="col-span-1">
              <div v-if="clientDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                  <RadioButton v-model="clientDetails.gender" :inputId="option.value" :value="option.value"
                    :disabled="isClientSelected" />
                  <label :for="option.value">{{ option.label }}</label>
                </div>
              </div>
            </div>
            <!-- Email input -->
            <div class="col-span-1">
              <FloatLabel>
                <InputText v-model="clientDetails.email" :pattern="emailPattern" :class="{ 'p-invalid': !isValidEmail }"
                  @input="validateEmail(clientDetails.email)" fluid />
                <label>メールアドレス</label>
                <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
              </FloatLabel>
            </div>
            <!-- Phone number input -->
            <div class="col-span-1">
              <FloatLabel>
                <InputText v-model="clientDetails.phone" :pattern="phonePattern" :class="{ 'p-invalid': !isValidPhone }"
                  @input="validatePhone(clientDetails.phone)" fluid />
                <label>電話番号</label>
                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
              </FloatLabel>
            </div>
            <!-- Fax input -->
            <div class="col-span-1">
              <FloatLabel>
                <InputText v-model="clientDetails.fax" :pattern="phonePattern" :class="{ 'p-invalid': !isValidFax }"
                  @input="validateFax(clientDetails.fax)" fluid />
                <label>FAX</label>
                <small v-if="!isValidFax" class="p-error">有効なFAX番号を入力してください。</small>
              </FloatLabel>
            </div>
            <!-- Customer ID input -->
            <div class="col-span-1">
              <FloatLabel>
                <InputText id="customer_id" v-model="clientDetails.customer_id" fluid />
                <label for="customer_id">顧客コード</label>
                <small class="text-gray-500">次の利用可能番号: {{ nextAvailableCustomerId }}</small>
              </FloatLabel>
            </div>
            <div class="col-span-3">
              <Divider />
              <ClientAddresses v-if="isClientSelected" :addresses="null" />
            </div>
            <div class="col-span-3">
              <Divider />
            </div>
            <div class="col-span-3">
              <!-- Save button -->
              <div v-if="isClientSelected" class="col-span-3 flex justify-center items-center">
                <Button label="保存" severity="info" type="submit" />
              </div>
              <div v-else class="col-span-3 flex justify-center items-center">
                <Button label="新規" severity="success" type="submit" />
              </div>
            </div>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup>
// Vue
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  client_id: {
    type: String,
    default: null,
  },
});

// Components
import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
import ClientAddresses from '@/pages/CRM/components/ClientAddresses.vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Card, Divider, FloatLabel, InputText, DatePicker, SelectButton, RadioButton, Button } from 'primevue';

// Stores
import { useClientStore } from '@/composables/useClientStore';
const { clients, nextAvailableCustomerId, fetchClient, fetchCustomerID, setClientsIsLoading, fetchClientNameConversion, createClient, updateClientInfo } = useClientStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { setReservationClient } = useReservationStore();

// Form
const client = ref({});
const clientDetails = ref({
  id: null,
  name: '',
  name_kana: '',
  name_kanji: '',
  full_name_key: '',
  legal_or_natural_person: 'legal',
  gender: 'other',
  date_of_birth: null,
  email: '',
  phone: '',
  fax: '',
  display_name: '',
});
const personTypeOptions = [
  { label: '法人', value: 'legal' },
  { label: '個人', value: 'natural' },
];
const genderOptions = [
  { label: '男性', value: 'male' },
  { label: '女性', value: 'female' },
  { label: 'その他', value: 'other' },
];
import { validatePhone as validatePhoneUtil, validateEmail as validateEmailUtil, validateCustomerId as validateCustomerIdUtil } from '../../../../utils/validationUtils';

// HTML pattern attributes
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[\d\s()+\-]*$/;

const isValidEmail = ref(true);
const isValidPhone = ref(true);
const isValidFax = ref(true);
const isClientSelected = ref(false);
const selectedClient = ref(null);

// Helper
const normalizeKana = (str) => {
  if (!str) return '';
  let normalizedStr = str.normalize('NFKC');

  // Convert Hiragana to Katakana
  normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)  // Convert Hiragana to Katakana
  );
  // Convert half-width Katakana to full-width Katakana
  normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xFEC0)  // Convert half-width to full-width Katakana
  );

  return normalizedStr;
};
const normalizePhone = (phone) => {
  if (!phone) return '';

  // Remove all non-numeric characters
  let normalized = phone.replace(/\D/g, '');

  // Remove leading zeros
  normalized = normalized.replace(/^0+/, '');

  return normalized;
};
const validateEmail = (email) => {
  isValidEmail.value = validateEmailUtil(email);
};
const validatePhone = (phone) => {
  isValidPhone.value = validatePhoneUtil(phone);
};
const validateFax = (fax) => {
  isValidFax.value = validatePhoneUtil(fax);
};
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const onClientSelect = async (event) => {
  if (event.value) {
    // console.log('onClientSelect event:',event.value);
    const selectedClient = event.value;
    await fetchClient(event.value.id);

    // isClientSelected is true after fetchClient
    isClientSelected.value = true;

    clientDetails.value = {
      ...selectedClient,
      display_name: selectedClient.name_kanji || selectedClient.name_kana || selectedClient.name,
    };

    client.value = { display_name: selectedClient.name_kanji || selectedClient.name_kana || selectedClient.name };

  } else {
    resetClient();
  }

  // console.log('onClientSelect client:',client.value);
};

const saveClient = async () => {
  // Validate Customer ID
  if (clientDetails.value.customer_id) {
    if (!validateCustomerIdUtil(clientDetails.value.customer_id)) {
      toast.add({ severity: 'error', summary: 'Error', detail: '顧客コードは半角数字で入力してください。', life: 3000 });
      return;
    }
    const checkCustomerIdObj = await fetchCustomerID(clientDetails.value.id, clientDetails.value.customer_id);
    if (checkCustomerIdObj && Array.isArray(checkCustomerIdObj.client) && checkCustomerIdObj.client.length > 0) {
      toast.add({ severity: 'error', summary: 'Error', detail: '顧客コードはすでに利用中です。', life: 3000 });
      return;
    }
  }

  // Validate Email, Phone, and Fax flags
  if (!isValidEmail.value || !isValidPhone.value || !isValidFax.value) {
    toast.add({ severity: 'error', summary: 'Error', detail: '入力内容に誤りがあります。確認してください。', life: 3000 });
    return;
  }

  // Format Date of Birth
  if (clientDetails.value.date_of_birth) {
    const dob = clientDetails.value.date_of_birth;
    const dateObj = (dob instanceof Date) ? dob : new Date(dob);
    if (!isNaN(dateObj.getTime())) {
      clientDetails.value.date_of_birth = formatDate(dateObj);
    }
  }

  if (isClientSelected.value) {
    await updateClientInfo(clientDetails.value.id, clientDetails.value);
    await setReservationClient(clientDetails.value.id);
    toast.add({ severity: 'success', summary: '成功', detail: '予約者が編集されました。', life: 3000 });
  } else {
    const newClient = await createClient(clientDetails.value);
    await setReservationClient(newClient.id);
    Object.assign(clientDetails.value, newClient);
    isClientSelected.value = true;
    toast.add({ severity: 'success', summary: '成功', detail: '新規予約者が登録されました。', life: 3000 });
  }
};
const onClientChange = async (event) => {
  if (!event.value.id) {
    // console.log('onClientChange event:',event.value);
    isClientSelected.value = false;

    if (event.value) {
      const clientName = await fetchClientNameConversion(event.value);

      clientDetails.value = {
        id: null,
        name: clientName.name,
        name_kana: clientName.nameKana,
        name_kanji: clientName.nameKanji,
        full_name_key: '',
        legal_or_natural_person: 'legal',
        gender: 'other',
        date_of_birth: null,
        email: '',
        phone: '',
        fax: '',
        display_name: '',
      };
    }
  }
};
const resetClient = () => {
  isClientSelected.value = false;
  clientDetails.value = {
    id: null,
    name: '',
    name_kana: '',
    name_kanji: '',
    full_name_key: '',
    legal_or_natural_person: 'legal',
    gender: 'other',
    date_of_birth: null,
    email: '',
    phone: '',
    fax: '',
    display_name: '',
  };
};

onMounted(async () => {

  if (props.client_id) {
    await fetchClient(props.client_id);
    selectedClient.value = clients.value.find((client) => client.id === props.client_id);
    if (selectedClient.value) { // Assuming selectedClient is the name in the store
      clientDetails.value = {
        ...selectedClient.value,
        display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name,
      };

      client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name };

      isClientSelected.value = true;
    }
  }
  // console.log('onMounted ReservationClientEdit:', clientDetails.value);
  // console.log('onMounted ReservationClientEdit client for Autocomplete:', client.value);


});

// Watcher    
watch(() => clientDetails.value.legal_or_natural_person,
  (newValue) => {
    // console.log('watch clientDetails.value.legal_or_natural_person')
    if (newValue === 'legal') {
      // console.log('Changed to other');
      clientDetails.value.gender = 'other';
    }
    if (newValue === 'natural' && clientDetails.value.id == null) {
      clientDetails.value.gender = 'male';
    }
  },
);

</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}

.bg-edit {
  background-color: lightcyan;
  /* Change to your desired color for editing */
}

.bg-new {
  background-color: honeydew;
  /* Change to your desired color for new client */
}
</style>