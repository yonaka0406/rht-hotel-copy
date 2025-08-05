<template>
    <Dialog :visible="modelValue" @update:visible="$emit('update:modelValue', $event)" :header="'予約'" :closable="true"
        :modal="true" :style="{ width: '50vw' }" @hide="$emit('update:modelValue', false)">
        <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person making the reservation -->
            <div class="col-span-2 mb-6">
                <FloatLabel>
                    <AutoComplete 
                        v-model="localClient" 
                        :suggestions="filteredClients" 
                        optionLabel="display_name"
                        @complete="filterClients" 
                        field="id" 
                        @option-select="onClientSelect" 
                        :loading="clientsIsLoading"                                                                        
                        :disabled="clientsIsLoading"
                        fluid 
                        required
                    >
                        <template #loading v-if="clientsIsLoading">
                            <i class="pi pi-spin pi-spinner"></i>
                        </template>
                        <template #option="slotProps">
                            <div>
                                <p>
                                    <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                                    <i v-else class="pi pi-user"></i>
                                    {{ slotProps.option.name_kanji || slotProps.option.name_kana ||
                                        slotProps.option.name || '' }}
                                    <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana
                                        }})</span>
                                </p>
                                <div class="flex items-center gap-2">
                                    <p v-if="slotProps.option.phone" class="text-xs text-sky-800">
                                        <i class="pi pi-phone"></i> {{ slotProps.option.phone }}
                                    </p>
                                    <p v-if="slotProps.option.email" class="text-xs text-sky-800">
                                        <i class="pi pi-at"></i> {{ slotProps.option.email }}
                                    </p>
                                    <p v-if="slotProps.option.fax" class="text-xs text-sky-800">
                                        <i class="pi pi-send"></i> {{ slotProps.option.fax }}
                                    </p>
                                </div>
                            </div>
                        </template>
                    </AutoComplete>
                    <label>個人氏名　||　法人名称</label>
                </FloatLabel>
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
            <Button label="保存" icon="pi pi-check" @click="handleSave"
                class="p-button-success p-button-text p-button-sm" />
        </template>
    </Dialog>
</template>

<script setup>
// Vue
import { ref, computed, watch, watchEffect, onMounted } from 'vue';

// Helper for deep watching objects
const deepWatch = (source, cb) => {
    return watch(source, cb, { deep: true });
};

// Store
import { useClientStore } from '@/composables/useClientStore';
const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();

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
    }
});

const emit = defineEmits([
    'update:modelValue',
    'save',
    'close'
]);

// Primevue
import Dialog from 'primevue/dialog';
import AutoComplete from 'primevue/autocomplete';
import FloatLabel from 'primevue/floatlabel';
import SelectButton from 'primevue/selectbutton';
import RadioButton from 'primevue/radiobutton';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

// Local state
const localReservationDetails = ref(JSON.parse(JSON.stringify(props.reservationDetails)));
const localClient = ref(JSON.parse(JSON.stringify(props.client)));
const filteredClients = ref([]);
const selectedClient = ref(null);
const isClientSelected = ref(props.isClientSelected);
const isValidEmail = ref(true);
const isValidPhone = ref(true);

// Create RegExp objects for validation
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[+]?[0-9]{1,4}[ ]?[-]?[0-9]{1,4}[ ]?[-]?[0-9]{1,9}$/;

// HTML pattern attributes (simplified for HTML validity)
const emailPattern = undefined;  // or just remove this line entirely
const phonePattern = undefined;  // or just remove this line entirely

const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];
const genderOptions = [
    { label: '男性', value: 'male' },
    { label: '女性', value: 'female' },
    { label: 'その他', value: 'other' },
];

// Filter clients based on search query
const filterClients = async (event) => {
    try {
        const query = event.query.toLowerCase().trim();
        if (!query) {
            filteredClients.value = [];
            return;
        }

        // Preserve original casing for display
        localReservationDetails.value.name = event.query;

        // If clients are not loaded yet, fetch them first
        if (!clients.value || clients.value.length === 0) {
            await fetchClients(1);
        }

        const normalizedQuery = normalizePhone(query);
        const isNumericQuery = /^\d+$/.test(normalizedQuery);

        if (!clients.value || !Array.isArray(clients.value)) {
            filteredClients.value = [];
            return;
        }

        filteredClients.value = clients.value.filter((client) => {
            if (!client) return false;

            // Match by name (including kana and kanji)
            const matchesName =
                (client.name && client.name.toLowerCase().includes(query)) ||
                (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
                (client.name_kanji && client.name_kanji.toLowerCase().includes(query));

            // Match by phone/fax (only for numeric queries)
            const matchesPhoneFax = isNumericQuery &&
                ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) ||
                    (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));

            // Match by email
            const matchesEmail = client.email && client.email.toLowerCase().includes(query);

            return matchesName || matchesPhoneFax || matchesEmail;
        });
    } catch (error) {
        console.error('Error filtering clients:', error);
        filteredClients.value = [];
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '顧客のフィルタリング中にエラーが発生しました。',
            life: 3000,
        });
    }
};

// Handle client selection from dropdown
const onClientSelect = (event) => {
    const client = event.value;
    if (client) {
        selectedClient.value = client;
        isClientSelected.value = true;

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
    if (!email) {
        isValidEmail.value = true; // Empty is valid (optional field)
        return;
    }
    isValidEmail.value = emailRegex.test(email);
};

const validatePhone = (phone) => {
    if (!phone) {
        isValidPhone.value = true; // Empty is valid (optional field)
        return;
    }
    isValidPhone.value = phoneRegex.test(phone);
};

// Handle form submission
const handleSave = () => {
    validateEmail(localReservationDetails.value.email);
    validatePhone(localReservationDetails.value.phone);

    if (!localReservationDetails.value.email && !localReservationDetails.value.phone) {
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

    emit('save', localReservationDetails.value);
};

// Fetch clients on mount
onMounted(async () => {
    if (props.client === null){
        console.log('[ClientForReservantionDialog] onMounted client is null');
        localReservationDetails.value.legal_or_natural_person = 'legal';
        localReservationDetails.value.gender = 'other';    
    }    
    try {
        setClientsIsLoading(true);
        const clientsTotalPages = await fetchClients(1);
        for (let page = 2; page <= clientsTotalPages; page++) {
        await fetchClients(page);
        }
        setClientsIsLoading(false);
    } catch (error) {
        console.error('Error fetching clients:', error);
        // Optionally show an error message to the user
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '顧客データの取得中にエラーが発生しました。',
            life: 3000,
        });
    }
});

// Initialize local client from props
watch(() => props.client, (newVal) => {
    if (newVal) {
        localClient.value = { ...newVal };
    }
}, { immediate: true });

watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        localReservationDetails.value = { ...props.reservationDetails };
        localClient.value = { ...props.client };
    }
});

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
