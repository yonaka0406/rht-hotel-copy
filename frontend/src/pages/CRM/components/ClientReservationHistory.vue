<template>
<Panel>
    <DataTable :value="clientReservations" :sortable="true" sortMode="multiple" removableSort>
        <template #header>
            <div class="flex justify-end">
                <span class="font-bold mr-2">顧客実績合計:</span>
                <span>{{ totalPriceSum }} 円</span>
            </div>
        </template>
        <Column field="formal_name" header="施設" sortable></Column>
        <Column field="created_at" header="予約登録日" sortable></Column>
        <Column field="status" header="ステータス"></Column>
        <Column field="type" header="予約種類"></Column>        
        <Column field="check_in" header="チェックイン" sortable></Column>        
        <Column field="check_out" header="チェックアウト" sortable></Column>        
        <Column field="total_stays" header="予約宿泊数" sortable>
            <template #body="{ data }">
                <div class="flex justify-center">
                    {{ data.total_stays  }}
                </div>
            </template>
        </Column>        
        <Column field="client_role" header="関係" sortable></Column>
        <Column header="顧客実績">
            <template #body="{ data }">
                <div class="flex justify-end mr-2">
                    {{ (data.total_price).toLocaleString()  }} 円
                </div>
            </template>
        </Column>
    </DataTable>
</Panel>
</template>
<script setup>
    // Vue
    import { ref, onMounted, computed } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();    

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { fetchClientReservations } = useClientStore();

    // Primevue    
    import { Panel, DataTable, Column } from 'primevue';

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

    // Client
    const clientId = ref(route.params.clientId);
    const loadingReservationInfo = ref(false);

    // Reservations
    const clientReservations = ref(null);
    const totalPriceSum = computed(() => {
        if (clientReservations.value) {
            return clientReservations.value.reduce((sum, reservation) => {
                return sum + (reservation.total_price || 0);
            }, 0).toLocaleString();
        }
        return '0';
    });

    const getValue = (key, value) => {
        if (key === 'status') {
            const statusLabels = {
                hold: '保留',
                provisory: '仮予約',
                confirmed: '確定',
                checked_in: 'チェックイン済み',
                checked_out: 'チェックアウト済み',
                cancelled: 'キャンセル済み',
                block: 'ブロック'
            };
            return statusLabels[value] || value;
        }
        if (key === 'type') {
            const typeLabels = {
                default: '通常',
                employee: '従業員',
                ota: 'OTA予約',
                web: 'ウェブ予約'
            };
            return typeLabels[value] || value;
        }
        
        return value;
    };

    onMounted(async () => {        
        try {            
            loadingReservationInfo.value = true;
                        
            const reservations = await fetchClientReservations(clientId.value);
            // Format dates and values here
             clientReservations.value = reservations.map(reservation => ({
                ...reservation,
                total_price: reservation.total_price * 1,
                check_in: formatDate(new Date(reservation.check_in)),
                check_out: formatDate(new Date(reservation.check_out)),
                created_at: formatDate(new Date(reservation.created_at)),
                type: getValue('type', reservation.type),
                status: getValue('status', reservation.status),
            }));         
            console.log('clientReservations', clientReservations.value)

            loadingReservationInfo.value = false;            
        } catch (error) {
            console.error("Error fetching client data:", error);      
        }
    });

</script>