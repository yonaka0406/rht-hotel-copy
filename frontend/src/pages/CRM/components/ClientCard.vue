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
    <!-- Optional: Show a loading or not found message -->
    <div v-else>
        Client data not found or is loading...
    </div>
</template>

<script setup>
import { computed } from 'vue';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import { useClientStore } from '@/composables/useClientStore';

// The component now accepts a 'clientId' prop instead of the whole object.
const props = defineProps({
    clientId: {
        type: [String, Number], // Accepts string or number for the ID
        required: true
    }
});

// Instantiate the store to access its state.
const clientStore = useClientStore();

// Create a computed property to reactively find the client from the store's 'clients' ref.
const selectedClient = computed(() => {
    return clientStore.clients.value.find(client => client.id === props.clientId);
});

// Create a computed property for the client's addresses.
const selectedClientAddresses = computed(() => {
    if (!selectedClient.value) return [];
    // Assuming the store has a way to get addresses by client ID,
    // or they are part of the client object.
    // For this example, let's assume they are fetched and stored separately
    // or passed in somehow. Let's assume a function getAddressesByClientId exists.
    // A better approach would be to have addresses nested in the client object.
    // Let's assume selectedClient.value.addresses exists.
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
