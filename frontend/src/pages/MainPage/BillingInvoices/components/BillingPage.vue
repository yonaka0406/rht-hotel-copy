<template>
    <div class="min-h-screen p-2">
        <div v-if="isGenerating" class="flex justify-center items-center h-96">
            <ProgressSpinner />
        </div>
        <div v-else>
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
                            <AccordionPanel v-for="group in summarizedBilledList" :key="group.id" :value="group.id">
                                <AccordionHeader>
                                    <div class="grid grid-cols-6 gap-4 w-full">
                                        <div class="col-span-3 text-left">
                                            {{ `${group.client_kanji || group.client_name}` }}
                                            <small>{{ `${group.client_kana ? '(' + group.client_kana + ')' : ''}`
                                            }}</small>
                                        </div>
                                        <div class="flex items-center justify-center">
                                            {{ group.total_value.toLocaleString() }} 円
                                        </div>
                                        <div class="col-span-2 text-right mr-4">
                                            <Badge :severity="severityPreference(group.billing_preference)"
                                                class="mr-2"> {{
                                                    translatePreference(group.billing_preference) }}</Badge>
                                            <Badge v-if="group.invoice_number" severity="contrast" class="mr-2">{{
                                                group.invoice_number }}</Badge>
                                            <Badge severity="secondary" class="mr-2">{{
                                                translateBillingStatus(group.status) }}
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
                                                <span>{{ slotProps.data.check_in }}～{{ slotProps.data.check_out
                                                }}</span>
                                            </template>
                                        </Column>
                                        <Column field="room_type_name" header="部屋タイプ"></Column>
                                        <Column field="room_number" header="部屋番号" style="text-align: center;"></Column>
                                        <Column header="人数" style="text-align: center;">
                                            <template #body="slotProps">
                                                {{ slotProps.data.total_people }}
                                            </template>
                                        </Column>
                                        <Column header="宿泊日数" style="text-align: center;">
                                            <template #body="slotProps">
                                                {{ calculateNights(slotProps.data) }}泊
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
    </div>

    <InvoiceCreateDialog
        v-model:visible="displayInvoiceDialog"
        :invoiceData="invoiceData"
        :invoiceDBData="invoiceDBData"
        :isGenerating="isGenerating"
        @generateExcel="generateExcel"
        @generatePdf="generatePdf"
    />
</template>
<script setup>
// Vue
import { ref, computed, watch } from "vue";
import { Card, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, DatePicker, Button, Badge, ProgressSpinner } from 'primevue';
import InvoiceCreateDialog from './dialogs/InvoiceCreateDialog.vue';

// Stores
import { useBillingStore } from '@/composables/useBillingStore';
const { billedList, fetchBilledListView, generateInvoicePdf, generateInvoiceExcel, isGenerating } = useBillingStore();
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
const translateBillingStatus = (status) => {
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
const calculateNights = (reservationDetails) => {
    if (!reservationDetails || !reservationDetails.details) {
        return 0;
    }
    const selectedDate = new Date(selectedMonth.value);
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    let nights = 0;
    const targetRoomId = reservationDetails.room_id;

    reservationDetails.details.forEach(day => {
        // Only count days for the specific room if a room_id is associated with this invoice row
        if (targetRoomId && day.room_id !== targetRoomId) {
            return;
        }

        const [year, month, d] = day.date.split('-').map(Number);
        const stayDate = new Date(year, month - 1, d);
        if (!day.cancelled && stayDate >= monthStart && stayDate <= monthEnd) {
            nights++;
        }
    });
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
                        room_id: item.room_id,
                        room_type_name: item.room_type_name,
                        room_number: item.room_number,
                        comment: item.payment_comment,
                        value: parseFloat(item.value),
                        details: item.reservation_details_json,
                        rates: item.reservation_rates_json,
                        total_people: item.total_people
                    },
                ],
                display_name: item.display_name,
                due_date: item.due_date ? formatDate(new Date(item.due_date)) : getAdjustedDueDate(item.date),
                total_stays: parseFloat(item.total_stays || item.stays_count),
                comment: item.comment,
                _seenResIds: new Set([item.reservation_id]) // Internal tracker for deduplication
            };
        } else {
            // Only add people and stays if this reservation hasn't been seen in this invoice group yet
            // This prevents double-counting if an invoice has multiple payments for the same reservation
            if (!summary[key]._seenResIds.has(item.reservation_id)) {
                summary[key].total_people += parseFloat(item.total_people);
                summary[key].stays_count += parseFloat(item.stays_count);
                summary[key]._seenResIds.add(item.reservation_id);
            }
            
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
                room_id: item.room_id,
                room_type_name: item.room_type_name,
                room_number: item.room_number,
                comment: item.payment_comment,
                value: parseFloat(item.value),
                details: item.reservation_details_json,
                rates: item.reservation_rates_json,
                total_people: item.total_people
            });
        }
    }
    return Object.values(summary).sort((a, b) => b.total_value - a.total_value);
});

