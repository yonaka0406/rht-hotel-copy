<template>
<Panel>
    <div v-if="selectedGroup">
        <DataTable :value="clientReservations" :sortable="true" sortMode="multiple" removableSort>
            <template #header>
                <div>
                    <p class="text-xl font-bold">{{ selectedGroup[0].group_name }}</p>
                </div>
            </template>
            <Column header="操作">
                <template #body="{ data }">
                    <Button icon="pi pi-eye" class="p-button-text p-button-rounded p-button-sm" @click="openReservationEdit(data.id)" />
                </template>
            </Column>
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
            <Column field="client_name" header="氏名・名称" sortable></Column>
            <Column field="client_role" header="関係" sortable>
                <template #body="{ data }">
                    <Tag :severity="getClientRoleSeverity(data.client_role)">
                    {{ data.client_role }}
                    </Tag>
                </template>
            </Column>
            <Column header="予約実績">
                <template #body="{ data }">
                    <div class="flex justify-end mr-2">
                        {{ (data.total_price).toLocaleString()  }} 円
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</Panel>
</template>
<script setup>
    // Vue
    import { ref, onMounted, computed } from 'vue';
    import { useRoute } from 'vue-router';
    const route = useRoute();    

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { selectedGroup, fetchGroup, fetchClientReservations } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';    
    const { setReservationId } = useReservationStore();

    // Primevue    
    import { Panel, DataTable, Column, Tag, Button } from 'primevue';

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

    // Group
    const groupId = ref(route.params.groupId);
    const loadingReservationInfo = ref(false);

    // Reservations
    const allClientReservations = ref([]);
    // Computed
    const clientReservations = computed(() => {
        if (allClientReservations.value) {
        return [...allClientReservations.value].sort((b, a) => new Date(a.check_in) - new Date(b.check_in));
        }
        return [];
    });    
    const totalPriceSum = computed(() => {
        return clientReservations.value.reduce((sum, reservation) => {
        return sum + (reservation.total_price || 0);
        }, 0).toLocaleString();
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
    const getClientRoleSeverity = (clientRole) => {
        if (clientRole === '宿泊者') {
            return 'warn';
        } else if (clientRole === '支払者') {
            return 'info';
        }
        return null;
    };

    const openReservationEdit = async (reservationId) => {
        await setReservationId(reservationId);

        window.open(`/reservations/edit/${reservationId}`, '_blank');
    };

    onMounted(async () => {        
        loadingReservationInfo.value = true;

        try {
            await fetchGroup(groupId.value);
            if (selectedGroup.value && selectedGroup.value.length > 0) {
                const clientIds = selectedGroup.value.map(client => client.id);
                const reservationsPromises = clientIds.map(clientId => fetchClientReservations(clientId));
                const allReservationsArrays = await Promise.all(reservationsPromises);

                // Flatten the array of arrays into a single array
                allClientReservations.value = allReservationsArrays.flat().map(reservation => ({
                    ...reservation,
                    total_price: reservation.total_price * 1,
                    check_in: formatDate(new Date(reservation.check_in)),
                    check_out: formatDate(new Date(reservation.check_out)),
                    created_at: formatDate(new Date(reservation.created_at)),
                    type: getValue('type', reservation.type),
                    status: getValue('status', reservation.status),
                }));
            }

            console.log(clientReservations.value)
        } catch (error) {
            console.error("Error fetching group or client reservations:", error);
        } finally {
            loadingReservationInfo.value = false;
        }          
    });

</script>