<template>
    <Card>
        <template #content>
            <DataTable :value="parkingBlocks" dataKey="id" paginator :rows="30"
                :rowsPerPageOptions="[10, 30, 50, 100]" scrollable stripedRows responsive
                :emptyMessage="emptyMessage">
                <Column field="hotel_name" header="ホテル"></Column>
                <Column header="駐車場">
                    <template #body="{ data }">
                        {{ data.parking_lot_name || '全駐車場' }}
                    </template>
                </Column>
                <Column header="スポットサイズ">
                    <template #body="{ data }">
                        {{ data.spot_size ? `サイズ ${data.spot_size}` : '全サイズ' }}
                    </template>
                </Column>
                <Column header="開始日">
                    <template #body="{ data }">
                        {{ formatDate(new Date(data.start_date)) }}
                    </template>
                </Column>
                <Column header="終了日">
                    <template #body="{ data }">
                        {{ formatDate(new Date(data.end_date)) }}
                    </template>
                </Column>
                <Column field="number_of_spots" header="ブロック台数"></Column>
                <Column field="comment" header="備考"></Column>
                <Column header="削除">
                    <template #body="{ data }">
                        <Button icon="pi pi-trash" class="p-button-text p-button-danger p-button-sm"
                            @click="$emit('delete-block', data)" />
                    </template>
                </Column>
            </DataTable>
        </template>
    </Card>
</template>

<script setup>
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

const props = defineProps({
    parkingBlocks: {
        type: Array,
        required: true
    },
    emptyMessage: {
        type: String,
        default: 'ブロック設定がありません'
    }
});

const emit = defineEmits(['delete-block']);

const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
</script>
