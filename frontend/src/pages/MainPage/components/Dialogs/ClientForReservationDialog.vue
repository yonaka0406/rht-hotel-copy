<template>
    <Dialog :visible="modelValue" @update:visible="$emit('update:modelValue', $event)" :header="'予約'" :closable="true"
        :modal="true" :style="{ width: '50vw' }" @hide="$emit('update:modelValue', false)">
        <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person making the reservation -->
            <div class="col-span-2 mb-6">
                <FloatLabel>
                    <ClientAutoCompleteWithStore v-model="localClient" @option-select="onClientSelect"
                        :placeholder="null" :hideLabel="true" :loading="clientsIsLoading" :disabled="clientsIsLoading"
                        :forceSelection="false" fluid required />
                    <label>個人氏名 || 法人名称</label>
                </FloatLabel>
            </div>

            <div v-if="impedimentStatus" class="col-span-2">
                <div :class="impedimentStatus.class" class="p-4 rounded-md">
                    <p class="font-bold">{{ impedimentStatus.summary }}</p>
                    <p>{{ impedimentStatus.detail }}</p>
                </div>
            </div>

            <!-- Type of person (Legal or Natural) -->
            <div class="col-span-1">
                <SelectButton v-model="localReservationDetails.legal_or_natural_person" :options="personTypeOptions"
                    option-label="label" option-value="value" fluid :disabled="isClientSelected" />
            </div>

            <!-- Gender input if person is natural -->
            <div class="col-span-1">
                <div v-if="localReservationDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                    <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                        <RadioButton v-model="localReservationDetails.gender" :inputId="option.value"
                            :value="option.value" :disabled="isClientSelected" />
                        <label :for="option.value">{{ option.label }}</label>
                    </div>
                </div>
            </div>

            <!-- Email input -->
            <div class="col-span-1">
                <FloatLabel>
                    <InputText v-model="localReservationDetails.email" :pattern="emailPattern"
                        :class="{ 'p-invalid': !isValidEmail }" fluid :disabled="isClientSelected" />
                    <label>メールアドレス</label>
                    <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                </FloatLabel>
            </div>

            <!-- Phone number input -->
            <div class="col-span-1">
                <FloatLabel>
                    <InputText v-model="localReservationDetails.phone" :pattern="phonePattern"
                        :class="{ 'p-invalid': !isValidPhone }" fluid :disabled="isClientSelected" />
                    <label>電話番号</label>
                    <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                </FloatLabel>
            </div>

            <!-- Additional fields for check-in, check-out, number of people -->
            <div class="col-span-1">
                <FloatLabel>
                    <InputText v-model="localReservationDetails.check_in" type="date" variant="filled" fluid disabled />
                    <label>チェックイン</label>
                </FloatLabel>
            </div>

            <div class="col-span-1">
                <FloatLabel>
                    <InputText v-model="localReservationDetails.check_out" type="date" variant="filled" fluid
                        disabled />
                    <label>チェックアウト</label>
                </FloatLabel>
            </div>

            <div class="col-span-1">
                <FloatLabel>
                    <InputNumber v-model="localReservationDetails.number_of_nights" variant="filled" fluid disabled />
                    <label>宿泊数</label>
                </FloatLabel>
            </div>

            <div class="col-span-1">
                <FloatLabel>
                    <InputNumber v-model="localReservationDetails.number_of_people" variant="filled" fluid disabled />
                    <label>人数</label>
                </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="$emit('close')"
                class="p-button-danger p-button-text p-button-sm" />
            <Button label="保存" icon="pi pi-check" @click="handleSave" class="p-button-success p-button-text p-button-sm"
                :disabled="impedimentStatus && impedimentStatus.level === 'block'" />
        </template>
    </Dialog>
</template>

<script setup>
// Vue
import { ref, watch, onMounted } from 'vue';

// Store
import { useClientStore } from '@/composables/useClientStore';
const { clientsIsLoading } = useClientStore();
import { useCRMStore } from '@/composables/useCRMStore';
const { clientImpediments, fetchImpedimentsByClientId } = useCRMStore();

// Toast
import { useToast } from 'primevue/usetoast';
const toast = useToast();

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    reservationDetails: {
        type: Object,
        required: true,
        default: () => ({
            legal_or_natural_person: 'natural',
            gender: 'male',
            email: '',
            phone: '',
            check_in: '',
            check_out: '',
            number_of_nights: 1,
            number_of_people: 1
        })
    },
    client: {
        type: Object,
        default: () => ({})
    },
    isClientSelected: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits([
    'update:modelValue',
    'save',
    'close'
]);

// Primevue
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import SelectButton from 'primevue/selectbutton';
import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
import RadioButton from 'primevue/radiobutton';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

// Local state
const localReservationDetails = ref(JSON.parse(JSON.stringify(props.reservationDetails)));
const localClient = ref(JSON.parse(JSON.stringify(props.client)));
const selectedClient = ref(null);
const isClientSelected = ref(props.isClientSelected || Boolean(props.client && props.client.id));
const isValidEmail = ref(true);
const isValidPhone = ref(true);
const impedimentStatus = ref(null);

