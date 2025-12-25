<template>
    <div>
        <div>
            <div class="flex items-center font-bold text-xl">
                <span>{{ clientName }}</span>
            </div>
            <div class="flex justify-end">
                <Button label="住所追加" icon="pi pi-plus" @click="addAddress" />
            </div>
        </div>
        <Accordion :activeIndex="0">
            <AccordionPanel v-for="address in addresses" :key="address.id" :value="address.id">
                <AccordionHeader>
                    {{ address.address_name }}
                </AccordionHeader>
                <AccordionContent>
                    <div v-if="loading">
                        <p>住所情報を読み込み中...</p>
                    </div>
                    <div v-else class="text-left">
                        <div v-if="address.address_name"><span class="font-bold">送り先：</span>{{ address.address_name }}
                        </div>
                        <div v-if="address.representative_name"><span class="font-bold">宛先：</span>{{
                            address.representative_name }} </div>
                        <div v-if="address.phone"><span class="font-bold">電話番号：</span>{{ address.phone }} </div>
                        <div v-if="address.fax"><span class="font-bold">FAX：</span>{{ address.fax }} </div>
                        <div v-if="address.email"><span class="font-bold">メールアドレス：</span>{{ address.email }} </div>
                        <div>
                            <span class="font-bold">住所：</span>
                            <span v-if="address.country">{{ address.country }}、 </span>
                            <span v-if="address.postal_code">〒{{ address.postal_code }} </span>
                            <span v-if="address.state">{{ address.state }} </span>
                            <span v-if="address.city">{{ address.city }} </span>
                            <span v-if="address.street">{{ address.street }} </span>
                        </div>
                        <div class="flex justify-center gap-4">
                            <Button severity="info" icon="pi pi-pencil" label="編集" class="p-button-sm"
                                @click="editAddress(address)" />
                            <Button icon="pi pi-trash" label="削除" class="p-button-sm p-button-danger"
                                @click="confirmDelete(address)" />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>

        <Dialog v-model:visible="addressDialogVisible" :header="dialogHeader" :modal="true">
            <form @submit.prevent="saveAddress">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="field mt-6">
                        <FloatLabel>
                            <InputText id="address_name" v-model="editedAddress.address_name" fluid />
                            <label for="address_name">住所名*</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-6">
                        <FloatLabel>
                            <InputText id="representative_name" v-model="editedAddress.representative_name" fluid />
                            <label for="representative_name">宛先（担当者）</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <InputText id="country" v-model="editedAddress.country" />
                            <label for="country">国</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <Select v-model="editedAddress.state" editable :options="states" optionLabel="label"
                                optionValue="label" optionGroupLabel="label" optionGroupChildren="items" filter
                                placeholder="都道府県選択または記入" fluid />
                            <label for="city">都道府県（記入可能）</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <InputText id="postal_code" v-model="editedAddress.postal_code" fluid />
                            <label for="postal_code">郵便番号</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <InputText id="city" v-model="editedAddress.city" fluid />
                            <label for="city">市町村</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4 col-span-2">
                        <FloatLabel>
                            <InputText id="street" v-model="editedAddress.street" fluid />
                            <label for="street">住所</label>
                        </FloatLabel>
                    </div>
                    <div class="field mt-4 col-span-2">
                        <FloatLabel>
                            <InputText id="email" v-model="editedAddress.email"
                                @input="validateEmailField(editedAddress.email)" fluid />
                            <label for="email">メールアドレス</label>
                        </FloatLabel>
                        <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <InputText id="phone" v-model="editedAddress.phone"
                                @input="validatePhoneField(editedAddress.phone)" fluid />
                            <label for="phone">電話番号</label>
                        </FloatLabel>
                        <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                    </div>
                    <div class="field mt-4">
                        <FloatLabel>
                            <InputText id="phone" v-model="editedAddress.fax"
                                @input="validateFAXField(editedAddress.fax)" fluid />
                            <label for="phone">FAX</label>
                        </FloatLabel>
                        <small v-if="!isValidFAX" class="p-error">有効な電話番号を入力してください。</small>
                    </div>
                </div>
                <div class="flex justify-center items-center mt-4">
                    <div v-if="dialogHeader === '住所追加'">
                        <Button label="新規" type="submit" />
                    </div>
                    <div v-else>
                        <Button label="保存" severity="info" type="submit" />
                    </div>

                </div>
            </form>
        </Dialog>

        <ConfirmPopup />
    </div>
