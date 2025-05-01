<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12">
                <template #content> 
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <span class="col-span-3 font-bold">月分：</span>
                        <DatePicker v-model="selectedMonth" 
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy年mm月"
                            view="month"
                            class="flex col-span-3"
                            fluid                             
                        />                        
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
                        <AccordionPanel                        
                            v-for="(group, index) in summarizedBilledList"
                            :key="group.id"          
                            :value="group.id"
                        >
                            <AccordionHeader>
                                <div class="grid grid-cols-6 gap-4 w-full">
                                    <div class="col-span-3 text-left">
                                        {{ `${group.client_kanji || group.client_name}`}} 
                                        <small>{{ `${group.client_kana ? '(' + group.client_kana + ')' : ''}` }}</small>
                                    </div>
                                    <div class="flex items-center justify-center">
                                        {{ group.total_value.toLocaleString() }} 円
                                    </div>
                                    <div class="col-span-2 text-right mr-4">
                                        <Badge v-if="group.invoice_number" severity="contrast" class="mr-2">{{ group.invoice_number }}</Badge>
                                        <Badge severity="secondary" class="mr-2">{{ translateStatus(group.status) }}</Badge>
                                        <Button
                                            icon="pi pi-pencil"
                                            label="編集"
                                            class="p-button-sm"
                                            @click="openInvoiceDialog(group)"
                                        />
                                    </div>
                                </div>
                            </AccordionHeader>
                            <AccordionContent>
                                <DataTable 
                                    :value="group.details"
                                >                                    
                                    <Column field="date" header="請求日"></Column>
                                    <Column header="予約期間">
                                        <template #body="slotProps">
                                            <span>{{ slotProps.data.check_in }}～{{ slotProps.data.check_out }}</span>
                                        </template>
                                    </Column>    
                                    <Column field="room_type_name" header="部屋タイプ"></Column>
                                    <Column field="room_number" header="部屋番号"></Column>
                                    <Column field="comment" header="コメント"></Column>
                                    <Column header="金額">
                                        <template #body="slotProps">
                                            <span>{{ slotProps.data.value.toLocaleString() }} 円</span>
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
        <div class="invoice-form">

            <div class="invoice-header">
                <div class="field">
                <label class="font-bold">請求No.:</label>
                <div>{{ invoiceData.請求No }}</div>
                </div>
                <div class="field">
                <label class="font-bold">請求日:</label>
                <div>{{ invoiceData.請求日 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">取引先コード:</label>
                <div>{{ invoiceData.取引先コード }}</div>
                </div>
                <div class="field">
                <label class="font-bold">件名:</label>
                <div>{{ invoiceData.件名 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">お支払期限:</label>
                <div>{{ invoiceData.お支払期限 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">お振込先:</label>
                <div>{{ invoiceData.お振込先 }}</div>
                </div>
            </div>

            <DataTable :value="invoiceData.items">
                <Column field="No" header="No."></Column>
                <Column field="摘要" header="摘要"></Column>
                <Column field="数量" header="数量"></Column>
                <Column field="金額" header="金額"></Column>
            </DataTable>

            <div class="invoice-summary">
                <div class="field">
                <label class="font-bold">合計金額:</label>
                <div>{{ invoiceData.合計金額 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">内消費税:</label>
                <div>{{ invoiceData.内消費税 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">10%対象:</label>
                <div>{{ invoiceData['10%対象'] }}</div>
                </div>
                <div class="field">
                <label class="font-bold">消費税:</label>
                <div>{{ invoiceData.消費税 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">8%対象:</label>
                <div>{{ invoiceData['8%対象'] }}</div>
                </div>
            </div>

            <div class="accommodation-details">
                <label class="font-bold">宿泊明細:</label>
                <div class="field">
                <label class="font-bold">期間:</label>
                <div>{{ invoiceData.宿泊明細.期間 }}</div>
                </div>
                <div class="field">
                <label class="font-bold">人数:</label>
                <div>{{ invoiceData.宿泊明細['1名'] }}</div>
                </div>
                <div class="field">
                <label class="font-bold">泊数:</label>
                <div>{{ invoiceData.宿泊明細.泊数 }}</div>
                </div>
            </div>

            <Button label="Generate PDF" @click="generatePdf" />
        </div>
    </Dialog>
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from "vue";    
    import { Card, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, DatePicker, Button, Badge, Dialog } from 'primevue';

    // Stores
    import { useBillingStore } from '@/composables/useBillingStore';
    const { billedList, fetchBilledListView } = useBillingStore();
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
                client_id: item.client_id,
                invoice_number: item.invoice_number,
                date: formatDate(new Date(item.date)),
                status: item.status,
                client_name: item.client_name,
                client_kanji: item.client_kanji,
                client_kana: item.client_kana,
                legal_or_natural_person: item.legal_or_natural_person,
                total_people: parseFloat(item.total_people),
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
                        comment: item.comment,
                        value: parseFloat(item.value),
                    },
                ],
            };
            } else {
                summary[key].total_people += parseFloat(item.total_people);
                summary[key].total_value += parseFloat(item.value);
            
                summary[key].details.push({
                    id: item.id,
                    client_id: item.client_id,
                    date: formatDate(new Date(item.date)),
                    check_in: formatDate(new Date(item.check_in)),
                    check_out: formatDate(new Date(item.check_out)),
                    reservation_id: item.reservation_id,
                    room_type_name: item.room_type_name,
                    room_number: item.room_number,
                    comment: item.comment,
                    value: parseFloat(item.value),
                });
            }
        }        
        return Object.values(summary).sort((a, b) => b.total_value - a.total_value);
    });

    // Dialog
    const displayInvoiceDialog = ref(false);
    const invoiceData = ref({});
    const openInvoiceDialog = (data) => {
        invoiceData.value = {
            "請求No": data.invoice_number,
            "請求日": data.date,
            "取引先コード": data.client_id,
            "件名": data.client_name,
            "お支払期限": data.due_date,
            "お振込先": data.bank_account,
            "合計金額": data.total_value.toLocaleString() + ' 円',
            "内消費税": (data.total_value * 0.1).toLocaleString() + ' 円',
            "10%対象": (data.total_value * 0.1).toLocaleString() + ' 円',
            "消費税": (data.total_value * 0.1).toLocaleString() + ' 円',
            "8%対象": (data.total_value * 0.08).toLocaleString() + ' 円',
            "宿泊明細": {
                "期間": `${data.check_in}～${data.check_out}`,
                "1名": data.guest_count,
                "泊数": data.stay_count,
            },
            items: data.details.map((item, index) => ({
                No: index + 1,
                摘要: item.comment || '宿泊料金',
                数量: item.guest_count || 1,
                金額: item.value.toLocaleString() + ' 円',
            })),
        };
        displayInvoiceDialog.value = true;
    };
    const generatePdf = () => {
        //  Trigger server-side PDF generation
        console.log('Generate PDF clicked', invoiceData.value);
    };    
    
    
    onMounted (async () => {        
        await fetchBilledListView(selectedHotelId.value, formatDate(new Date(selectedMonth.value)));
        
        console.log("Summarized Billed List:", summarizedBilledList.value);
    });

    watch([selectedHotelId, selectedMonth], async ([newHotelId, newMonth]) => {
            if (newHotelId && newMonth) {
                await fetchBilledListView(newHotelId, formatDate(newMonth));
                console.log("Summarized Billed List:", summarizedBilledList.value);
            }
        }, { immediate: true }
    );
       

</script>
<style scoped>
    .invoice-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    }

    .invoice-header, .invoice-summary {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem 1rem;
    }

    .field {
    display: flex;
    flex-direction: column;
    }

    .accommodation-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    }
</style>