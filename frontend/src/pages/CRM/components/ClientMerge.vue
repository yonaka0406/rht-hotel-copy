<template>
    <div class="p-4">
        <h2 class="text-xl font-bold mb-4">顧客合流</h2>
  
        <Card class="p-4 border-2 border-blue-500">
            <template #title>合流結果選択</template>
            <template #content>
                <div v-if="mergedClient">
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">氏名・名称:</label>
                        <SelectButton
                            v-model="mergedClient.name"
                            :options="[newClient?.name, oldClient?.name]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">カナ:</label>
                        <SelectButton
                            v-model="mergedClient.name_kana"
                            :options="[newClient?.name_kana, oldClient?.name_kana]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name_kana }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">漢字:</label>
                        <SelectButton
                            v-model="mergedClient.name_kanji"
                            :options="[newClient?.name_kanji, oldClient?.name_kanji]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.name_kanji }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">誕生日・設立日:</label>
                        <SelectButton
                            v-model="mergedClient.date_of_birth"
                            :options="[
                                newClient?.date_of_birth,
                                oldClient?.date_of_birth
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.date_of_birth === null ? null : formatDate(new Date(mergedClient.date_of_birth)) }}                            
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">個人・法人:</label>
                        <SelectButton
                            v-model="mergedClient.legal_or_natural_person"                            
                            optionLabel="label"
                            optionValue="value"
                            :options="[
                                {label: newClient?.legal_or_natural_person === 'natural' ? '個人' : '法人', value: newClient?.legal_or_natural_person},
                                {label: oldClient?.legal_or_natural_person === 'natural' ? '個人' : '法人', value: oldClient?.legal_or_natural_person}
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.legal_or_natural_person === 'natural' ? '個人' : '法人' }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">性別:</label>
                        <SelectButton
                            v-model="mergedClient.gender"
                            optionLabel="label"
                            optionValue="value"
                            :options="[
                                {label: newClient?.gender === 'male' ? '男性' : newClient?.gender === 'female' ? '女性' : 'その他', value: newClient?.gender},
                                {label: oldClient?.gender === 'male' ? '男性' : oldClient?.gender === 'female' ? '女性' : 'その他', value: oldClient?.gender}
                            ]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.gender === 'male' ? '男性' : mergedClient.gender === 'female' ? '女性' : 'その他'}}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">メールアドレス:</label>
                        <SelectButton
                            v-model="mergedClient.email"
                            :options="[newClient?.email, oldClient?.email]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.email }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">電話番号:</label>
                        <SelectButton
                            v-model="mergedClient.phone"
                            :options="[newClient?.phone, oldClient?.phone]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.phone }}
                        </p>
                    </div>
                    <div class="mb-2">
                        <label class="block font-semibold mb-1">ファックス:</label>
                        <SelectButton
                            v-model="mergedClient.fax"
                            :options="[newClient?.fax, oldClient?.fax]"
                        />
                        <p class="mt-1">
                            結果： {{ mergedClient.fax }}
                        </p>
                    </div>

                    <Divider />

                    <div class="mb-2">
                        <label class="block font-semibold mb-1">住所:</label>
                        <div v-for="address in combinedAddresses" :key="address.id" class="flex items-center mb-2">
                            <Checkbox v-model="selectedAddresses" :value="address.id" :inputId="address.id" />
                            <label :for="address.id" class="ml-2">
                                <span :class="{'text-blue-500': address.source === 'new', 'text-green-500': address.source === 'old'}">
                                    [{{ address.source === 'new' ? '新' : '旧' }}]
                                </span>
                                {{ address.address_name }}: {{ formatDisplayAddress(address) }}
                            </label>
                        </div>
                    </div>
                </div>
            </template>
        </Card>
        <div class="flex justify-center items-center mt-4">
            <Button 
                @click="saveChanges()"
                severity="warn"
                class="p-button p-button-sm "
            >
                <i class="pi pi-pencil mr-2"></i>顧客合流
            </Button>
        </div>
        
    </div>
  </template>
  
<script setup>
import { ref, watch, computed } from 'vue';
import { useClientStore } from '@/composables/useClientStore';
import Card from 'primevue/card';
import SelectButton from 'primevue/selectbutton';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Divider from 'primevue/divider';

const props = defineProps({
    oldID: String,
    newID: String
});

const { fetchClient, fetchClients, setClientsIsLoading, mergeClientsCRM } = useClientStore();

const oldClient = ref(null);
const newClient = ref(null);
const selectedAddresses = ref([]);

const mergedClient = ref({
    name: null,
    name_kana: null,
    name_kanji: null,
    date_of_birth: null,
    legal_or_natural_person: null,
    gender: null,
    email: null,
    phone: null,
    fax: null,
});

const combinedAddresses = computed(() => {
    const addresses = [];
    if (newClient.value?.addresses) {
        addresses.push(...newClient.value.addresses.map(a => ({ ...a, source: 'new' })));
    }
    if (oldClient.value?.addresses) {
        addresses.push(...oldClient.value.addresses.map(a => ({ ...a, source: 'old' })));
    }
    return addresses;
});

const formatDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
};

const formatDisplayAddress = (address) => {
    if (!address) return 'N/A';
    const { postal_code, state, city, street } = address;
    return [postal_code, state, city, street].filter(Boolean).join(' ');
};

const fetchData = async () => {
    let oldClientData = null;
    let newClientData = null;

    if (props.oldID) {
        const response = await fetchClient(props.oldID);
        if (response && response.client) {
            oldClient.value = response.client.client;
            if(oldClient.value.date_of_birth){
                oldClient.value.date_of_birth = formatDate(new Date(oldClient.value.date_of_birth));
            } 
        } else {
            oldClient.value = null;
        }
    }

    if (props.newID) {
        const response = await fetchClient(props.newID);
        if (response && response.client) {
            newClient.value = response.client.client;
            if(newClient.value.date_of_birth){
                newClient.value.date_of_birth = formatDate(new Date(newClient.value.date_of_birth));
            } 
        } else {
            newClient.value = null;
        }
    }

    mergedClient.value = {
        name: newClient.value.name || oldClient.value.name,
        name_kana: newClient.value.name_kana || oldClient.value.name_kana,
        name_kanji: newClient.value.name_kanji || oldClient.value.name_kanji,
        date_of_birth: newClient.value.date_of_birth || oldClient.value.date_of_birth,
        legal_or_natural_person: newClient.value.legal_or_natural_person || oldClient.value.legal_or_natural_person,
        gender: newClient.value.gender || oldClient.value.gender,
        email: newClient.value.email || oldClient.value.email,
        phone: newClient.value.phone || oldClient.value.phone,
        fax: newClient.value.fax || oldClient.value.fax,
    };
};

watch(() => [props.oldID, props.newID], fetchData, { immediate: true });

const saveChanges = async () => {
    const payload = {
        mergedFields: mergedClient.value,
        addressIdsToKeep: selectedAddresses.value
    };

    await mergeClientsCRM(props.newID, props.oldID, payload);

    setClientsIsLoading(true);
    const clientsTotalPages = await fetchClients(1);
    for (let page = 2; page <= clientsTotalPages; page++) {
        await fetchClients(page);
    }
    setClientsIsLoading(false);
};
</script>