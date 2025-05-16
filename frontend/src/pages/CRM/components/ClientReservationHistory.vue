<template>
<Panel>    
    <div v-if="clientReservations || crmActions">
        <DataTable :value="filteredData" 
            :sortable="true" 
            sortMode="multiple" 
            removableSort
            :paginator="true"
            :rows="15"
            :rowsPerPageOptions="[15,30,50]"
            responsiveLayout="scroll"
        >
            <template #header>
                <div class="flex flex-col md:flex-row md:justify-between md:items-center">
                        <div class="mb-4 md:mb-0">
                            <p class="text-xl font-bold">
                                {{ clientReservations?.[0]?.client_name || crmActions?.[0]?.client_name || 'クライアント' }}
                            </p>
                            <small>{{ clientReservations?.[0]?.client_name_kana || crmActions?.[0]?.client_name_kana }}</small>
                        </div>
                        <div class="flex flex-col md:flex-row md:items-center">
                            <SelectButton v-model="selectedToggle" :options="toggleOptions" aria-labelledby="basic" class="mr-4 mb-2 md:mb-0" />
                            <div class="flex justify-end items-center">
                                <span class="font-bold mr-2">顧客実績合計:</span>
                                <span>{{ totalPriceSum }} 円</span>
                            </div>
                        </div>
                    </div>               
            </template>
            <Column header="操作">
                <template #body="{ data }">
                    <Button v-if="data.dataType === 'reservation'"
                        icon="pi pi-eye" 
                        class="p-button-text p-button-rounded p-button-sm" 
                        @click="openReservationEdit(data.id)" 
                    />
                </template>
            </Column>
            <Column field="formal_name" header="施設" sortable></Column>
            <Column field="created_at" header="登録日" sortable></Column>
            <Column field="status" header="ステータス"></Column>
            <Column field="type" header="種類"></Column>        
            <Column field="check_in" header="チェックイン" sortable></Column>        
            <Column field="check_out" header="チェックアウト" sortable></Column>        
            <Column field="total_stays" header="予約宿泊数" sortable>
                <template #body="{ data }">
                    <div class="flex justify-center">
                        {{ data.total_stays  }}
                    </div>
                </template>
            </Column>        
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
    const { fetchClientReservations } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';    
    const { setReservationId } = useReservationStore();
    import { useCRMStore } from '@/composables/useCRMStore';
    const { client_actions, fetchClientActions } = useCRMStore();

    // Primevue    
    import { Panel, DataTable, Column, Tag, SelectButton, Button } from 'primevue';

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

    // Reservations and Actions
    const clientReservations = ref(null);
    const crmActions = ref(null);    

    // Toggle State
    const toggleOptions = ref(['予約のみ', '営業含む']);
    const selectedToggle = ref('予約のみ');

    // Combined and Filtered Data
    const combinedData = computed(() => {
        const reservations = clientReservations.value ? clientReservations.value.map(res => ({
            ...res,
            dataType: 'reservation',
            // Map reservation dates/values here as done before
            total_price: res.total_price * 1,
            check_in: formatDate(new Date(res.check_in)),
            check_out: formatDate(new Date(res.check_out)),
            created_at: formatDate(new Date(res.created_at)),
            type: getValue('type', res.type),
            status: getValue('status', res.status),
            notes: null, // Add notes field, null for reservations
        })) : [];

        const actions = crmActions.value ? crmActions.value.map(action => ({
            id: action.id,
            client_id: action.client_id,
            dataType: 'action',
            created_at: formatDate(new Date(action.action_datetime)),            
            formal_name: action.subject,
            status: getValue('status', action.status),
            type: getValue('type', action.action_type),
            check_in: null,
            check_out: null,
            total_stays: null,
            client_role: null,
            total_price: 0, // Actions have no reservation price
            client_name: action.client_name, // Assuming action object has client name
            client_name_kana: action.client_name_kana, // Assuming action object has client kana name
        })) : [];

        // Combine and sort by date (created_at)
        const combined = [...reservations, ...actions];
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort descending by date

        return combined;
    });

    const filteredData = computed(() => {
        if (selectedToggle.value === '予約のみ') {
            return combinedData.value.filter(item => item.dataType === 'reservation');
        } else {
            return combinedData.value; // Show all data
        }
    });

    const totalPriceSum = computed(() => {
        // Calculate sum only for reservation items in the combined data
        return combinedData.value
            .filter(item => item.dataType === 'reservation')
            .reduce((sum, reservation) => {
                return sum + (reservation.total_price || 0);
            }, 0)
            .toLocaleString();
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
                block: 'ブロック',
                pending: '保留中',
                scheduled: '予定',
                completed: '完了',
                cancelled: 'キャンセル',
                rescheduled: '再スケジュール',
                needs_follow_up: '要フォローアップ'
            };
            return statusLabels[value] || value;
        }
        if (key === 'type') {
            const typeLabels = {
                default: '通常',
                employee: '従業員',
                ota: 'OTA予約',
                web: 'ウェブ予約',
                visit: '訪問',
                call: '電話',
                email: 'メール',
                meeting: '会議',
                task: 'タスク',
                note: 'メモ'
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
        try {            
            loadingReservationInfo.value = true;

            // Fetch both reservations and actions concurrently
            const [reservations, actionsData] = await Promise.all([
                fetchClientReservations(clientId.value),
                fetchClientActions(clientId.value)
            ]);
                        
            // Assign fetched data to refs
            clientReservations.value = reservations;
            crmActions.value = client_actions.value;
                                 
            console.log('clientReservations', clientReservations.value);
            console.log('crmActions', crmActions.value);

            loadingReservationInfo.value = false;            
        } catch (error) {
            console.error("Error fetching client data:", error);      
        }
    });

</script>