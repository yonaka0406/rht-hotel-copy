<template>
    <Dialog
        class="dark:bg-gray-800 dark:text-gray-200"
        :visible="visible"
        @update:visible="closeDialog"
        :header="'新規顧客登録'"
        :closable="true"
        :modal="true"
        :style="{ width: '50vw' }"
    >
        <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
            <!-- Name of the person -->
            <div class="col-span-2 mb-6">
            <FloatLabel>
                <InputText
                v-model="newClient.name"
                fluid
                />
                <label>個人氏名 || 法人名称 【漢字又はローマ字】</label>
            </FloatLabel>
            </div>
            <div class="col-span-2 mb-6">
            <FloatLabel>
                <InputText
                v-model="newClient.name_kana"
                fluid
                />
                <label>カナ</label>
            </FloatLabel>
            </div>
            <div class="col-span-2 mb-6">
            <FloatLabel>
                <InputText
                v-model="newClient.customer_id"
                fluid
                />
                <label>顧客コード</label>
                <small class="text-gray-500">次の利用可能番号: {{ nextAvailableCustomerId }}</small>
            </FloatLabel>
            </div>
            <!-- Type of person (Legal or Natural) -->
            <div class="col-span-1">
            <SelectButton
                v-model="newClient.legal_or_natural_person"
                :options="personTypeOptions"
                option-label="label"
                option-value="value"
                fluid
            />
            </div>
            <!-- Gender input if person is natural -->
            <div class="col-span-1">
            <div v-if="newClient.legal_or_natural_person === 'natural'" class="flex gap-3">
                <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                <RadioButton
                    v-model="newClient.gender"
                    :inputId="option.value"
                    :value="option.value"
                />
                <label :for="option.value">{{ option.label }}</label>
                </div>
            </div>
            </div>
            <!-- Email input -->
            <div class="col-span-1">
            <FloatLabel>
                <InputText
                v-model="newClient.email"
                :class="{'p-invalid': !isValidEmail}"
                @input="validateEmailField(newClient.email)"
                fluid
                />
                <label>メールアドレス</label>
            <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
            </FloatLabel>
            </div>
            <!-- Phone number input -->
            <div class="col-span-1">
            <FloatLabel>
                <InputText
                v-model="newClient.phone"
                :class="{'p-invalid': !isValidPhone}"
                @input="validatePhoneField(newClient.phone)"
                fluid
                />
                <label>電話番号</label>
                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
            </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeDialog" class="p-button-danger p-button-text p-button-sm" />
            <Button label="保存" icon="pi pi-check" @click="submitClient" class="p-button-success p-button-text p-button-sm" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Dialog, FloatLabel, SelectButton, RadioButton, InputText, Button } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { useClientStore } from '@/composables/useClientStore';
import { useRouter } from 'vue-router';

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close', 'client-created']);

const router = useRouter();
const { createBasicClient, clients, nextAvailableCustomerId } = useClientStore();
const toast = useToast();

const newClient = ref({});
const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];
const genderOptions = [
    { label: '男性', value: 'male' },
    { label: '女性', value: 'female' },
    { label: 'その他', value: 'other' },
];

import { validatePhone, validateEmail } from '@/utils/validationUtils';

const isValidEmail = ref(true);
const isValidPhone = ref(true);

const newClientReset = () => {
    newClient.value = {
        name: null,
        name_kana: null,
        customer_id: null,
        legal_or_natural_person: 'natural',
        gender: 'other',
        phone: null,
        email: null,
    };
    isValidEmail.value = true;
    isValidPhone.value = true;
};

watch(() => props.visible, (newValue) => {
    if (newValue) {
        newClientReset();
    }
});

const closeDialog = () => {
    emit('close');
};

const validateEmailField = (email) => {
    isValidEmail.value = validateEmail(email);
};

const validatePhoneField = (phone) => {
    isValidPhone.value = validatePhone(phone);
};

const goToEditClientPage = (clientId) => {
    const route = router.resolve({ name: 'ClientEdit', params: { clientId: clientId } });
    window.open(route.href, '_blank');
};

const submitClient = async () => {
    if (!newClient.value.name && !newClient.value.name_kana) {
        toast.add({ severity: 'warn', summary: '注意', detail: '氏名・名称またはカナの少なくとも 1 つを入力する必要があります。', life: 3000 });
        return;
    }
    if (!newClient.value.email && !newClient.value.phone) {
        toast.add({ severity: 'warn', summary: '注意', detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。', life: 3000 });
        return;
    }
    validateEmail(newClient.value.email);
    validatePhone(newClient.value.phone);

    if (newClient.value.email && !isValidEmail.value) {
        toast.add({ severity: 'warn', summary: '注意', detail: '有効なメールアドレスを入力してください。', life: 3000 });
        return;
    }
    if (newClient.value.phone && !isValidPhone.value) {
        toast.add({ severity: 'warn', summary: '注意', detail: '有効な電話番号を入力してください。', life: 3000 });
        return;
    }

    try {
        const newBasicClient = await createBasicClient(newClient.value.name, newClient.value.name_kana, newClient.value.legal_or_natural_person, newClient.value.gender, newClient.value.email, newClient.value.phone);
        toast.add({ severity: 'success', summary: '成功', detail: '新しいクライアントが作成されました', life: 3000 });
        closeDialog();
        goToEditClientPage(newBasicClient.id);
        emit('client-created');
    } catch (error) {
        console.error('Failed to create basic client:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: `クライアントの作成に失敗しました: ${error.message || '不明なエラー'}`, life: 3000 });
    }
};
</script>