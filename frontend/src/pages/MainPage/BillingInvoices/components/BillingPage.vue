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
                                        <Column header="詳細" style="text-align: center; width: 4rem">
                                            <template #body="slotProps">
                                                <a :href="`/reservations/edit/${slotProps.data.reservation_id}`"
                                                    target="_blank" rel="noopener noreferrer"
                                                    class="text-blue-600 hover:text-blue-800">
                                                    <i class="pi pi-external-link"></i>
                                                </a>
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

    <InvoiceCreateDialog v-model:visible="displayInvoiceDialog" :invoiceData="invoiceData"
        :invoiceDBData="invoiceDBData" :isGenerating="isGenerating" @generateExcel="generateExcel"
        @generatePdf="generatePdf" />
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

// Utils
import { formatDate } from '@/utils/dateUtils';

// Helper
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

    // 請求書支払いのみをフィルタリング
    const invoiceOnlyItems = billedList.value.filter(item => 
        item.payment_type_name === '請求書' || 
        item.payment_type_transaction === 'invoice'
    );

    // 元のグループ化ロジックを適用（請求書支払いのみ）
    const summary = {};
    for (const item of invoiceOnlyItems) {
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
                        payment_type_name: item.payment_type_name,
                        payment_type_transaction: item.payment_type_transaction,
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
                payment_type_name: item.payment_type_name,
                payment_type_transaction: item.payment_type_transaction,
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

    // 請求書作成ダイアログでは全支払方法のデータを取得
    // 同じクライアント・同じ月の全支払いを取得
    console.log('DEBUG: Original data:', data);
    console.log('DEBUG: billedList.value length:', billedList.value.length);
    
    // 紋別バイオマス発電株式会社のデータを詳しく確認
    const clientPayments = billedList.value.filter(item => 
        item.client_id === data.client_id
    );
    console.log('DEBUG: All payments for this client (count):', clientPayments.length);
    
    // 各支払いの詳細を確認
    clientPayments.forEach((item, index) => {
        console.log(`DEBUG: Payment ${index}:`, {
            id: item.id,
            client_id: item.client_id,
            date: formatDate(new Date(item.date)),
            value: item.value,
            payment_type_name: item.payment_type_name,
            payment_type_transaction: item.payment_type_transaction,
            reservation_id: item.reservation_id
        });
    });
    
    // 同じ予約IDの全支払いを取得（支払方法に関係なく）
    const sameReservationPayments = billedList.value.filter(item => 
        clientPayments.some(cp => cp.reservation_id === item.reservation_id)
    );
    
    console.log('DEBUG: Same reservation payments (count):', sameReservationPayments.length);
    sameReservationPayments.forEach((item, index) => {
        console.log(`DEBUG: Same reservation payment ${index}:`, {
            id: item.id,
            client_id: item.client_id,
            date: formatDate(new Date(item.date)),
            value: item.value,
            payment_type_name: item.payment_type_name,
            payment_type_transaction: item.payment_type_transaction,
            reservation_id: item.reservation_id
        });
    });
    
    const allPaymentsForClient = sameReservationPayments;
    
    console.log('DEBUG: allPaymentsForClient:', allPaymentsForClient);
    console.log('DEBUG: Filter criteria - client_id:', data.client_id, 'date:', data.date);

    // 全支払方法を含むデータを再構築（支払い方法ごとに個別のエントリを保持）
    const allPaymentData = {
        ...data,
        details: allPaymentsForClient.map(item => ({
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
            payment_type_name: item.payment_type_name,
            payment_type_transaction: item.payment_type_transaction,
            details: item.reservation_details_json,
            rates: item.reservation_rates_json,
            total_people: item.total_people
        }))
    };
    
    console.log('DEBUG: allPaymentData.details:', allPaymentData.details);

    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    // Deduplicate blocks by reservation_id to get month-level details and rates once per reservation
    const uniqueReservationBlocks = [];
    const seenResIds = new Set();
    allPaymentData.details.forEach(block => {
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

    // Get all dates (both stay and cancellation dates) and sort them
    const allDates = [...new Set([...Object.keys(stayDetailsByDate), ...Object.keys(cancellationsByDate)])].sort();
    const stayPeriods = [];

    // Create a working copy of people count per date
    const workingPeopleByDate = { ...stayDetailsByDate };
    const workingCancellationsByDate = { ...cancellationsByDate };

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
                    // We only use cancellations that are "available" in workingCancellationsByDate
                    const cancellationDates = group.dates.filter(date =>
                        workingCancellationsByDate[date] && workingCancellationsByDate[date] >= minPeople
                    );

                    if (cancellationDates.length > 0) {
                        // Group consecutive cancellation dates
                        let k = 0;
                        while (k < cancellationDates.length) {
                            let cStart = cancellationDates[k];
                            let cEnd = cancellationDates[k];
                            let cCount = 1;
                            let l = k + 1;

                            // Look ahead for consecutive dates
                            while (l < cancellationDates.length) {
                                const [cYear, cMonth, cDay] = cancellationDates[l].split('-').map(Number);
                                const cDate = new Date(cYear, cMonth - 1, cDay);
                                const [pYear, pMonth, pDay] = cancellationDates[l - 1].split('-').map(Number);
                                const pDate = new Date(pYear, pMonth - 1, pDay);

                                if ((cDate - pDate) / (1000 * 60 * 60 * 24) === 1) {
                                    cEnd = cancellationDates[l];
                                    cCount++;
                                    l++;
                                } else {
                                    break;
                                }
                            }

                            stayPeriods.push({
                                start: cStart,
                                end: cEnd,
                                people: minPeople,
                                totalNights: minPeople * cCount,
                                type: 'cancellation'
                            });

                            // Decrement available cancellations for these dates
                            for (let m = k; m < l; m++) {
                                workingCancellationsByDate[cancellationDates[m]] -= minPeople;
                            }

                            k = l;
                        }
                    }

                    // Subtract min people from each non-cancelled date in the group
                    nonCancelledDates.forEach(date => {
                        workingPeopleByDate[date] -= minPeople;
                    });
                }
            }
        });
    }

    // Process remaining cancellations (orphans or those not matching stay layers)
    while (Object.values(workingCancellationsByDate).some(count => count > 0)) {
        const consecutiveGroups = [];
        let i = 0;

        while (i < allDates.length) {
            if (workingCancellationsByDate[allDates[i]] > 0) {
                let groupStart = allDates[i];
                let groupEnd = allDates[i];
                let groupDates = [allDates[i]];

                let j = i + 1;
                while (j < allDates.length) {
                    const [currentYear, currentMonth, currentDay] = allDates[j].split('-').map(Number);
                    const currentDate = new Date(currentYear, currentMonth - 1, currentDay);

                    const [prevYear, prevMonth, prevDay] = allDates[j - 1].split('-').map(Number);
                    const prevDate = new Date(prevYear, prevMonth - 1, prevDay);

                    const diff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

                    if (diff === 1 && workingCancellationsByDate[allDates[j]] > 0) {
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

        consecutiveGroups.forEach(group => {
            if (group.dates.length > 0) {
                const minPeople = Math.min(...group.dates.map(date => workingCancellationsByDate[date]));

                if (minPeople > 0) {
                    stayPeriods.push({
                        start: group.start,
                        end: group.end,
                        people: minPeople,
                        totalNights: minPeople * group.dates.length,
                        type: 'cancellation'
                    });

                    group.dates.forEach(date => {
                        workingCancellationsByDate[date] -= minPeople;
                    });
                }
            }
        });
    }

    // Aggregation: Merge identical periods (same start, end, type)
    const aggregatedPeriods = [];
    const periodMap = new Map();

    stayPeriods.forEach(period => {
        const key = `${period.type}|${period.start}|${period.end}`;
        if (periodMap.has(key)) {
            const existing = periodMap.get(key);
            existing.people += period.people;
            existing.totalNights += period.totalNights;
        } else {
            // Clone the period to avoid reference issues
            const newPeriod = { ...period };
            periodMap.set(key, newPeriod);
            aggregatedPeriods.push(newPeriod);
        }
    });

    // Use the aggregated list for sorting and display
    const finalPeriods = aggregatedPeriods;

    // Sort periods by start date, then by end date, then by people count (descending)
    finalPeriods.sort((a, b) => {
        const startCompare = new Date(a.start) - new Date(b.start);
        if (startCompare !== 0) return startCompare;

        const endCompare = new Date(a.end) - new Date(b.end);
        if (endCompare !== 0) return endCompare;

        return b.people - a.people;
    });

    const formattedDateGroups = finalPeriods.map(period => {
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

    // Aggregation Logic for Tax Rates and Categories
    const groupedRates = {};
    let hasBackendRateData = false;

    console.log('Aggregating tax rates for invoice. Input blocks:', uniqueReservationBlocks);

    // 1. Sum up from backend provided 'rates' (reservation_rates_json)
    uniqueReservationBlocks.forEach(block => {
        if (block.rates && Array.isArray(block.rates) && block.rates.length > 0) {
            hasBackendRateData = true;
            block.rates.forEach(rateItem => {
                const taxRate = rateItem.tax_rate ?? 0; // Default to 0 if null/undefined
                const category = rateItem.category || 'accommodation';
                const itemName = rateItem.item_name || (category === 'accommodation' ? '宿泊料' : 'その他');
                const key = `${taxRate}-${category}-${itemName}`;

                if (!groupedRates[key]) {
                    groupedRates[key] = {
                        tax_rate: taxRate,
                        category: category,
                        name: itemName,
                        total_net_price: 0,
                        total_price: 0,
                        total_quantity: 0
                    };
                }
                groupedRates[key].total_price += Number(rateItem.total_price);
                groupedRates[key].total_net_price += Number(rateItem.total_net_price);
                groupedRates[key].total_quantity += Number(rateItem.total_quantity || 0);
            });
        }
    });

    // 2. Fallback logic: If no backend rate data found at all, estimate based on payment values (default 10%)
    if (!hasBackendRateData) {
        console.warn('No backend rate data found. Falling back to payment-based estimation.');
        data.details.forEach(block => {
            const rate = block.tax_rate || 0.1;
            const category = 'accommodation'; // Default to accommodation
            const itemName = '宿泊料';
            const key = `${rate}-${category}-${itemName}`;

            if (!groupedRates[key]) {
                groupedRates[key] = {
                    tax_rate: rate,
                    category: category,
                    name: itemName,
                    total_net_price: 0,
                    total_price: 0,
                    total_quantity: 0
                };
            }
            groupedRates[key].total_price += block.value;
            groupedRates[key].total_price += block.value;
            groupedRates[key].total_quantity += (data.invoice_total_stays || 1);

            // For 0% tax (or explicit 0 rate), Net Price should equal Total Price
            if (Number(rate) === 0) {
                groupedRates[key].total_net_price = groupedRates[key].total_price;
            }
        });

        for (const key in groupedRates) {
            const item = groupedRates[key];

            // Only calculate net price if it wasn't already set (e.g. for non-0% items)
            if (item.total_net_price === 0 && item.tax_rate !== 0) {
                const grossTotal = item.total_price;
                // Using Math.round to match backend ROUND logic
                item.total_net_price = Math.round(grossTotal / (1 + parseFloat(item.tax_rate)));
            }
        }
    }

    console.log('Final grouped rates:', groupedRates);

    // 全ての支払い方法を含む合計金額を手動で計算
    const calculatedTotalValue = allPaymentData.details.reduce((sum, detail) => {
        const value = parseFloat(detail.value || 0);
        console.log('DEBUG: Adding value:', value, 'from detail:', detail);
        return sum + value;
    }, 0);
    
    console.log('DEBUG: calculatedTotalValue:', calculatedTotalValue);

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
        invoice_total_value: calculatedTotalValue, // 手動計算した値を使用
        items: Object.values(groupedRates)
            .filter(item => item.total_price !== 0) // Filter out zero-value items
            .sort((a, b) => {
                // Sort by category (accommodation first), then by tax_rate descending
                if (a.category !== b.category) {
                    return a.category === 'accommodation' ? -1 : 1;
                }
                return b.tax_rate - a.tax_rate;
            }),
        comment: data.comment,
        daily_details: relevantDailyDetails,
        details: allPaymentData.details, // 全支払方法の詳細情報を追加
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