// Dialog
const displayInvoiceDialog = ref(false);
const invoiceData = ref({});
const invoiceDBData = ref({});
const openInvoiceDialog = (data) => {
    const selectedDate = new Date(selectedMonth.value);
    const invoiceDate = new Date(data.date);

    // If the selected month is different from the invoice month, create a new invoice
    if (selectedDate.getFullYear() !== invoiceDate.getFullYear() || selectedDate.getMonth() !== invoiceDate.getMonth()) {
        data.id = null;
        data.invoice_number = null;
    }

    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    // Deduplicate blocks by reservation_id to get month-level details and rates once per reservation
    const uniqueReservationBlocks = [];
    const seenResIds = new Set();
    data.details.forEach(block => {
        if (!seenResIds.has(block.reservation_id)) {
            seenResIds.add(block.reservation_id);
            uniqueReservationBlocks.push(block);
        }
    });

    const allDailyDetails = uniqueReservationBlocks.flatMap(block => block.details || []);
    const relevantDailyDetails = allDailyDetails.filter(day => {
        const [year, month, d] = day.date.split('-').map(Number);
        const stayDate = new Date(year, month - 1, d);
        return stayDate >= monthStart && stayDate <= monthEnd;
    });

    const stayDetailsByDate = {};
    const cancellationsByDate = {};
    let totalCancellationFees = 0;

    relevantDailyDetails.forEach(day => {
        const dateStr = formatDate(new Date(day.date));
        
        if (day.cancelled && day.billable) {
            totalCancellationFees++;
            if (!cancellationsByDate[dateStr]) {
                cancellationsByDate[dateStr] = 0;
            }
            cancellationsByDate[dateStr] += day.number_of_people;
        } else if (!day.cancelled) {
            if (!stayDetailsByDate[dateStr]) {
                stayDetailsByDate[dateStr] = 0;
            }
            stayDetailsByDate[dateStr] += day.number_of_people;
        }
    });

    // ... (stay periods logic remains same) ...
    // Get all dates (both stay and cancellation dates) and sort them
    const allDates = [...new Set([...Object.keys(stayDetailsByDate), ...Object.keys(cancellationsByDate)])].sort();
    const stayPeriods = [];
    
    if (allDates.length > 0) {
        // Create a working copy of people count per date
        const workingPeopleByDate = { ...stayDetailsByDate };
        
        // Find consecutive date groups and process them
        while (Object.values(workingPeopleByDate).some(count => count > 0)) {
            // Find consecutive date ranges (including gaps with cancellations)
            const consecutiveGroups = [];
            let i = 0;
            
            while (i < allDates.length) {
                if (workingPeopleByDate[allDates[i]] > 0) {
                    let groupStart = allDates[i];
                    let groupEnd = allDates[i];
                    let groupDates = [allDates[i]];
                    
                    // Find consecutive dates (including cancelled dates in between)
                    let j = i + 1;
                    while (j < allDates.length) {
                        const [currentYear, currentMonth, currentDay] = allDates[j].split('-').map(Number);
                        const currentDate = new Date(currentYear, currentMonth - 1, currentDay);
                        
                        const [prevYear, prevMonth, prevDay] = allDates[j - 1].split('-').map(Number);
                        const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
                        
                        const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
                        
                        if (diff === 1) {
                            groupEnd = allDates[j];
                            groupDates.push(allDates[j]);
                            j++;
                        } else {
                            break;
                        }
                    }
                    
                    consecutiveGroups.push({
                        start: groupStart,
                        end: groupEnd,
                        dates: groupDates
                    });
                    
                    i = j;
                } else {
                    i++;
                }
            }
            
            // Process each consecutive group
            consecutiveGroups.forEach(group => {
                // Find minimum number of people in this group (only from non-cancelled dates)
                const nonCancelledDates = group.dates.filter(date => workingPeopleByDate[date] > 0);
                
                if (nonCancelledDates.length > 0) {
                    const minPeople = Math.min(...nonCancelledDates.map(date => workingPeopleByDate[date]));
                    
                    if (minPeople > 0) {
                        // Calculate total nights and cancellation nights for this period
                        const totalNights = minPeople * nonCancelledDates.length;
                        
                        // Create entry for actual stay nights
                        const actualStayStart = nonCancelledDates[0];
                        const actualStayEnd = nonCancelledDates[nonCancelledDates.length - 1];
                        
                        stayPeriods.push({
                            start: actualStayStart,
                            end: actualStayEnd,
                            people: minPeople,
                            totalNights: totalNights,
                            type: 'stay'
                        });
                        
                        // Create separate entry for cancellation fees if any
                        const cancellationDates = group.dates.filter(date => 
                            cancellationsByDate[date] && cancellationsByDate[date] >= minPeople
                        );
                        
                        if (cancellationDates.length > 0) {
                            const cancellationStart = cancellationDates[0];
                            const cancellationEnd = cancellationDates[cancellationDates.length - 1];
                            const cancellationNights = minPeople * cancellationDates.length;
                            
                            stayPeriods.push({
                                start: cancellationStart,
                                end: cancellationEnd,
                                people: minPeople,
                                totalNights: cancellationNights,
                                type: 'cancellation'
                            });
                        }
                        
                        // Subtract min people from each non-cancelled date in the group
                        nonCancelledDates.forEach(date => {
                            workingPeopleByDate[date] -= minPeople;
                        });
                    }
                }
            });
        }
    }

    // Sort periods by start date, then by end date, then by people count (descending)
    stayPeriods.sort((a, b) => {
        const startCompare = new Date(a.start) - new Date(b.start);
        if (startCompare !== 0) return startCompare;
        
        const endCompare = new Date(a.end) - new Date(b.end);
        if (endCompare !== 0) return endCompare;
        
        return b.people - a.people;
    });

    const formattedDateGroups = stayPeriods.map(period => {
        // Convert end date to check-out date (add 1 day)
        const endDate = new Date(period.end);
        const checkOutDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        const checkOutDateStr = formatDate(checkOutDate);
        
        // Use different text for cancellation vs stay periods
        const nightsLabel = period.type === 'cancellation' ? 'キャンセル料' : '宿泊日数';
        const nightsUnit = period.type === 'cancellation' ? '泊' : '泊';
        
        return `・滞在期間：${period.start.replace(/-/g, '/')} ～ ${checkOutDateStr.replace(/-/g, '/')} 、${period.people}名、${nightsLabel}：${period.totalNights}${nightsUnit}`;
    }).join('\r\n');

    // Check if there are any remaining cancellation fees not accounted for in periods
    const accountedCancellations = stayPeriods.filter(p => p.type === 'cancellation').reduce((sum, period) => sum + period.totalNights, 0);
    const remainingCancellations = totalCancellationFees - accountedCancellations;
    
    let cancellationComment = '';
    if (remainingCancellations > 0) {
        cancellationComment = `・キャンセル料：${remainingCancellations}日分`;
    }

    const finalComment = `【宿泊明細】\r\n${formattedDateGroups}${formattedDateGroups && cancellationComment ? '\r\n' : ''}${cancellationComment}`;

    // Aggregation Logic for Tax Rates
    const groupedRates = {};
    let hasBackendRateData = false;

    // 1. Sum up from backend provided 'rates' (reservation_rates_json)
    uniqueReservationBlocks.forEach(block => {
        if (block.rates && Array.isArray(block.rates) && block.rates.length > 0) {
            hasBackendRateData = true;
            block.rates.forEach(rateItem => {
                const taxRate = rateItem.tax_rate;
                if (!groupedRates[taxRate]) {
                    groupedRates[taxRate] = { tax_rate: taxRate, total_net_price: 0, total_price: 0 };
                }
                groupedRates[taxRate].total_price += Number(rateItem.total_price);
                groupedRates[taxRate].total_net_price += Number(rateItem.total_net_price);
            });
        }
    });

    // 2. Fallback logic: If no backend rate data found at all, estimate based on payment values (default 10%)
    if (!hasBackendRateData) {
        data.details.forEach(block => {
            const rate = block.tax_rate || 0.1;
            if (!groupedRates[rate]) {
                groupedRates[rate] = { tax_rate: rate, total_net_price: 0, total_price: 0 };
            }
            groupedRates[rate].total_price += block.value;
        });

        for (const rate in groupedRates) {
            const grossTotal = groupedRates[rate].total_price;
            // Using Math.round to match backend ROUND logic
            groupedRates[rate].total_net_price = Math.round(grossTotal / (1 + parseFloat(rate)));
        }
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
        items: Object.values(groupedRates).sort((a, b) => b.tax_rate - a.tax_rate),
        comment: data.comment,
        daily_details: relevantDailyDetails,
    };
    return Object.values(summary).sort((a, b) => b.total_value - a.total_value);
});

