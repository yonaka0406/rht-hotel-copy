<template>
    <Card>
        <template #title>
            <span>顧客情報</span>
        </template>
        <template #subtitle>
            <span></span>
        </template>
        <template #content>
            <div v-if="client">

                <form @submit.prevent="saveClient">
                    <div class="flex grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 gap-y-6 pt-6">
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText id="name" v-model="client.name" fluid required />
                                <label for="name">氏名・名称</label>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <label for="name_kana">カナ</label>
                                <InputText id="name_kana" v-model="client.name_kana" fluid />
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <label for="name_kanji">漢字</label>
                                <InputText id="name_kanji" v-model="client.name_kanji" fluid />
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <label for="date_of_birth">生年月日・設立日</label>
                                <DatePicker v-model="client.date_of_birth" :showIcon="true" iconDisplay="input"
                                    dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <SelectButton v-model="client.legal_or_natural_person" :options="personTypeOptions"
                                option-label="label" option-value="value" fluid />
                        </div>
                        <div class="field col-span-1">
                            <div v-if="client.legal_or_natural_person === 'natural'" class="flex gap-3">
                                <RadioButton v-model="client.gender" :inputId="'male'" :value="'male'" />
                                <label for="male">男性</label>
                                <RadioButton v-model="client.gender" :inputId="'female'" :value="'female'" />
                                <label for="female">女性</label>
                                <RadioButton v-model="client.gender" :inputId="'other'" :value="'other'" />
                                <label for="other">その他</label>
                            </div>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText v-model="client.email" :invalid="!isValidEmail"
                                    fluid />
                                <label>メールアドレス</label>
                                <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText v-model="client.phone" :pattern="phonePattern"
                                    :invalid="!isValidPhone"
                                    fluid />
                                <label>電話番号</label>
                                <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText v-model="client.fax" :pattern="phonePattern"
                                    :invalid="!isValidFAX" fluid />
                                <label>FAX</label>
                                <small v-if="!isValidFAX" class="p-error">有効な電話番号を入力してください。</small>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText v-model="client.website" fluid />
                                <label>ウェブサイト</label>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1">
                            <SelectButton v-model="client.billing_preference" :options="billingOptions"
                                option-label="label" option-value="value" fluid />
                        </div>
                        <div class="field col-span-1">
                            <FloatLabel>
                                <InputText v-model="client.customer_id" fluid pattern="\d*" />
                                <label>顧客コード</label>
                                <small class="text-gray-500">次の利用可能番号: {{ nextAvailableCustomerId }}</small>
                            </FloatLabel>
                        </div>
                        <div class="field col-span-1 flex items-center">
                            <label class="mr-2 font-semibold">ロイヤルティ層:</label>
                            <Tag :value="getTierDisplayName(client.loyalty_tier)"
                                :severity="getTierSeverity(client.loyalty_tier)" />
                        </div>
                        <div v-if="impedimentStatus" class="field col-span-1 flex items-center">
                            <label class="mr-2 font-semibold">ステータス:</label>
                            <Tag :value="impedimentStatus.value" :severity="impedimentStatus.severity" />
                        </div>
                        <div class="field col-span-1 md:col-span-2 xl:col-span-3">
                            <FloatLabel>
                                <Textarea v-model="client.comment" fluid />
                                <label>備考</label>
                            </FloatLabel>
                        </div>
                    </div>
                    <div class="flex justify-center items-center mt-3">
                        <Button label="保存" severity="info" type="submit" />
                    </div>
                </form>

                <Card class="mt-4">
                    <template #title>
                        <small>所属グループ</small>
                    </template>
                    <template #content>
                        <div v-if="client.client_group_id">

                            <DataTable :value="selectedClientGroup">
                                <template #header>
                                    <div class="flex justify-end">
                                        <Button label="グループから外す" icon="pi pi-times"
                                            class="p-button-text p-button-danger mx-4" @click="removeFromGroup" />
                                    </div>
                                </template>
                                <Column header="操作">
                                    <template #body="{ data }">
                                        <Button @click="goToEditClientPage(data.id)" severity="info"
                                            class="p-button-rounded p-button-text p-button-sm">
                                            <i class="pi pi-pencil"></i>
                                        </Button>
                                    </template>
                                </Column>
                                <Column header="氏名・名称">
                                    <template #body="{ data }">
                                        {{ data.name_kanji || data.name_kana || data.name }}
                                    </template>
                                </Column>
                                <Column header="カナ">
                                    <template #body="{ data }">
                                        {{ data.name_kana }}
                                    </template>
                                </Column>
                                <Column field="legal_or_natural_person" header="法人 / 個人">
                                    <template #body="{ data }">
                                        <span v-if="data.legal_or_natural_person === 'legal'">
                                            <Tag icon="pi pi-building" severity="secondary" value="法人"></Tag>
                                        </span>
                                        <span v-else>
                                            <Tag icon="pi pi-user" severity="info" value="個人"></Tag>
                                        </span>
                                    </template>
                                </Column>
                                <Column field="phone" header="電話番号"></Column>
                                <Column field="email" header="メールアドレス"></Column>
                            </DataTable>

                        </div>
                        <div v-else>
                            <form @submit.prevent="saveGroup">
                                <div class="flex grid grid-cols-12 gap-4">
                                    <div class="col-span-1"></div>
                                    <Select v-model="selectedGroupId" :options="groups" optionLabel="name"
                                        optionValue="id" :virtualScrollerOptions="{ itemSize: 38 }" fluid
                                        placeholder="所属グループ選択" class="col-span-6" filter />
                                    <Button label="グループに追加" class="col-span-2" severity="info" type="submit" />
                                    <Button label="新規グループ" class="col-span-2" @click="openNewGroup" />
                                </div>
                            </form>
                        </div>

                    </template>
                </Card>

            </div>
            <div v-else>
                <p>読み込み中...</p>
            </div>
        </template>
    </Card>

    <Dialog v-model:visible="newGroupDialog" header="新規グループ作成" :modal="true" :style="{ width: '50vw' }">

        <div>
            <div class="mt-6">
                <FloatLabel>
                    <label for="groupName" class="font-bold">グループ名</label>
                    <InputText id="groupName" v-model="newGroupName" class="w-full" required />
                </FloatLabel>
            </div>
            <div class="mt-6">
                <FloatLabel>
                    <label for="groupComment" class="font-bold">コメント</label>
                    <Textarea id="groupComment" v-model="newGroupComment" rows="2" fluid />
                </FloatLabel>
            </div>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm"
                @click="newGroupDialog = false" />
            <Button label="作成" icon="pi pi-check" class="p-button-success p-button-text p-button-sm"
                @click="createNewGroup" />
        </template>

    </Dialog>