</template>
<script setup>
// Vue
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();

// Stores
import { useClientStore } from '@/composables/useClientStore';
const { selectedClient, selectedClientAddress, fetchClient, createAddress, removeAddress, updateAddress } = useClientStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useConfirm } from "primevue/useconfirm";
const confirm = useConfirm();
import {
    Accordion, AccordionPanel, AccordionHeader, AccordionContent,
    FloatLabel, InputText, Select, Button, Dialog, ConfirmPopup
} from 'primevue';

const loading = ref(false);
const clientId = ref(route.params.clientId || selectedClient.value.client.id);

const clientName = computed(() => {
    if (!selectedClient.value || !selectedClient.value.client) {
        return null;
    }
    const name = selectedClient.value.client.name_kanji || selectedClient.value.client.name_kana || selectedClient.value.client.name;
    const name_kana = selectedClient.value.client.name_kana;

    return name_kana ? name + ' (' + name_kana + ')' : name;
});
const addresses = computed(() => {
    if (!selectedClientAddress.value || selectedClientAddress.value.length === 0) {
        // console.log('addresses computed selectedClientAddress null')
        return [];
    }
    // console.log('addresses computed', selectedClientAddress.value)

    return selectedClientAddress.value;
});

// Validation
import { validatePhone, validateEmail } from '@/utils/validationUtils';

const isValidEmail = ref(true);
const isValidPhone = ref(true);
const isValidFAX = ref(true);
const validateEmailField = (email) => {
    isValidEmail.value = validateEmail(email);
};
const validatePhoneField = (phone) => {
    isValidPhone.value = validatePhone(phone);
};
const validateFAXField = (phone) => {
    isValidFAX.value = validatePhone(phone);
};

// Dialog
const addressDialogVisible = ref(false);
const editedAddress = ref({});
const dialogHeader = ref('');
const states = ref([
    {
        label: '北海道地方',
        code: 'Hokkaido',
        items: [
            { label: '北海道', value: 'Hokkaido' }
        ]
    },
    {
        label: '東北地方',
        code: 'Tohoku',
        items: [
            { label: '青森県', value: 'Aomori' },
            { label: '岩手県', value: 'Iwate' },
            { label: '宮城県', value: 'Miyagi' },
            { label: '秋田県', value: 'Akita' },
            { label: '山形県', value: 'Yamagata' },
            { label: '福島県', value: 'Fukushima' }
        ]
    },
    {
        label: '関東地方',
        code: 'Kanto',
        items: [
            { label: '茨城県', value: 'Ibaraki' },
            { label: '栃木県', value: 'Tochigi' },
            { label: '群馬県', value: 'Gunma' },
            { label: '埼玉県', value: 'Saitama' },
            { label: '千葉県', value: 'Chiba' },
            { label: '東京都', value: 'Tokyo' },
            { label: '神奈川県', value: 'Kanagawa' }
        ]
    },
    {
        label: '中部地方',
        code: 'Chubu',
        items: [
            { label: '新潟県', value: 'Niigata' },
            { label: '富山県', value: 'Toyama' },
            { label: '石川県', value: 'Ishikawa' },
            { label: '福井県', value: 'Fukui' },
            { label: '山梨県', value: 'Yamanashi' },
            { label: '長野県', value: 'Nagano' },
            { label: '岐阜県', value: 'Gifu' },
            { label: '静岡県', value: 'Shizuoka' },
            { label: '愛知県', value: 'Aichi' }
        ]
    },
    {
        label: '近畿地方',
        code: 'Kinki',
        items: [
            { label: '三重県', value: 'Mie' },
            { label: '滋賀県', value: 'Shiga' },
            { label: '京都府', value: 'Kyoto' },
            { label: '大阪府', value: 'Osaka' },
            { label: '兵庫県', value: 'Hyogo' },
            { label: '奈良県', value: 'Nara' },
            { label: '和歌山県', value: 'Wakayama' }
        ]
    },
    {
        label: '中国地方',
        code: 'Chugoku',
        items: [
            { label: '鳥取県', value: 'Tottori' },
            { label: '島根県', value: 'Shimane' },
            { label: '岡山県', value: 'Okayama' },
            { label: '広島県', value: 'Hiroshima' },
            { label: '山口県', value: 'Yamaguchi' }
        ]
    },
    {
        label: '四国地方',
        code: 'Shikoku',
        items: [
            { label: '徳島県', value: 'Tokushima' },
            { label: '香川県', value: 'Kagawa' },
            { label: '愛媛県', value: 'Ehime' },
            { label: '高知県', value: 'Kochi' }
        ]
    },
    {
        label: '九州地方',
        code: 'Kyushu',
        items: [
            { label: '福岡県', value: 'Fukuoka' },
            { label: '佐賀県', value: 'Saga' },
            { label: '長崎県', value: 'Nagasaki' },
            { label: '熊本県', value: 'Kumamoto' },
            { label: '大分県', value: 'Oita' },
            { label: '宮崎県', value: 'Miyazaki' },
            { label: '鹿児島県', value: 'Kagoshima' }
        ]
    },
    {
        label: '沖縄地方',
        code: 'Okinawa',
        items: [
            { label: '沖縄県', value: 'Okinawa' }
        ]
    }
]);

