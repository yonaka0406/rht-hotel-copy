<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12">
                <template #content>
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <span class="col-span-3 font-bold">月分：</span>
                        <DatePicker v-model="selectedMonth" :showIcon="true" iconDisplay="input" dateFormat="yy年mm月"
                            view="month" class="flex col-span-3" fluid />
                    </div>
                </template>
            </Card>
            <Card class="flex col-span-12">
                <template #header>
                    <h2 class="text-lg font-bold">請求書一覧</h2>
                </template>
                <template #subtitle>
                    <p class="text-sm">請求先ごとの一覧から請求書のPDF編集・出力可能です。</p>
                </template>
                <template #content>
                    <Accordion :activeIndex="0">
                        <AccordionPanel v-for="(group, index) in summarizedBilledList" :key="group.id"
                            :value="group.id">
                            <AccordionHeader>
                                <div class="grid grid-cols-6 gap-4 w-full">
                                    <div class="col-span-3 text-left">
                                        {{ `${group.client_kanji || group.client_name}` }}
                                        <small>{{ `${group.client_kana ? '(' + group.client_kana + ')' : ''}` }}</small>
                                    </div>
                                    <div class="flex items-center justify-center">
                                        {{ group.total_value.toLocaleString() }} 円
                                    </div>
                                    <div class="col-span-2 text-right mr-4">
                                        <Badge :severity="severityPreference(group.billing_preference)" class="mr-2"> {{
                                            translatePreference(group.billing_preference) }}</Badge>
                                        <Badge v-if="group.invoice_number" severity="contrast" class="mr-2">{{
                                            group.invoice_number }}</Badge>
                                        <Badge severity="secondary" class="mr-2">{{ translateStatus(group.status) }}
                                        </Badge>
                                        <Button icon="pi pi-pencil" label="編集" class="p-button-sm"
                                            @click="openInvoiceDialog(group)" />
                                    </div>
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <DataTable :value="group.details">
                                    <Column field="date" header="請求日"></Column>
                                    <Column header="予約期間">
                                        <template #body="slotProps">
                                            <span>{{ slotProps.data.check_in }}～{{ slotProps.data.check_out }}</span>
                                        </template>
                                    </Column>
                                    <Column field="room_type_name" header="部屋タイプ"></Column>
                                    <Column field="room_number" header="部屋番号" style="text-align: center;"></Column>
                                    <Column field="details[0].number_of_people" header="人数" style="text-align: center;">
                                    </Column>
                                    <Column header="宿泊日数" style="text-align: center;">
                                        <template #body="slotProps">
                                            {{ calculateNights(slotProps.data.check_in, slotProps.data.check_out) }}泊
                                        </template>
                                    </Column>
                                    <Column field="payment_comment" header="コメント"></Column>
                                    <Column header="金額" style="text-align: right;">
                                        <template #body="slotProps">
                                            <span>{{ formatCurrency(slotProps.data.value) }}</span>
                                        </template>
                                    </Column>
                                </DataTable>
                            </AccordionContent>
                        </AccordionPanel>
                    </Accordion>
                </template>
            </Card>
        </div>
    </div>

    <Dialog v-model:visible="displayInvoiceDialog" header="請求書作成" :modal="true">
        <div class="grid grid-cols-12 gap-4">
            <!-- Invoice Header-->
            <div class="col-span-12 mb-4 mx-6">
                <div class="grid grid-cols-12 gap-2">
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">請求番号:</label>
                            <InputText type="text" v-model="invoiceData.invoice_number" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">請求日:</label>
                            <InputText type="date" v-model="invoiceData.date" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">支払期限:</label>
                            <InputText type="date" v-model="invoiceData.due_date" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.due_date }}</small>
                    </div>
                    <div class="col-span-3 mt-6">
                        <FloatLabel>
                            <label class="font-bold">取引先番号:</label>
                            <InputText type="text" v-model="invoiceData.customer_code" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-6 mt-6">
                        <FloatLabel>
                            <label class="font-bold">取引先名:</label>
                            <InputText type="text" v-model="invoiceData.client_name" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.client_name }}</small>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <label class="font-bold">宿泊数:</label>
                            <InputText type="number" min="0" v-model="invoiceData.invoice_total_stays" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.invoice_total_stays }}</small>
                    </div>
                </div>
            </div>
            <!-- Invoice Details -->
            <div class="col-span-12 mb-4 mx-40">
                <DataTable :value="invoiceData.items">
                    <Column field="total_net_price" header="税抜き">
                        <template #body="slotProps">
                            <span>{{ slotProps.data.total_net_price.toLocaleString() }} 円</span>
                        </template>
                    </Column>
                    <Column header="税率">
                        <template #body="slotProps">
                            <span>{{ slotProps.data.tax_rate * 100 }} %</span>
                        </template>
                    </Column>
                    <Column field="total_price" header="税込み">
                        <template #body="slotProps">
                            <span>{{ slotProps.data.total_price.toLocaleString() }} 円</span>
                        </template>
                    </Column>
                </DataTable>
            </div>
            <!-- Invoice Comments -->
            <div class="col-span-12 mb-4">
                <FloatLabel>
                    <Textarea v-model="invoiceData.comment" rows="3" cols="30" fluid />
                    <label>備考</label>
                </FloatLabel>
                <small class="ml-1">元データ：<span style="white-space: pre-line">{{ invoiceDBData.comment }}</span></small>
            </div>
            <div class="col-span-12 flex justify-end gap-2">
                <Button v-if="!isGenerating" label="Excel作成" @click="generateExcel" severity="success" />
                <Button v-if="!isGenerating" label="PDF作成" @click="generatePdf" />
            </div>
        </div>
    </Dialog>
