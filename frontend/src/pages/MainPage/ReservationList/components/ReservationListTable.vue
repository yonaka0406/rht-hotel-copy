<template>
    <div class="table-container">
        <DataTable :value="reservations" :loading="loading" :filters="filters"
            @update:filters="$emit('update:filters', $event)" :selection="selectedReservations"
            @update:selection="$emit('update:selectedReservations', $event)" filterDisplay="row" size="small"
            :paginator="true" :rows="25" :rowsPerPageOptions="[5, 10, 25, 50, 100]" dataKey="id" stripedRows
            @row-dblclick="$emit('row-dblclick', $event)" removableSort :expandedRows="expandedRows"
            @update:expandedRows="$emit('update:expandedRows', $event)" :rowExpansion="true">
            <template #header>
                <div class="flex justify-between">
                    <span class="font-bold text-lg">{{ tableHeader }}</span>
                </div>
            </template>
            <template #empty> 指定されている期間中では予約ありません。 </template>
            <Column header="詳細" style="width: 1%;">
                <template #body="slotProps">
                    <button @click="toggleRowExpansion(slotProps.data)" class="p-button p-button-text p-button-rounded"
                        type="button">
                        <i :class="isRowExpanded(slotProps.data) ? 'pi pi-chevron-down text-blue-500' : 'pi pi-chevron-right text-blue-500'"
                            style="font-size: 0.875rem;"></i>
                    </button>
                </template>
            </Column>
            <Column selectionMode="multiple" headerStyle="width: 1%"></Column>

            <Column field="status" filterField="status" header="ステータス" style="width:1%" :showFilterMenu="false">
                <template #filter="slotProps">
                    <Select v-model="slotProps.filterModel.value" :options="statusOptions" optionLabel="label"
                        optionValue="value" @change="slotProps.filterCallback" placeholder="選択" showClear fluid
                        size="small" />
                </template>
                <template #body="slotProps">
                    <div class="flex justify-center items-center">
                        <span :class="['px-2 py-1 rounded-md', getStatusInfo(slotProps.data.status).class]">
                            <i :key="getStatusInfo(slotProps.data.status).icon"
                                :class="['pi', getStatusInfo(slotProps.data.status).icon]"
                                v-tooltip="getStatusInfo(slotProps.data.status).tooltip"></i>
                        </span>
                    </div>
                </template>
            </Column>
            <Column field="booker_name" filterField="booker_name" header="予約者" style="width:3%" :showFilterMenu="false">
                <template #filter="{ }">
                    <InputText :modelValue="clientFilterInput"
                        @update:modelValue="$emit('update:clientFilterInput', $event)" type="text"
                        placeholder="予約者 氏名・カナ・漢字検索" size="small" />
                </template>
            </Column>
            <Column field="clients_json" filterField="clients_json" header="宿泊者・支払者" style="width:3%"
                :showFilterMenu="false">
                <template #filter="{ }">
                    <InputText :modelValue="clientsJsonFilterInput"
                        @update:modelValue="$emit('update:clientsJsonFilterInput', $event)" type="text"
                        placeholder="宿泊者・支払者 氏名・カナ・漢字検索" size="small" />
                </template>
                <template #body="{ data }">
                    <span v-if="data.clients_json" v-tooltip="formatClientNames(data.clients_json)"
                        style="white-space: pre-line;">
                        {{ getVisibleClientNames(data.clients_json) }}
                    </span>
                </template>
            </Column>
            <Column field="check_in" header="チェックイン" sortable style="width:1%">
                <template #body="slotProps">
                    <span>{{ formatDateWithDay(slotProps.data.check_in) }}</span>
                </template>
            </Column>
            <Column field="number_of_people" header="宿泊者数" sortable style="width:1%">
                <template #body="slotProps">
                    <div class="flex justify-end mr-4">
                        <span>{{ slotProps.data.number_of_people }}</span>
                    </div>
                </template>
            </Column>
            <Column field="number_of_nights" header="宿泊日数" sortable style="width:1%">
                <template #body="slotProps">
                    <div class="flex justify-end mr-4">
                        <span>{{ slotProps.data.number_of_nights }}</span>
                    </div>
                </template>
            </Column>
            <Column field="price" header="料金" sortable style="width:2%" :showFilterMenu="false">
                <template #filter="{ }">
                    <div class="grid grid-cols-1">
                        <Select :modelValue="priceFilterCondition"
                            @update:modelValue="$emit('update:priceFilterCondition', $event)" :options="['=', '>', '<']"
                            placeholder="条件" fluid size="small" />
                        <InputNumber :modelValue="priceFilter" @update:modelValue="$emit('update:priceFilter', $event)"
                            placeholder="請求額フィルター" fluid size="small" />
                    </div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-end mr-2">
                        <span class="items-end">{{ formatCurrency(slotProps.data.price) }}</span>
                    </div>
                </template>
            </Column>
            <Column field="payment" header="支払い" sortable style="width:2%" :showFilterMenu="false">
                <template #filter="{ }">
                    <div class="grid grid-cols-1">
                        <Select :modelValue="paymentFilterCondition"
                            @update:modelValue="$emit('update:paymentFilterCondition', $event)"
                            :options="['=', '>', '<']" placeholder="条件" fluid size="small" />
                        <InputNumber :modelValue="paymentFilter"
                            @update:modelValue="$emit('update:paymentFilter', $event)" placeholder="支払額フィルター" fluid
                            size="small" />
                    </div>
                </template>
                <template #body="slotProps">
                    <div class="flex justify-end mr-2">
                        <span class="items-end">{{ formatCurrency(slotProps.data.payment) }}</span>
                    </div>
                </template>
            </Column>

            <template #expansion="slotProps">
                <div class="mx-20">
                    <div v-if="Array.isArray(slotProps.data.merged_clients)">
                        <DataTable :value="slotProps.data.merged_clients" size="small">
                            <Column header="氏名・名称" sortable>
                                <template #body="clientSlotProps">
                                    {{ clientSlotProps.data.name_kanji || clientSlotProps.data.name_kana ||
                                    clientSlotProps.data.name || '' }}
                                </template>
                            </Column>
                            <Column header="カナ" sortable>
                                <template #body="clientSlotProps">
                                    {{ clientSlotProps.data.name_kana || '' }}
                                </template>
                            </Column>
                            <Column header="漢字" sortable>
                                <template #body="clientSlotProps">
                                    {{ clientSlotProps.data.name_kanji || '' }}
                                </template>
                            </Column>
                            <Column header="タグ" sortable>
                                <template #body="clientSlotProps">
                                    <div v-if="clientSlotProps.data.role === 'guest'">
                                        <Badge value="宿泊者" severity="contrast" />
                                    </div>
                                    <div v-else>
                                        <Badge value="支払者" severity="info" />
                                    </div>

                                </template>
                            </Column>
                        </DataTable>
                    </div>
                    <div v-else>
                        <p>宿泊者データがありません。</p>
                    </div>
                </div>
            </template>
        </DataTable>
    </div>
