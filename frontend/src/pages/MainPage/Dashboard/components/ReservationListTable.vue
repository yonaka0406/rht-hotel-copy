<template>
    <DataTable :value="reservationList" :loading="loading" :paginator="true" :rows="10" dataKey="id" stripedRows
        @rowDblclick="emit('row-dblclick', $event)" class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl">
        <template #header>
            <div class="flex justify-between">
                <p class="font-bold text-lg dark:text-gray-100">予約一覧</p>
            </div>
        </template>
        <template #empty>
            <span class="dark:text-gray-400">指定されている期間中では予約ありません。</span>
        </template>

        <Column field="status" header="ステータス" style="width:10%">
            <template #body="slotProps">
                <div class="flex justify-center items-center">
                    <span v-if="slotProps.data.status === 'hold'"
                        class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200">
                        <i class="pi pi-pause" v-tooltip="'保留中'"></i>
                    </span>
                    <span v-if="slotProps.data.status === 'provisory'"
                        class="px-2 py-1 rounded-md bg-cyan-200 text-cyan-700 dark:bg-cyan-800 dark:text-cyan-200">
                        <i class="pi pi-clock" v-tooltip="'仮予約'"></i>
                    </span>
                    <span v-if="slotProps.data.status === 'confirmed'"
                        class="px-2 py-1 rounded-md bg-sky-200 text-sky-700 dark:bg-sky-800 dark:text-sky-200">
                        <i class="pi pi-check-circle" v-tooltip="'確定'"></i>
                    </span>
                    <span v-if="slotProps.data.status === 'checked_in'"
                        class="px-2 py-1 rounded-md bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200">
                        <i class="pi pi-user" v-tooltip="'滞在中'"></i>
                    </span>
                    <span v-if="slotProps.data.status === 'checked_out'"
                        class="px-2 py-1 rounded-md bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200">
                        <i class="pi pi-sign-out" v-tooltip="'アウト'"></i>
                    </span>
                    <span v-if="slotProps.data.status === 'cancelled'"
                        class="px-2 py-1 rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        <i class="pi pi-times" v-tooltip="'キャンセル'"></i>
                    </span>
                </div>
            </template>
        </Column>

        <Column field="booker_name" header="予約者" style="width:20%">
            <template #body="slotProps">
                <span class="dark:text-gray-100">{{ slotProps.data.booker_name }}</span>
            </template>
        </Column>

        <Column field="clients_json" header="宿泊者" style="width:20%">
            <template #body="{ data }">
                <div v-if="data.clients_json" class="dark:text-gray-100" style="white-space: pre-line;"
                    :v-tooltip="formatClientNames(data.clients_json)">
                    <div v-for="client in (Array.isArray(data.clients_json) ? data.clients_json : JSON.parse(data.clients_json))"
                        :key="client.id">
                        <span v-if="client.gender === 'male'" class="mr-1 text-blue-500">♂</span>
                        <span v-else-if="client.gender === 'female'" class="mr-1 text-pink-500">♀</span>
                        {{ client.name_kanji || client.name_kana || client.name }}
                    </div>
                </div>
            </template>
        </Column>

        <Column field="check_in" header="チェックイン" sortable style="width:15%">
            <template #body="slotProps">
                <span class="dark:text-gray-100">{{ formatDateWithDay(slotProps.data.check_in) }}</span>
            </template>
        </Column>

        <Column field="number_of_people" header="宿泊者数" sortable style="width:10%">
            <template #body="slotProps">
                <div class="flex justify-end mr-4">
                    <span class="dark:text-gray-100">{{ slotProps.data.number_of_people }}</span>
                </div>
            </template>
        </Column>

        <Column field="number_of_nights" header="宿泊数" sortable style="width:10%">
            <template #body="slotProps">
                <div class="flex justify-end mr-4">
                    <span class="dark:text-gray-100">{{ slotProps.data.number_of_nights }}</span>
                </div>
            </template>
        </Column>

        <Column field="price" header="料金" sortable style="width:10%">
            <template #body="slotProps">
                <div class="flex justify-end mr-2">
                    <span class="items-end dark:text-gray-100">{{ formatCurrency(slotProps.data.price) }}</span>
                </div>
            </template>
        </Column>
    </DataTable>
</template>

<script setup>
import { DataTable, Column } from 'primevue';

defineProps({
    reservationList: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['row-dblclick']);

const formatDateWithDay = (date) => {
    const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parsedDate = new Date(date);
    return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
};

const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const formatClientNames = (clientsJson) => {
    try {
        const clients = Array.isArray(clientsJson) ? clientsJson : JSON.parse(clientsJson);
        return clients.map(client => client.name_kanji || client.name_kana || client.name).join('\n');
    } catch (e) {
        return '';
    }
};
</script>