</template>
<script setup>
// Vue
import { ref, computed, watch, onMounted } from "vue";
import { Card, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, FloatLabel, DatePicker, InputText, Textarea, Button, Badge, Dialog } from 'primevue';

// Stores
import { useBillingStore } from '@/composables/useBillingStore';
const { billedList, fetchBilledListView, generateInvoicePdf, generateInvoiceExcel } = useBillingStore();
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId } = useHotelStore();

// Helper
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const translateStatus = (status) => {
    const statusMap = {
        "draft": "下書き",
        "sent": "送信済み",
        "paid": "支払い済み",
        "cancelled": "キャンセル",
    };
    return statusMap[status] || status;
};
const translatePreference = (preference) => {
    const preferenceMap = {
        "paper": "紙請求希望",
        "digital": "電子請求希望",
    };
    return preferenceMap[preference] || preference;
};
const severityPreference = (preference) => {
    const preferenceMap = {
        "paper": "warn",
        "digital": "info",
    };
    return preferenceMap[preference] || preference;
};
function getAdjustedDueDate(dateStr) {
    const baseDate = new Date(dateStr);
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();

    // Last day of the next month
    let dueDate = new Date(year, month + 2, 0);

    // Adjust if Saturday (6) or Sunday (0)
    const dayOfWeek = dueDate.getDay();
    if (dayOfWeek === 6) {
        // Saturday → add 2 days
        dueDate.setDate(dueDate.getDate() + 2);
    } else if (dayOfWeek === 0) {
        // Sunday → add 1 day
        dueDate.setDate(dueDate.getDate() + 1);
    }

    return formatDate(dueDate);
};
const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const selectedDate = new Date(selectedMonth.value);
    
    // Reset time to midnight for consistent day-based calculations
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const nextMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    
    // Reset time to midnight for month boundaries
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(0, 0, 0, 0);
    nextMonthStart.setHours(0, 0, 0, 0);

    // Adjust dates to be within the selected month
    const startDate = start < monthStart ? monthStart : start;
    // Use first day of next month if checkout extends beyond current month
    const endDate = end > monthEnd ? nextMonthStart : end;

    // Calculate nights - difference between dates (not inclusive of check-out date)
    const nights = Math.max(0, (endDate - startDate) / (1000 * 60 * 60 * 24));

    return nights;
};
const formatCurrency = (value) => {
    return value ? value.toLocaleString() + ' 円' : '0 円';
};

