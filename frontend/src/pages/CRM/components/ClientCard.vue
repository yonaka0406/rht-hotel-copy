<template>
    <!-- The card will only be rendered if the selectedClient is found in the store -->
    <Card class="mb-4" v-if="selectedClient">
        <template #content>
            <div class="grid grid-cols-2 gap-3 text-sm">
                <!-- Each field now references the 'selectedClient' computed property -->
                <div class="flex items-center gap-2" v-tooltip="'氏名・名称'">
                    <i class="pi pi-user text-blue-500" />
                    <span class="font-medium">{{ selectedClient.name || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'ID'">
                    <i class="pi pi-hashtag text-gray-500" />
                    <span class="text-gray-600">{{ selectedClient.id }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'カナ'">
                    <i class="pi pi-align-left text-green-500" />
                    <span>{{ selectedClient.name_kana || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'漢字'">
                    <i class="pi pi-language text-purple-500" />
                    <span>{{ selectedClient.name_kanji || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'誕生日・設立日'">
                    <i class="pi pi-calendar text-red-500" />
                    <span>{{ selectedClient.date_of_birth ? formatDate(new Date(selectedClient.date_of_birth)) : 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'法人・個人'">
                    <i class="pi pi-users text-indigo-500" />
                    <span>{{ selectedClient.legal_or_natural_person === 'natural' ? '個人' : '法人' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'性別'">
                    <i class="pi pi-venus text-pink-500" /><i class="pi pi-mars text-blue-600" />
                    <span>{{ selectedClient.gender === 'male' ? '男性' : selectedClient.gender === 'female' ? '女性' : 'その他' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'メールアドレス'">
                    <i class="pi pi-envelope text-orange-500" />
                    <span class="truncate">{{ selectedClient.email || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'電話番号'">
                    <i class="pi pi-phone text-teal-500" />
                    <span>{{ selectedClient.phone || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'ファックス'">
                    <i class="pi pi-print text-gray-500" />
                    <span>{{ selectedClient.fax || 'N/A' }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'作成日時'">
                    <i class="pi pi-clock text-yellow-500" />
                    <span>{{ formatDateTime(selectedClient.created_at) }}</span>
                </div>
                <div class="flex items-center gap-2" v-tooltip="'更新日時'">
                    <i class="pi pi-refresh text-cyan-500" />
                    <span>{{ formatDateTime(selectedClient.updated_at) }}</span>
                </div>
            </div>

            <!-- Addresses Section -->
            <div v-if="selectedClientAddresses.length > 0" class="mt-4">
                <Divider />
                <div class="mt-4">
                    <h3 class="font-semibold mb-2">登録住所</h3>
                    <ul class="list-none p-0 m-0">
                        <li v-for="address in selectedClientAddresses" :key="address.id" class="mb-2 p-2 border rounded-md dark:border-gray-600">
                            <div class="flex items-center gap-2 font-medium">
                                <i class="pi pi-map-marker text-blue-500" />
                                <span>{{ address.address_name || 'N/A' }}</span>
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-400 ml-6">
                                {{ formatAddress(address) }}
                            </div>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Match reasons if available -->
            <div v-if="selectedClient.matchReasons && selectedClient.matchReasons.length > 0"
                 class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div class="flex items-center gap-2 mb-2">
                    <i class="pi pi-flag text-orange-500" />
                    <span class="text-sm font-medium">一致理由:</span>
                </div>
                <div class="flex flex-wrap gap-1">
                    <span v-for="reason in selectedClient.matchReasons" :key="reason"
                          class="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs rounded">
                        {{ getReasonLabel(reason) }}
                    </span>
                </div>
            </div>
        </template>
    </Card>
    <!-- Optional: Show a loading message while initially finding client -->
    <div v-else-if="isLoading" class="p-4 text-center text-gray-500">
        <i class="pi pi-spin pi-spinner mr-2"></i> 顧客情報を読み込み中...
    </div>
    <div v-else class="p-4 text-center text-gray-500">
        顧客データが見つかりません。
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import { useClientStore } from '@/composables/useClientStore';

// The component now accepts a 'clientId' prop or a 'client' object directly.
const props = defineProps({
    clientId: {
        type: [String, Number], // Accepts string or number for the ID
        required: false
    },
    client: {
        type: Object,
        required: false,
        default: null
    }
});

// Instantiate the store to access its state.
const clientStore = useClientStore();
const { fetchClient } = clientStore;

const fetchedClientData = ref(null);
const isLoading = ref(false);

const loadClientData = async () => {
    if (props.client) {
        // If client object is provided but missing addresses, fetch them
        if (!props.client.addresses && props.client.id) {
            isLoading.value = true;
            try {
                const result = await fetchClient(props.client.id);
                // result is { client: {client, addresses, group}, addresses, group }
                fetchedClientData.value = {
                    ...result.client.client,
                    addresses: result.addresses,
                    group: result.group
                };
            } catch (e) {
                console.error('Failed to fetch additional client data:', e);
            } finally {
                isLoading.value = false;
            }
        }
        return;
    }

    if (props.clientId) {
        const found = clientStore.clients.value.find(c => c.id === props.clientId);
        if (found && found.addresses) {
            fetchedClientData.value = found;
            return;
        }

        isLoading.value = true;
        try {
            const result = await fetchClient(props.clientId);
            if (result && result.client) {
                fetchedClientData.value = {
                    ...result.client.client,
                    addresses: result.addresses,
                    group: result.group
                };
            }
        } catch (e) {
            console.error('Failed to fetch client data for ClientCard:', e);
        } finally {
            isLoading.value = false;
        }
    }
};

onMounted(loadClientData);
watch(() => [props.clientId, props.client], loadClientData);

// Create a computed property to reactively find the client.
const selectedClient = computed(() => {
    if (fetchedClientData.value) return fetchedClientData.value;
    if (props.client) return props.client;
    return clientStore.clients.value.find(client => client.id === props.clientId);
});

// Create a computed property for the client's addresses.
const selectedClientAddresses = computed(() => {
    if (!selectedClient.value) return [];
    return selectedClient.value.addresses || [];
});

const formatAddress = (address) => {
    if (!address) return 'N/A';
    const { postal_code, state, city, street } = address;
    return [postal_code, state, city, street].filter(Boolean).join(' ') || 'N/A';
};


// Helper functions remain the same.
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '-';
    }
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

const formatDateTime = (dateString) => {
    if (!dateString) return '更新なし';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getReasonLabel = (reason) => {
    const labels = {
        'email': 'メール一致',
        'phone': '電話番号一致',
        'name': '氏名一致',
        'name_similar': '氏名類似',
        'birth_date': '生年月日一致',
        'name_kana': 'カナ一致',
        'name_kanji': '漢字一致'
    };
    return labels[reason] || reason;
};
</script>

<style scoped>
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