</template>

<script setup>
import { DataTable, Column, Select, InputText, InputNumber, Badge } from 'primevue';
import { formatDateWithDay } from '@/utils/dateUtils';

const props = defineProps({
    reservations: { type: Array, required: true },
    loading: { type: Boolean, required: true },
    filters: { type: Object, required: true },
    selectedReservations: { type: Array, default: () => [] },
    expandedRows: { type: Object, default: () => ({}) },
    tableHeader: { type: String, required: true },
    statusOptions: { type: Array, required: true },
    clientFilterInput: { type: String, default: null },
    clientsJsonFilterInput: { type: String, default: null },
    priceFilter: { type: Number, default: null },
    priceFilterCondition: { type: String, default: '=' },
    paymentFilter: { type: Number, default: null },
    paymentFilterCondition: { type: String, default: '=' }
});

const emit = defineEmits([
    'update:filters',
    'update:selectedReservations',
    'update:expandedRows',
    'row-dblclick',
    'update:clientFilterInput',
    'update:clientsJsonFilterInput',
    'update:priceFilter',
    'update:priceFilterCondition',
    'update:paymentFilter',
    'update:paymentFilterCondition'
]);

const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const getStatusInfo = (status) => {
    switch (status) {
        case 'hold': return { icon: 'pi-pause', class: 'bg-yellow-200 text-yellow-700', tooltip: '保留中' };
        case 'provisory': return { icon: 'pi-clock', class: 'bg-cyan-200 text-cyan-700', tooltip: '仮予約' };
        case 'confirmed': return { icon: 'pi-check-circle', class: 'bg-sky-200 text-sky-700', tooltip: '確定' };
        case 'checked_in': return { icon: 'pi-user', class: 'bg-green-200 text-green-700', tooltip: '滞在中' };
        case 'checked_out': return { icon: 'pi-sign-out', class: 'bg-purple-200 text-purple-700', tooltip: 'アウト' };
        case 'cancelled': return { icon: 'pi-times', class: 'bg-gray-200 text-gray-700', tooltip: 'キャンセル' };
        default: return { icon: '', class: '', tooltip: '' };
    }
};

const getVisibleClientNames = (clients) => {
    const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
    return parsedClients
        .slice(0, 1)
        .map(client => client.name_kanji || client.name_kana || client.name)
        .join("\n")
};

const formatClientNames = (clients) => {
    const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
    if (parsedClients.length <= 2) return "";
    return parsedClients
        .map(client => client.name_kanji || client.name_kana || client.name)
        .join("\n")
};

const isRowExpanded = (rowData) => {
    return props.expandedRows[rowData.id] === true;
};

const toggleRowExpansion = (rowData) => {
    const newExpandedRows = { ...props.expandedRows };
    if (newExpandedRows[rowData.id]) {
        delete newExpandedRows[rowData.id];
    } else {
        newExpandedRows[rowData.id] = true;
    }
    emit('update:expandedRows', newExpandedRows);
};
</script>

<style scoped>
.table-container {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border-radius: 10px;
    overflow-x: auto;
    background: #fff;
    padding: 0.5rem 0.5rem 1.5rem 0.5rem;
}

:deep(.p-datatable-thead > tr) {
    background: #f6f8fa;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #e6f0fa;
    transition: background 0.2s;
}

:deep(.p-datatable-tbody > tr > td),
:deep(.p-datatable-thead > tr > th) {
    padding-top: 0.7rem;
    padding-bottom: 0.7rem;
}

:deep(.p-datatable) {
    border-radius: 10px;
    overflow: hidden;
}

@media (max-width: 900px) {
    .table-container {
        padding: 0.2rem;
    }

    :deep(.p-datatable) {
        font-size: 0.95rem;
    }
}
</style>
