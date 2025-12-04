<template>
    <div v-if="!occupancyData || occupancyData.length === 0" class="text-center p-4">
        データはありません。
    </div>
    <div v-else class="p-fluid">
        <DataTable 
            :value="occupancyData"
            responsiveLayout="scroll" 
            paginator 
            :rows="rows"
            :rowsPerPageOptions="rowsPerPageOptions"
            stripedRows
            sortMode="multiple"
            removableSort
        >
            <Column v-if="showHotelColumn" field="hotel_name" header="施設" frozen sortable style="min-width: 150px; width: 15%"></Column>
            <Column field="month" header="月度" sortable :style="monthColumnStyle"></Column>
            <Column field="fc_sold_rooms" header="計画販売室数" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ data.fc_sold_rooms?.toLocaleString('ja-JP') || 0 }}</template>
            </Column>
            <Column field="sold_rooms" header="実績販売室数" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ data.sold_rooms?.toLocaleString('ja-JP') || 0 }}</template>
            </Column>
            <Column header="販売室数差異" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ ( (data.sold_rooms || 0) - (data.fc_sold_rooms || 0) ).toLocaleString('ja-JP') }}</template>
            </Column>
            <Column v-if="showNonAccommodationColumn" field="non_accommodation_stays" header="非宿泊数" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ data.non_accommodation_stays?.toLocaleString('ja-JP') || 0 }}</template>
            </Column>
            <Column field="fc_occ" header="計画稼働率" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ formatPercentage(data.fc_occ / 100) }}</template>
            </Column>
            <Column field="occ" header="実績稼働率" sortable style="min-width: 100px; width: 10%">
                <template #body="{data}">{{ formatPercentage(data.occ / 100) }}</template>
            </Column>
            <Column header="稼働率差異 (p.p.)" sortable style="min-width: 120px; width: 10%">
                <template #body="{ data }">
                    <div class="flex justify-center items-center mr-2">                                        
                        <Badge class="ml-2" :severity="getSeverity(((data.occ || 0) - (data.fc_occ || 0))/100)" size="small">
                            {{ ((data.occ || 0) - (data.fc_occ || 0)) >= 0 ? '+' : '' }}{{ ((data.occ || 0) - (data.fc_occ || 0)).toFixed(2) }}
                        </Badge>
                    </div>
                </template>
            </Column>
            <Column field="fc_total_rooms" header="計画総室数" sortable style="min-width: 100px; width: 7.5%">
                <template #body="{data}">{{ data.fc_total_rooms?.toLocaleString('ja-JP') || 0 }}</template>
            </Column>
            <Column field="total_rooms" header="実績総室数" sortable style="min-width: 100px; width: 7.5%">
                <template #body="{data}">{{ data.total_rooms?.toLocaleString('ja-JP') || 0 }}</template>
            </Column>
            <template #paginatorstart></template>
            <template #paginatorend>
                <div class="flex gap-2">
                    <Button type="button" icon="pi pi-download" :label="showDetailedCsvButton ? 'CSV' : ''" text @click="exportCSV" />
                    <Button v-if="showDetailedCsvButton" type="button" icon="pi pi-download" label="詳細CSV" text @click="downloadDetailedCSV" />
                </div>
            </template>
        </DataTable>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { DataTable, Column, Badge, Button } from 'primevue';
import { formatPercentage } from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil } from '@/utils/reportingUtils';
import Papa from 'papaparse';

const props = defineProps({
    occupancyData: {
        type: Array,
        required: true
    },
    occupationBreakdownData: {
        type: Array,
        default: () => []
    },
    showHotelColumn: {
        type: Boolean,
        default: true
    },
    showNonAccommodationColumn: {
        type: Boolean,
        default: false
    },
    showDetailedCsvButton: {
        type: Boolean,
        default: true
    },
    rows: {
        type: Number,
        default: 12
    },
    rowsPerPageOptions: {
        type: Array,
        default: () => [12, 24, 36, 48]
    }
});

const getSeverity = (value) => getSeverityUtil(value);

const monthColumnStyle = computed(() => {
    return props.showHotelColumn 
        ? 'min-width: 100px; width: 10%' 
        : 'min-width: 100px; width: 10%';
});