// Dialog
const displayInvoiceDialog = ref(false);
const invoiceData = ref({});
const invoiceDBData = ref({});
const openInvoiceDialog = (data) => {
    const selectedDate = new Date(selectedMonth.value);
    const invoiceDate = new Date(data.date);

    // If the selected month is different from the invoice month, create a new invoice
    if (selectedDate.getFullYear() !== invoiceDate.getFullYear() || selectedDate.getMonth() !== invoiceDate.getMonth()) {
        data.id = null;
        data.invoice_number = null;
    }

    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    // Deduplicate blocks by reservation_id to get month-level details and rates once per reservation
    const uniqueReservationBlocks = [];
    const seenResIds = new Set();
    data.details.forEach(block => {
        if (!seenResIds.has(block.reservation_id)) {
            seenResIds.add(block.reservation_id);
            uniqueReservationBlocks.push(block);
        }
    });

    const allDailyDetails = uniqueReservationBlocks.flatMap(block => block.details || []);
    const relevantDailyDetails = allDailyDetails.filter(day => {
        const [year, month, d] = day.date.split('-').map(Number);
        const stayDate = new Date(year, month - 1, d);
        return stayDate >= monthStart && stayDate <= monthEnd;
    });

    const stayDetailsByDate = {};
    const cancellationsByDate = {};
    let totalCancellationFees = 0;

    relevantDailyDetails.forEach(day => {
        const dateStr = formatDate(new Date(day.date));
        
        if (day.cancelled && day.billable) {
            totalCancellationFees++;
            if (!cancellationsByDate[dateStr]) {
                cancellationsByDate[dateStr] = 0;
            }
            cancellationsByDate[dateStr] += day.number_of_people;
        } else if (!day.cancelled) {
            if (!stayDetailsByDate[dateStr]) {
                stayDetailsByDate[dateStr] = 0;
            }
            stayDetailsByDate[dateStr] += day.number_of_people;
        }
    });

    // ... (stay periods logic remains same) ...
    // Get all dates (both stay and cancellation dates) and sort them
    const allDates = [...new Set([...Object.keys(stayDetailsByDate), ...Object.keys(cancellationsByDate)])].sort();
    const stayPeriods = [];
    
    if (allDates.length > 0) {
        // Create a working copy of people count per date
        const workingPeopleByDate = { ...stayDetailsByDate };
        
        // Find consecutive date groups and process them
        while (Object.values(workingPeopleByDate).some(count => count > 0)) {
            // Find consecutive date ranges (including gaps with cancellations)
            const consecutiveGroups = [];
            let i = 0;
            
            while (i < allDates.length) {
                if (workingPeopleByDate[allDates[i]] > 0) {
                    let groupStart = allDates[i];
                    let groupEnd = allDates[i];
                    let groupDates = [allDates[i]];
                    
                    // Find consecutive dates (including cancelled dates in between)
                    let j = i + 1;
                    while (j < allDates.length) {
                        const [currentYear, currentMonth, currentDay] = allDates[j].split('-').map(Number);
                        const currentDate = new Date(currentYear, currentMonth - 1, currentDay);
                        
                        const [prevYear, prevMonth, prevDay] = allDates[j - 1].split('-').map(Number);
                        const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
                        
                        const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
                        
                        if (diff === 1) {
                            groupEnd = allDates[j];
                            groupDates.push(allDates[j]);
                            j++;
                        } else {
                            break;
                        }
                    }
                    
                    consecutiveGroups.push({
                        start: groupStart,
                        end: groupEnd,
                        dates: groupDates
                    });
                    
                    i = j;
                } else {
                    i++;
                }
            }
            
            // Process each consecutive group
            consecutiveGroups.forEach(group => {
                // Find minimum number of people in this group (only from non-cancelled dates)
                const nonCancelledDates = group.dates.filter(date => workingPeopleByDate[date] > 0);
                
                if (nonCancelledDates.length > 0) {
                    const minPeople = Math.min(...nonCancelledDates.map(date => workingPeopleByDate[date]));
                    
                    if (minPeople > 0) {
                        // Calculate total nights and cancellation nights for this period
                        const totalNights = minPeople * nonCancelledDates.length;
                        
                        // Create entry for actual stay nights
                        const actualStayStart = nonCancelledDates[0];
                        const actualStayEnd = nonCancelledDates[nonCancelledDates.length - 1];
                        
                        stayPeriods.push({
                            start: actualStayStart,
                            end: actualStayEnd,
                            people: minPeople,
                            totalNights: totalNights,
                            type: 'stay'
                        });
                        
                        // Create separate entry for cancellation fees if any
                        const cancellationDates = group.dates.filter(date => 
                            cancellationsByDate[date] && cancellationsByDate[date] >= minPeople
                        );
                        
                        if (cancellationDates.length > 0) {
                            const cancellationStart = cancellationDates[0];
                            const cancellationEnd = cancellationDates[cancellationDates.length - 1];
                            const cancellationNights = minPeople * cancellationDates.length;
                            
                            stayPeriods.push({
                                start: cancellationStart,
                                end: cancellationEnd,
                                people: minPeople,
                                totalNights: cancellationNights,
                                type: 'cancellation'
                            });
                        }
                        
                        // Subtract min people from each non-cancelled date in the group
                        nonCancelledDates.forEach(date => {
                            workingPeopleByDate[date] -= minPeople;
                        });
                    }
                }
            });
        }
    }

    // Sort periods by start date, then by end date, then by people count (descending)
    stayPeriods.sort((a, b) => {
        const startCompare = new Date(a.start) - new Date(b.start);
        if (startCompare !== 0) return startCompare;
        
        const endCompare = new Date(a.end) - new Date(b.end);
        if (endCompare !== 0) return endCompare;
        
        return b.people - a.people;
    });

    const formattedDateGroups = stayPeriods.map(period => {
        // Convert end date to check-out date (add 1 day)
        const endDate = new Date(period.end);
        const checkOutDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
        const checkOutDateStr = formatDate(checkOutDate);
        
        // Use different text for cancellation vs stay periods
        const nightsLabel = period.type === 'cancellation' ? 'キャンセル料' : '宿泊日数';
        const nightsUnit = period.type === 'cancellation' ? '泊' : '泊';
        
        return `・滞在期間：${period.start.replace(/-/g, '/')} ～ ${checkOutDateStr.replace(/-/g, '/')} 、${period.people}名、${nightsLabel}：${period.totalNights}${nightsUnit}`;
    }).join('\r\n');

    // Check if there are any remaining cancellation fees not accounted for in periods
    const accountedCancellations = stayPeriods.filter(p => p.type === 'cancellation').reduce((sum, period) => sum + period.totalNights, 0);
    const remainingCancellations = totalCancellationFees - accountedCancellations;
    
    let cancellationComment = '';
    if (remainingCancellations > 0) {
        cancellationComment = `・キャンセル料：${remainingCancellations}日分`;
    }

    const finalComment = `【宿泊明細】\r\n${formattedDateGroups}${formattedDateGroups && cancellationComment ? '\r\n' : ''}${cancellationComment}`;

    // Aggregation Logic for Tax Rates
    const groupedRates = {};
    let hasBackendRateData = false;

    console.log('Aggregating tax rates for invoice. Input blocks:', uniqueReservationBlocks);

    // 1. Sum up from backend provided 'rates' (reservation_rates_json)
    uniqueReservationBlocks.forEach(block => {
        if (block.rates && Array.isArray(block.rates) && block.rates.length > 0) {
            hasBackendRateData = true;
            block.rates.forEach(rateItem => {
                const taxRate = rateItem.tax_rate;
                if (!groupedRates[taxRate]) {
                    groupedRates[taxRate] = { tax_rate: taxRate, total_net_price: 0, total_price: 0 };
                }
                groupedRates[taxRate].total_price += Number(rateItem.total_price);
                groupedRates[taxRate].total_net_price += Number(rateItem.total_net_price);
            });
        }
    });

    // 2. Fallback logic: If no backend rate data found at all, estimate based on payment values (default 10%)
    if (!hasBackendRateData) {
        console.warn('No backend rate data found. Falling back to payment-based estimation.');
        data.details.forEach(block => {
            const rate = block.tax_rate || 0.1;
            if (!groupedRates[rate]) {
                groupedRates[rate] = { tax_rate: rate, total_net_price: 0, total_price: 0 };
            }
            groupedRates[rate].total_price += block.value;
        });

        for (const rate in groupedRates) {
            const grossTotal = groupedRates[rate].total_price;
            // Using Math.round to match backend ROUND logic
            groupedRates[rate].total_net_price = Math.round(grossTotal / (1 + parseFloat(rate)));
        }
    }

    console.log('Final grouped rates:', groupedRates);

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
        items: Object.values(groupedRates).sort((a, b) => b.tax_rate - a.tax_rate),
        comment: data.comment,
        daily_details: relevantDailyDetails,
    };

    invoiceDBData.value = {
        ...invoiceData.value,
        due_date: getAdjustedDueDate(data.date),
        client_name: data.client_kanji || data.client_name,
        invoice_total_stays: data.stays_count,
        comment: finalComment,
    };

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
    // console.log('Generate Excel clicked', invoiceData.value);
    await generateInvoiceExcel(invoiceData.value.hotel_id, invoiceData.value.invoice_number, invoiceData.value);

    await fetchBilledListView(selectedHotelId.value, formatDate(new Date(selectedMonth.value)));
    isGenerating.value = false;
    displayInvoiceDialog.value = false;
};

watch([selectedHotelId, selectedMonth], async ([newHotelId, newMonth]) => {
    if (newHotelId && newMonth) {
        await fetchBilledListView(newHotelId, formatDate(newMonth));
        // console.log("Summarized Billed List:", summarizedBilledList.value);
    }
}, { immediate: true }
);


</script>