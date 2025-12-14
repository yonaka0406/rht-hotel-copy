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
import { formatPercentage, formatMonth } from '@/utils/formatUtils';
import { getSeverity as getSeverityUtil } from '@/utils/reportingUtils';
import Papa from 'papaparse';

const props = defineProps({
    occupancyData: {
        type: Array,
        required: true
    },
    rawOccupationBreakdownData: { // Renamed from occupationBreakdownData
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

// Computed property to aggregate raw occupation breakdown data
    const aggregatedOccupationBreakdownData = computed(() => {
    const aggregatedMap = new Map();
    let totalBookableRoomNights = 0;
    let totalNetAvailableRoomNights = 0;
    let sumOfConfirmedNightsFromOtherPlans = 0; // To sum confirmed nights from all plans except '合計稼働可能'

    let totalAvailableRawItem = null; // Store the raw '合計稼働可能' item if found

    props.rawOccupationBreakdownData.forEach(item => {
        const currentHotelName = item.hotel_name;

        if (item.plan_name === '合計稼働可能') {
            totalBookableRoomNights += parseInt(item.total_bookable_room_nights || '0');
            totalNetAvailableRoomNights += parseInt(item.net_available_room_nights || '0');
            totalAvailableRawItem = item; // Store the raw item to build the final '合計稼働可能' item
        } else if (item.sales_category !== 'employee' && item.sales_category !== 'block') {
            // For other regular plans, aggregate and sum confirmed_nights
            sumOfConfirmedNightsFromOtherPlans += parseInt(item.confirmed_nights || '0');

            const mapKey = props.showHotelColumn && currentHotelName
                ? `${currentHotelName}_${item.plan_name}`
                : item.plan_name;

            if (!aggregatedMap.has(mapKey)) {
                aggregatedMap.set(mapKey, {
                    plan_name: item.plan_name,
                    sales_category: item.sales_category,
                    undecided_nights: 0,
                    confirmed_nights: 0,
                    employee_nights: 0,
                    blocked_nights: 0,
                    non_accommodation_nights: 0,
                    total_occupied_nights: 0,
                    total_reservation_details_nights: 0,
                    hotel_name: props.showHotelColumn ? currentHotelName : undefined
                });
            }
            const aggregatedItem = aggregatedMap.get(mapKey);
            aggregatedItem.undecided_nights += parseInt(item.undecided_nights || '0');
            aggregatedItem.confirmed_nights += parseInt(item.confirmed_nights || '0');
            aggregatedItem.employee_nights += parseInt(item.employee_nights || '0');
            aggregatedItem.blocked_nights += parseInt(item.blocked_nights || '0');
            aggregatedItem.non_accommodation_nights += parseInt(item.non_accommodation_nights || '0');
            aggregatedItem.total_occupied_nights += parseInt(item.total_occupied_nights || '0');
            aggregatedItem.total_reservation_details_nights += parseInt(item.total_reservation_details_nights || '0');
        }
    });

    const finalData = Array.from(aggregatedMap.values());
    
    // Calculate Totals for the currently aggregated data
    const totals = finalData.reduce((acc, item) => {        
        acc.undecided_nights += parseInt(item.undecided_nights || '0');
        acc.confirmed_nights += parseInt(item.confirmed_nights || '0');
        acc.employee_nights += parseInt(item.employee_nights || '0');
        acc.blocked_nights += parseInt(item.blocked_nights || '0');
        acc.total_occupied_nights += parseInt(item.total_occupied_nights || '0');
        return acc;
    }, { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0 });

    finalData.push({
        plan_name: '合計',
        sales_category: null,
        undecided_nights: totals.undecided_nights,
        confirmed_nights: totals.confirmed_nights,
        employee_nights: totals.employee_nights,
        blocked_nights: totals.blocked_nights,
        non_accommodation_nights: 0, // Not aggregated for totals
        total_occupied_nights: totals.total_occupied_nights,
        total_reservation_details_nights: 0, // Not aggregated for totals
        hotel_name: props.showHotelColumn ? '合計' : undefined
    });

    // Add total bookable and net available rows
    if (totalBookableRoomNights > 0 || totalNetAvailableRoomNights > 0) {
        finalData.push({
            plan_name: '総販売可能室数',
            sales_category: null, undecided_nights: '', confirmed_nights: '',
            employee_nights: '', blocked_nights: '', non_accommodation_nights: '',
            total_occupied_nights: totalBookableRoomNights, total_reservation_details_nights: '',
            hotel_name: props.showHotelColumn ? '' : undefined
        });
        finalData.push({
            plan_name: '正味販売可能室数',
            sales_category: null, undecided_nights: '', confirmed_nights: '',
            employee_nights: '', blocked_nights: '', non_accommodation_nights: '',
            total_occupied_nights: totalNetAvailableRoomNights, total_reservation_details_nights: '',
            hotel_name: props.showHotelColumn ? '' : undefined
        });
    }

    return finalData;
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
        ? ["ホテルID", "施設", "月度", "計画販売室数", "実績販売室数", "販売室数差異", ...(props.showNonAccommodationColumn ? ["非宿泊数"] : []), "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "実績総室数"]
        : ["月度", "計画販売室数", "実績販売室数", "販売室数差異", "計画稼働率 (%)", "実績稼働率 (%)", "稼働率差異 (p.p.)", "計画総室数", "実績総室数"];

    const csvRows = [headers.join(',')];

    props.occupancyData.forEach(row => {
        const fcSold = row.fc_sold_rooms || 0;
        const sold = row.sold_rooms || 0;
        const fcOcc = row.fc_occ || 0;
        const occ = row.occ || 0;

        const csvRow = [
            ...(props.showHotelColumn ? [`"${row.hotel_id || ''}"`, `"${row.hotel_name || ''}"`] : []),
            `"${formatMonth(row.month) || ''}"`,
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
    if (!props.rawOccupationBreakdownData || props.rawOccupationBreakdownData.length === 0) {
        alert('詳細データがありません');
        return;
    }

    // Use rawOccupationBreakdownData directly
    const dataToExport = props.rawOccupationBreakdownData.map(item => ({
        ...(props.showHotelColumn ? { 'ホテルID': item.hotel_id || '', '施設': item.hotel_name || '' } : {}),
        '月度': formatMonth(item.month) || '',
        'プラン名': item.plan_name,
        '販売区分': (item.sales_category === 'accommodation' ? '宿泊' : (item.sales_category === 'other' ? 'その他' : item.sales_category)) || '', // Localized sales_category
        '未確定泊数': item.undecided_nights === 0 ? 0 : item.undecided_nights || '',
        '確定泊数': item.confirmed_nights === 0 ? 0 : item.confirmed_nights || '',
        '社員泊数': item.employee_nights === 0 ? 0 : item.employee_nights || '',
        'ブロック泊数': item.blocked_nights === 0 ? 0 : item.blocked_nights || '',
        '非宿泊数': item.non_accommodation_nights === 0 ? 0 : item.non_accommodation_nights || '',
        '合計稼働数': item.total_occupied_nights === 0 ? 0 : item.total_occupied_nights || '',
        '総販売可能室数': item.total_bookable_room_nights || '',
        '正味販売可能室数': item.net_available_room_nights || ''
    }));

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