// Page Setting
const selectedMonth = ref(new Date());
selectedMonth.value.setMonth(selectedMonth.value.getMonth() - 1);
const summarizedBilledList = computed(() => {
    if (!billedList.value) {
        return [];
    }

    const summary = {};
    for (const item of billedList.value) {
        const key = `${item.id}-${item.invoice_number}-${item.date}-${item.client_id}`;
        if (!summary[key]) {
            summary[key] = {
                id: item.id,
                hotel_id: item.hotel_id,
                facility_name: item.facility_name,
                bank_name: item.bank_name,
                bank_branch_name: item.bank_branch_name,
                bank_account_type: item.bank_account_type,
                bank_account_number: item.bank_account_number,
                bank_account_name: item.bank_account_name,
                client_id: item.client_id,
                customer_code: item.customer_code,
                invoice_number: item.invoice_number,
                date: formatDate(new Date(item.date)),
                status: item.status,
                client_name: item.client_name,
                client_kanji: item.client_kanji,
                client_kana: item.client_kana,
                legal_or_natural_person: item.legal_or_natural_person,
                billing_preference: item.billing_preference,
                total_people: parseFloat(item.total_people),
                stays_count: parseFloat(item.stays_count),
                total_value: parseFloat(item.value),
                details: [
                    {
                        id: item.id,
                        client_id: item.client_id,
                        date: formatDate(new Date(item.date)),
                        check_in: formatDate(new Date(item.check_in)),
                        check_out: formatDate(new Date(item.check_out)),
                        reservation_id: item.reservation_id,
                        room_type_name: item.room_type_name,
                        room_number: item.room_number,
                        comment: item.payment_comment,
                        value: parseFloat(item.value),
                        details: item.reservation_details_json,
                        rates: item.reservation_rates_json,
                    },
                ],
                display_name: item.display_name,
                due_date: item.due_date ? formatDate(new Date(item.due_date)) : getAdjustedDueDate(item.date),
                total_stays: parseFloat(item.total_stays || item.stays_count),
                comment: item.comment,
            };
        } else {
            summary[key].total_people += parseFloat(item.total_people);
            summary[key].stays_count += parseFloat(item.stays_count);
            summary[key].total_value += parseFloat(item.value);

            summary[key].details.push({
                id: item.id,
                hotel_id: item.hotel_id,
                facility_name: item.facility_name,
                bank_name: item.bank_name,
                bank_branch_name: item.bank_branch_name,
                bank_account_type: item.bank_account_type,
                bank_account_number: item.bank_account_number,
                bank_account_name: item.bank_account_name,
                client_id: item.client_id,
                date: formatDate(new Date(item.date)),
                check_in: formatDate(new Date(item.check_in)),
                check_out: formatDate(new Date(item.check_out)),
                reservation_id: item.reservation_id,
                room_type_name: item.room_type_name,
                room_number: item.room_number,
                comment: item.payment_comment,
                value: parseFloat(item.value),
                details: item.reservation_details_json,
                rates: item.reservation_rates_json,
            });
        }
    }
    return Object.values(summary).sort((a, b) => b.total_value - a.total_value);
});