const exportCSV = () => {
    if (!props.occupancyData || props.occupancyData.length === 0) {
        console.log('No data to export');
        return;
    }

    const hotelName = props.occupancyData[0]?.hotel_name || '施設';
    const filename = props.showHotelColumn 
        ? '複数施設・稼働率データ.csv'
        : `${hotelName.replace(/\s+/g, '_')}_稼働率データ.csv`;

    const headers = props.showHotelColumn
        ? ["施設", "月度", "計画販売室数", "実績販売室数", "販売室数差異", ...(props.showNonAccommodationColumn ? ["非宿泊数"] : []), "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "実績総室数"]
        : ["月度", "計画販売室数", "実績販売室数", "販売室数差異", "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "実績総室数"];

    const csvRows = [headers.join(',')];
    
    props.occupancyData.forEach(row => {
        const fcSold = row.fc_sold_rooms || 0;
        const sold = row.sold_rooms || 0;
        const fcOcc = row.fc_occ || 0;
        const occ = row.occ || 0;

        const csvRow = [
            ...(props.showHotelColumn ? [`"${row.hotel_name || ''}"`] : []),
            `"${row.month || ''}"`,
            fcSold,
            sold,
            sold - fcSold,
            ...(props.showNonAccommodationColumn ? [row.non_accommodation_stays || 0] : []),
            fcOcc.toFixed(2),
            occ.toFixed(2),
            (occ - fcOcc).toFixed(2),
            row.fc_total_rooms || 0,
            row.total_rooms || 0
        ];
        csvRows.push(csvRow.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

const downloadDetailedCSV = () => {
    if (!props.occupationBreakdownData || props.occupationBreakdownData.length === 0) {
        alert('詳細データがありません');
        return;
    }

    const filteredData = props.occupationBreakdownData.filter(item => 
        item.plan_name !== 'Total Available' &&
        item.sales_category !== 'employee' &&
        item.sales_category !== 'block'
    );

    // Prepare data
    const dataToExport = filteredData.map(item => ({
        ...(props.showHotelColumn ? { '施設': item.hotel_name || '' } : {}),
        'プラン名': item.plan_name,
        '未確定泊数': item.undecided_nights || 0,
        '確定泊数': item.confirmed_nights || 0,
        '社員泊数': item.employee_nights || 0,
        'ブロック泊数': item.blocked_nights || 0,
        '合計稼働数': item.total_occupied_nights || 0
    }));

    // Calculate Totals
    const totals = filteredData.reduce((acc, item) => {
        acc.undecided_nights += parseInt(item.undecided_nights || '0');
        acc.confirmed_nights += parseInt(item.confirmed_nights || '0');
        acc.employee_nights += parseInt(item.employee_nights || '0');
        acc.blocked_nights += parseInt(item.blocked_nights || '0');
        acc.total_occupied_nights += parseInt(item.total_occupied_nights || '0');
        return acc;
    }, { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0 });

    // Total Available from raw data
    const totalAvailableRow = props.occupationBreakdownData.find(row => row.plan_name === 'Total Available');
    const totalBookable = totalAvailableRow ? parseInt(totalAvailableRow.total_bookable_room_nights || '0') : 0;
    const netAvailable = totalAvailableRow ? parseInt(totalAvailableRow.net_available_room_nights || '0') : 0;

    // Add totals
    dataToExport.push({
        ...(props.showHotelColumn ? { '施設': '合計' } : {}),
        'プラン名': '合計',
        '未確定泊数': totals.undecided_nights,
        '確定泊数': totals.confirmed_nights,
        '社員泊数': totals.employee_nights,
        'ブロック泊数': totals.blocked_nights,
        '合計稼働数': totals.total_occupied_nights
    });

    // Add total bookable and net available
    dataToExport.push({
        ...(props.showHotelColumn ? { '施設': '' } : {}),
        'プラン名': '総販売可能室数',
        '未確定泊数': '',
        '確定泊数': '',
        '社員泊数': '',
        'ブロック泊数': '',
        '合計稼働数': totalBookable
    });

    dataToExport.push({
        ...(props.showHotelColumn ? { '施設': '' } : {}),
        'プラン名': '正味販売可能室数',
        '未確定泊数': '',
        '確定泊数': '',
        '社員泊数': '',
        'ブロック泊数': '',
        '合計稼働数': netAvailable
    });

    // Use PapaParse to generate CSV
    const csv = Papa.unparse(dataToExport, {
        quotes: true,
        quoteChar: '"',
        escapeChar: '"',
        delimiter: ",",
        header: true,
        newline: "\r\n"
    });

    const hotelName = props.occupancyData[0]?.hotel_name || '施設';
    const filename = props.showHotelColumn 
        ? '複数施設_稼働率詳細.csv'
        : `${hotelName.replace(/\s+/g, '_')}_稼働率詳細.csv`;

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
</script>