const resetAddress = () => {
    editedAddress.value = {
        client_id: clientId.value,
        address_name: '',
        representative_name: '',
        street: '',
        state: '北海道',
        city: '',
        postal_code: '',
        country: '日本',
        phone: '',
        fax: '',
        email: '',
    };
};
const addAddress = () => {
    resetAddress();
    dialogHeader.value = '住所追加';
    addressDialogVisible.value = true;
};
const editAddress = (address) => {
    editedAddress.value = { ...address };
    dialogHeader.value = '住所編集';
    addressDialogVisible.value = true;
};
const saveAddress = async () => {
    // console.log('Saving address:', editedAddress.value);
    if (!editedAddress.value.address_name) {
        toast.add({ severity: 'error', summary: 'Error', detail: '住所名を入力してください。', life: 3000 });
        return;
    }
    if (editedAddress.value.email && !isValidEmail.value) {
        toast.add({ severity: 'error', summary: 'Error', detail: '有効なメールアドレスを入力してください。', life: 3000 });
        return;
    }
    if (dialogHeader.value === '住所追加') {
        await createAddress(editedAddress.value);
        toast.add({ severity: 'success', summary: 'Success', detail: '住所追加されました。', life: 3000 });
    } else {
        await updateAddress(editedAddress.value.id, editedAddress.value);
        toast.add({ severity: 'info', summary: 'Success', detail: '住所編集されました。', life: 3000 });
    }

    await fetchClient(clientId.value);

    resetAddress();
    addressDialogVisible.value = false;
};
const confirmDelete = async (address) => {
    // console.log('Deleting address:', address);
    confirm.require({
        message: `「"${address.address_name}」"を削除してもよろしいですか?`,
        header: '削除確認',
        icon: 'pi pi-info-circle',
        acceptLabel: '削除',
        acceptClass: 'p-button-danger',
        accept: () => {
            deleteAddress(address);
            toast.add({
                severity: 'success',
                summary: '削除',
                detail: `「"${address.address_name}"」を削除しました。`,
                life: 3000
            });
            confirm.close();
        },
        rejectLabel: 'キャンセル',
        rejectClass: 'p-button-secondary',
        reject: () => {
            confirm.close();
        }
    });
};
const deleteAddress = async (address) => {
    await removeAddress(address.id);
    await fetchClient(clientId.value);
};

onMounted(async () => {
    // console.log('ClientAddresses onMounted:', clientId.value);
    await fetchClient(clientId.value);
});
</script>