// Dialog
const isGenerating = ref(false);
const displayInvoiceDialog = ref(false);
const invoiceData = ref({});
const invoiceDBData = ref({});
const openInvoiceDialog = (data) => {
    console.log('openInvoiceDialog', data)
    let allRoomComments = '';
    const groupedRates = {};
    const dateGroups = new Map(); // To group by date ranges

    // First pass: Collect all rooms and group by date ranges
    data.details.forEach(block => {
        const roomNumber = block.room_number;
        const checkIn = block.check_in;
        const checkOut = block.check_out;

        const start = new Date(checkIn);
        // Subtract 1 day from check-out since it's treated as a stay date
        const end = new Date(checkOut);
        end.setDate(end.getDate() - 1);
        
        const selectedDate = new Date(selectedMonth.value);
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

        console.log('Original dates:', { checkIn, checkOut });
        console.log('Adjusted end date (check-out - 1):', end);
        console.log('Month range:', { monthStart, monthEnd });

        // Adjust dates to be within the selected month
        const startDate = start < monthStart ? monthStart : start;
        const endDate = end > monthEnd ? monthEnd : end;
        
        console.log('Adjusted dates for month:', { startDate, endDate });
        
        // Calculate nights for this period (inclusive of both dates)
        const nights = Math.max(0, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
        console.log('Calculated nights:', nights);

        // Use adjusted dates for grouping
        const adjustedCheckIn = formatDate(startDate);
        const adjustedCheckOut = formatDate(endDate);
        const dateKey = `${adjustedCheckIn} - ${adjustedCheckOut}`;

        if (nights > 0) {  // Only add if there are nights in this month
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, {
                    checkIn: adjustedCheckIn,
                    checkOut: adjustedCheckOut,
                    rooms: 0,
                    nights: nights
                });
            } else {
                // If this date range already exists, add the nights for this block
                dateGroups.get(dateKey).nights += nights;
            }

            const group = dateGroups.get(dateKey);
            group.rooms += 1;
            console.log('Updated group:', { dateKey, group });
        }
    });

    // Format the date groups into the required string with line breaks
    const formattedDateGroups = Array.from(dateGroups.values())
        .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
        .map(group => {
            const formattedCheckIn = group.checkIn.replace(/-/g, '/');
            const formattedCheckOut = group.checkOut.replace(/-/g, '/');
            return `・滞在期間：${formattedCheckIn} ～ ${formattedCheckOut} 、${group.rooms}名、宿泊日数：${group.nights}泊`;
        })
        .join('\r\n');  // Use \r\n for Windows line endings

    // Second pass: Group by tax rates for the invoice items
    data.details.forEach(block => {
        const comment = block.payment_comment ? block.payment_comment.replace(/\n/g, '<br/>') : '';
        const rate = block.tax_rate || 0.1;

        if (!groupedRates[rate]) {
            groupedRates[rate] = {
                tax_rate: rate,
                total_net_price: 0,
                total_price: 0
            };
        }

        groupedRates[rate].total_price += block.value;
    });

    // Calculate total net price based on total gross price for each rate
    for (const rate in groupedRates) {
        const grossTotal = groupedRates[rate].total_price;
        groupedRates[rate].total_net_price = Math.floor(grossTotal / (1 + parseFloat(rate)));
    }

    invoiceData.value = {
        id: data.id,
        hotel_id: data.hotel_id,
        facility_name: data.facility_name,
        bank_name: data.bank_name,
        bank_branch_name: data.bank_branch_name,
        bank_account_type: data.bank_account_type,
        bank_account_number: data.bank_account_number,
        bank_account_name: data.bank_account_name,
        invoice_number: data.invoice_number,
        date: data.date,
        due_date: data.due_date,
        client_id: data.client_id,
        customer_code: data.customer_code || '',
        client_name: data.display_name,
        invoice_total_stays: data.stays_count,
        invoice_total_value: data.total_value,
        items: Object.values(groupedRates),
        comment: data.comment,
    };

    invoiceDBData.value = {
        ...invoiceData.value,
        due_date: getAdjustedDueDate(data.date),
        client_name: data.client_kanji || data.client_name,
        invoice_total_stays: data.stays_count,
        comment: `【宿泊明細】\r\n${formattedDateGroups}`,
    };

    console.log('openInvoiceDialog invoiceData', invoiceData.value);
    console.log('openInvoiceDialog invoiceDBData', invoiceDBData.value);

    displayInvoiceDialog.value = true;
};
const generatePdf = async () => {
    isGenerating.value = true;
    //  Trigger server-side PDF generation        
    console.log('Generate PDF clicked', invoiceData.value);
    await generateInvoicePdf(invoiceData.value.hotel_id, invoiceData.value.invoice_number, invoiceData.value);

    await fetchBilledListView(selectedHotelId.value, formatDate(new Date(selectedMonth.value)));
    isGenerating.value = false;
    displayInvoiceDialog.value = false;
};

const generateExcel = async () => {
    isGenerating.value = true;
    //  Trigger server-side Excel generation
    console.log('Generate Excel clicked', invoiceData.value);
    await generateInvoiceExcel(invoiceData.value.hotel_id, invoiceData.value.invoice_number, invoiceData.value);

    await fetchBilledListView(selectedHotelId.value, formatDate(new Date(selectedMonth.value)));
    isGenerating.value = false;
    displayInvoiceDialog.value = false;
};

watch([selectedHotelId, selectedMonth], async ([newHotelId, newMonth]) => {
    if (newHotelId && newMonth) {
        await fetchBilledListView(newHotelId, formatDate(newMonth));
        console.log("Summarized Billed List:", summarizedBilledList.value);
    }
}, { immediate: true }
);


</script>