// Watch localClient input to handle manual name entry
watch(localClient, (newVal) => {
    if (typeof newVal === 'string') {
        // Manually typed name
        localReservationDetails.value.name = newVal;
        localReservationDetails.value.client_id = null;
        isClientSelected.value = false;
        selectedClient.value = null;
        impedimentStatus.value = null;
    } else if (newVal === null || newVal === undefined || Object.keys(newVal).length === 0) {
        // Cleared input
        localReservationDetails.value.name = '';
        localReservationDetails.value.client_id = null;
        isClientSelected.value = false;
        selectedClient.value = null;
        impedimentStatus.value = null;
    }
    // When newVal is an object with id, it's handled by onClientSelect
});

import { validatePhone as validatePhoneUtil, validateEmail as validateEmailUtil, hasContactInfo } from '../../../../utils/validationUtils';

// HTML pattern attributes (simplified for HTML validity)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[\d\s()+\-]*$/;

const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];
const genderOptions = [
    { label: '男性', value: 'male' },
    { label: '女性', value: 'female' },
    { label: 'その他', value: 'other' },
];

// Handle client selection from dropdown
const onClientSelect = async (event) => {
    const client = event.value;
    if (client) {
        selectedClient.value = client;
        isClientSelected.value = true;

        await fetchImpedimentsByClientId(client.id);

        const blockImpediment = clientImpediments.value.find(imp => imp.is_active && imp.restriction_level === 'block');
        if (blockImpediment) {
            impedimentStatus.value = {
                level: 'block',
                summary: '予約不可',
                detail: 'このクライアントは予約がブロックされています。',
                class: 'bg-red-100 border-red-400 text-red-700'
            };
        } else {
            const warningImpediment = clientImpediments.value.find(imp => imp.is_active && imp.restriction_level === 'warning');
            if (warningImpediment) {
                impedimentStatus.value = {
                    level: 'warning',
                    summary: '警告',
                    detail: 'このクライアントには警告があります。予約を作成する前に確認してください。',
                    class: 'bg-yellow-100 border-yellow-400 text-yellow-700'
                };
            } else {
                impedimentStatus.value = null;
            }
        }

        // Update reservation details with client info
        localReservationDetails.value.client_id = client.id;
        localReservationDetails.value.legal_or_natural_person = client.legal_or_natural_person || 'legal';
        localReservationDetails.value.gender = client.gender || 'male';
        localReservationDetails.value.email = client.email || '';
        localReservationDetails.value.phone = client.phone || '';

        // Set the name from kanji, kana, or name (in order of preference)
        const clientName = client.name_kanji || client.name_kana || client.name || '';
        localReservationDetails.value.name = clientName;

        // Update the local client reference with display name
        localClient.value = {
            ...client,
            display_name: clientName
        };
    }
};

// Validation functions
const validateEmail = (email) => {
    isValidEmail.value = validateEmailUtil(email);
};

const validatePhone = (phone) => {
    isValidPhone.value = validatePhoneUtil(phone);
};

// Handle form submission
const handleSave = () => {
    if (impedimentStatus.value && impedimentStatus.value.level === 'block') {
        toast.add({
            severity: 'error',
            summary: '予約不可',
            detail: 'このクライアントは予約がブロックされているため、予約を作成できません。',
            life: 5000,
        });
        return;
    }

    // Skip validation if a client is selected (has an ID)
    if (!isClientSelected.value && (!localClient.value || !localClient.value.id)) {
        validateEmail(localReservationDetails.value.email);
        validatePhone(localReservationDetails.value.phone);

        if (!hasContactInfo(localReservationDetails.value.email, localReservationDetails.value.phone)) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。',
                life: 3000,
            });
            return;
        }

        if (localReservationDetails.value.email && !isValidEmail.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効なメールアドレスを入力してください。',
                life: 3000,
            });
            return;
        }

        if (localReservationDetails.value.phone && !isValidPhone.value) {
            toast.add({
                severity: 'warn',
                summary: '注意',
                detail: '有効な電話番号を入力してください。',
                life: 3000,
            });
            return;
        }
    }

    // Proceed with save if validation passes or client is selected
    emit('save', localReservationDetails.value);
};

// Fetch clients on mount
onMounted(async () => {
    if (props.client === null) {
        console.log('[ClientForReservationDialog] onMounted client is null');
        localReservationDetails.value.legal_or_natural_person = 'legal';
        localReservationDetails.value.gender = 'other';
    }
    // REMOVED: pre-loading of all clients to improve performance
});

// Initialize local client from props
watch(() => props.client, (newVal) => {
    if (newVal) {
        localClient.value = { ...newVal };
    }
}, { immediate: true });

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        // Reset form when dialog is opened
        localReservationDetails.value = JSON.parse(JSON.stringify(props.reservationDetails));
        localClient.value = JSON.parse(JSON.stringify(props.client));
        isClientSelected.value = props.isClientSelected;
    }
});

watch(() => localReservationDetails.value.email, (newEmail) => {
    validateEmail(newEmail);
});

watch(() => localReservationDetails.value.phone, (newPhone) => {
    validatePhone(newPhone);
});
watch(() => localReservationDetails.value.legal_or_natural_person, (newValue) => {
    if (newValue === 'legal') {
        localReservationDetails.value.gender = 'other';
    }
    if (newValue === 'natural' && localReservationDetails.value.client_id == null) {
        localReservationDetails.value.gender = 'male';
    }

    console.log('localReservationDetails legal_or_natural_person:', newValue, localReservationDetails.value.gender);
},
);
</script>
