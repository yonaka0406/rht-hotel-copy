<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <Card class="flex col-span-12">
                <template #content> 
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <span class="col-span-4 font-bold">月分：</span>
                        <DatePicker v-model="selectedMonth" 
                            :showIcon="true" 
                            iconDisplay="input" 
                            dateFormat="yy年mm月"
                            view="month"
                            class="flex col-span-2"
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
                                            @click="openInvoiceEdit(group)"
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
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from "vue";    
    import { Card, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column, DatePicker, Button, Badge } from 'primevue';

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