</template>
<script setup>
// Vue
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

// Stores
import { useClientStore } from '@/composables/useClientStore';
const { groups, selectedClient, selectedClientGroup, clients, nextAvailableCustomerId, fetchClient, fetchCustomerID, updateClientInfoCRM, fetchClientGroups, createClientGroup, updateClientGroup } = useClientStore();
import { useCRMStore } from '@/composables/useCRMStore';
const { clientImpediments } = useCRMStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Card, Dialog, FloatLabel, InputText, InputNumber, DatePicker, Select, SelectButton, RadioButton, Textarea, Button, DataTable, Column, Tag } from 'primevue';

// Client
const clientId = ref(route.params.clientId);
const client = ref({
    legal_or_natural_person: 'natural',
});
const loadingBasicInfo = ref(false);
const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];
import { validatePhone as validatePhoneUtil, validateEmail as validateEmailUtil, validateCustomerId as validateCustomerIdUtil, hasContactInfo } from '../../../utils/validationUtils';

// HTML pattern attributes
const phonePattern = /^[\d\s()+\-]*$/;

const isValidEmail = ref(true);
const isValidPhone = ref(true);
const isValidFAX = ref(true);
const billingOptions = [
    { label: '紙請求', value: 'paper' },
    { label: '電子請求', value: 'digital' },
];

const impedimentStatus = computed(() => {
    const hasBlock = clientImpediments.value.some(imp => imp.is_active && imp.restriction_level === 'block');
    if (hasBlock) {
        return { value: 'ブロック', severity: 'danger' };
    }
    const hasWarning = clientImpediments.value.some(imp => imp.is_active && imp.restriction_level === 'warning');
    if (hasWarning) {
        return { value: '警告', severity: 'warn' };
    }
    return null;
});

// Helper    
watch(() => client.value.email, (newValue) => {
    isValidEmail.value = validateEmailUtil(newValue);
});
watch(() => client.value.phone, (newValue) => {
    isValidPhone.value = validatePhoneUtil(newValue);
});
watch(() => client.value.fax, (newValue) => {
    isValidFAX.value = validatePhoneUtil(newValue); // FAX uses the same validation as phone
});
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const saveClient = async () => {
    // Create a local copy for validation and formatting
    const clientData = { ...client.value };

    // Handle Date of Birth formatting
    if (clientData.date_of_birth) {
        const dob = clientData.date_of_birth;
        const dateObj = (dob instanceof Date) ? dob : new Date(dob);

        if (!isNaN(dateObj.getTime())) {
            clientData.date_of_birth = formatDate(dateObj);
        } else {
            // If date is invalid, we can either null it or return with error
            toast.add({ severity: 'error', summary: 'Error', detail: '有効な年月日を入力してください。', life: 3000 });
            return;
        }
    } else {
        clientData.date_of_birth = null;
    }

    if (!hasContactInfo(clientData.email, clientData.phone)) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'メールアドレス又は電話番号を入力してください。', life: 3000 });
        return;
    }
    if (clientData.email && !isValidEmail.value) {
        toast.add({ severity: 'error', summary: 'Error', detail: '有効なメールアドレスを入力してください。', life: 3000 });
        return;
    }
    if (clientData.phone && !isValidPhone.value) {
        toast.add({ severity: 'error', summary: 'Error', detail: '有効な電話番号を入力してください。', life: 3000 });
        return;
    }
    if (clientData.fax && !isValidFAX.value) {
        toast.add({ severity: 'error', summary: 'Error', detail: '有効なFAX番号を入力してください。', life: 3000 });
        return;
    }

    if (clientData.customer_id) {
        if (!validateCustomerIdUtil(clientData.customer_id)) {
            toast.add({ severity: 'error', summary: 'Error', detail: '顧客コードは半角数字で入力してください。', life: 3000 });
            return;
        }
        const validateCustomerId = await fetchCustomerID(clientData.id, clientData.customer_id);
        if (validateCustomerId && Array.isArray(validateCustomerId.client) && validateCustomerId.client.length > 0) {
            toast.add({ severity: 'error', summary: 'Error', detail: '顧客コードはすでに利用中です。', life: 3000 });
            return;
        }
    }

    try {
        await updateClientInfoCRM(clientData.id, clientData);
        // Update the original ref after successful save
        client.value = { ...clientData };
        toast.add({ severity: 'success', summary: 'Success', detail: '顧客情報が編集されました。', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message || '顧客情報の更新に失敗しました。', life: 5000 });
    }
};

// Group
const selectedGroupId = ref(null);
const newGroupDialog = ref(false);
const newGroupName = ref('');
const newGroupComment = ref('');
const saveGroup = async () => {

    const _result = await updateClientGroup(selectedGroupId.value, clientId.value);
    toast.add({
        severity: 'success',
        summary: 'Success',
        detail: `所属グループ紐づけました。 `,
        life: 3000,
    });

    await fetchClient(clientId.value);
    client.value = selectedClient.value.client;

};
const removeFromGroup = async () => {
    const _result = await updateClientGroup(null, clientId.value);

    toast.add({
        severity: 'error',
        summary: '削除',
        detail: `所属グループ削除されました。`,
        life: 3000,
    });

    await fetchClient(clientId.value);
    client.value = selectedClient.value.client;
};
const openNewGroup = () => {
    newGroupDialog.value = true;
};
const createNewGroup = async () => {
    const data = {
        name: newGroupName.value,
        comment: newGroupComment.value,
        clientId: clientId.value
    };

    try {
        const result = await createClientGroup(data);
        if (result && result.success) {
            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: `所属グループ「${data.name}」作成されました。 `,
                life: 3000,
            });

            await fetchClient(clientId.value);
            client.value = selectedClient.value.client;
            newGroupDialog.value = false;
        } else {
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: (result && result.message) || 'グループの作成に失敗しました。',
                life: 3000,
            });
        }
    } catch (error) {
        console.error('createNewGroup error:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || '予期せぬエラーが発生しました。',
            life: 5000,
        });
    }
};
const goToEditClientPage = (clientId) => {
    router.push({ name: 'ClientEdit', params: { clientId: clientId } });
};

onMounted(async () => {
    try {
        loadingBasicInfo.value = true;

        await fetchClient(clientId.value);
        await fetchClientGroups();

        client.value = selectedClient.value.client;
        selectedGroupId.value = client.value.client_group_id;

        loadingBasicInfo.value = false;
    } catch (error) {
        console.error("Error fetching client data:", error);
    }
});

// Watchers        
watch(
    () => client.value.legal_or_natural_person, // Access with.value
    (newValue, _oldValue) => {
        if (newValue === 'legal') {
            client.value.gender = 'other';
        }
    }
);

const getTierDisplayName = (tier) => {
    if (!tier) return 'N/A';
    switch (tier) {
        case 'prospect': return '潜在顧客';
        case 'newbie': return '新規顧客';
        case 'repeater': return 'リピーター';
        case 'hotel_loyal': return 'ホテルロイヤル';
        case 'brand_loyal': return 'ブランドロイヤル';
        default: return tier;
    }
};

const getTierSeverity = (tier) => {
    if (!tier) return 'info';
    switch (tier) {
        case 'prospect': return 'secondary';
        case 'newbie': return 'info';
        case 'repeater': return 'success';
        case 'hotel_loyal': return 'warning';
        case 'brand_loyal': return 'danger';
        default: return 'secondary';
    }
};
</script>