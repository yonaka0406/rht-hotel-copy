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
                        <Button label="新規アクション作成" icon="pi pi-plus" @click="openNewActionDialog" class="p-button-success mr-4" />
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
                        aria-label="予約詳細を表示"
                        v-tooltip="'予約詳細を表示'"
                        @click="openReservationEdit(data.id)"
                    />
                    <Button v-else-if="data.dataType === 'action'"
                        type="button"
                        icon="pi pi-ellipsis-h"
                        @click="toggleActionMenu(data, $event)"
                        aria-haspopup="true"
                        aria-controls="overlay_menu"
                        aria-label="アクションメニュー"
                        v-tooltip="'アクションメニュー'"
                        class="p-button-text"
                    />
                </template>
            </Column>
            <Column field="formal_name" header="施設 / 件名" sortable></Column>
            <Column field="created_at" header="登録日 / 日時" sortable></Column>
            <Column field="status" header="ステータス">
                <template #body="{ data }">
                    <Tag :value="translateStatus(data.status, data.due_date, data.dataType)" :severity="getStatusSeverity(data.status, data.due_date, data.dataType)" />
                </template>
            </Column>
            <Column field="type" header="種類">
                 <template #body="{data}">
                    <Tag v-if="data.dataType === 'action'" style="background: transparent;" :value="translateActionType(data.type)" :severity="getActionTypeSeverity(data.type)" />
                    <span v-else>{{ translateReservationType(data.type) }}</span>
                </template>
            </Column>
            <Column field="check_in" header="チェックイン" sortable></Column>
            <Column field="check_out" header="チェックアウト" sortable></Column>
            <Column field="total_stays" header="予約宿泊数" sortable>
                <template #body="{ data }">
                    <div class="flex justify-center">
                        {{ data.total_stays }}
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
            <Column header="予約実績 / 詳細">
                <template #body="{ data }">
                    <div v-if="data.dataType === 'reservation'" class="flex justify-end mr-2">
                        {{ (data.total_price).toLocaleString() }} 円
                    </div>
                    <div v-else-if="data.dataType === 'action'" class="whitespace-pre-wrap">
                        {{ data.details }}
                    </div>
                </template>
            </Column>
        </DataTable>
        <Menu ref="actionMenu" :model="actionMenuItems" :popup="true" />
    </div>
</Panel>

<!-- SalesActionDialog Component -->
<SalesActionDialog
    :isOpen="isActionFormDialogVisible"
    :actionData="actionDataForDialog"
    :actionFormMode="actionFormMode"
    :allClients="clients"
    :clientsIsLoading="clientsIsLoading"
    :actionTypeOptions="actionTypeOptions"
    :statusOptions="statusOptions"
    :userOptions="users"
    @save-action="handleSaveAction"
    @close-dialog="closeActionFormDialog"
/>
</template>
<script setup>
    // Vue
    import { ref, onMounted, computed } from 'vue';
    import { useRoute } from 'vue-router';
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();

    // Components
    import SalesActionDialog from '@/pages/CRM/components/SalesActionDialog.vue'; // Correct path

    // Stores
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, clientsIsLoading, fetchClients, setClientsIsLoading, fetchClientReservations } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { setReservationId } = useReservationStore();
    import { useCRMStore } from '@/composables/useCRMStore';
    const { client_actions, fetchClientActions, addAction, editAction, removeAction } = useCRMStore();
    import { useUserStore } from '@/composables/useUserStore';
    const { users, logged_user, fetchUsers, fetchUser } = useUserStore();

    // Primevue
    import { Panel, DataTable, Column, Tag, SelectButton, Button, Menu } from 'primevue';
    import { translateReservationStatus, translateReservationType } from '@/utils/reservationUtils';


    // Client
    const route = useRoute();
    const clientId = ref(route.params.clientId);
    const loadingData = ref(false); // Renamed from loadingReservationInfo for clarity

    // Reservations and Actions
    const clientReservations = ref(null);
    const crmActions = ref(null);

    // Toggle State
    const toggleOptions = ref(['予約のみ', '対応含む']);
    const selectedToggle = ref('予約のみ');

    // --- Action Form Dialog State ---
    const isActionFormDialogVisible = ref(false);
    const actionFormMode = ref('create'); // 'create' or 'edit'
    const actionDataForDialog = ref(null); // Data passed to the SalesActionDialog for editing

    // --- Translation Mappings ---
    const actionTypeTranslations = {
        'visit': '訪問',
        'call': '電話',
        'email': 'メール',
        'meeting': '会議',
        'task': 'タスク',
        'note': 'メモ',
        'other': 'その他'
    };
    const statusTranslations = {
        'pending': '保留中',
        'scheduled': '予定',
        'completed': '完了',
        'cancelled': 'キャンセル',
        'rescheduled': '再スケジュール',
        'needs_follow_up': '要フォローアップ'
    };
    const reservationTypeTranslations = {
        'default': '通常',
        'employee': '従業員',
        'ota': 'OTA予約',
        'web': 'ウェブ予約',
    };
    const reservationStatusTranslations = {
        'hold': '保留',
        'provisory': '仮予約',
        'confirmed': '確定',
        'checked_in': 'チェックイン済み',
        'checked_out': 'チェックアウト済み',
        'cancelled': 'キャンセル済み',
        'block': 'ブロック',
    };

    // Options for dialog (Passed to dialog)
    const actionTypeOptions = computed(() =>
        Object.entries(actionTypeTranslations).map(([value, label]) => ({ label, value }))
    );
    const statusOptions = computed(() =>
        Object.entries(statusTranslations)
            .filter(([value, label]) => value !== 'needs_follow_up') // Filter out 'needs_follow_up' from selectable options
            .map(([value, label]) => ({ label, value }))
    );

    // --- Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Tokyo' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
    };

    const getEffectiveActionStatus = (actionStatus, dueDate) => {
        const now = new Date();
        now.setHours(0,0,0,0); // Start of today for due_date comparison

        if (actionStatus === 'completed' || actionStatus === 'cancelled') {
            return actionStatus;
        }
        if (dueDate && new Date(dueDate) < now) {
            return 'needs_follow_up';
        }
        return actionStatus;
    };

    const translateActionType = (typeKey) => actionTypeTranslations[typeKey] || typeKey;

    const translateStatus = (status, dueDate, dataType) => {
        if (dataType === 'action') {
            const eStatus = getEffectiveActionStatus(status, dueDate);
            return statusTranslations[eStatus] || status;
        } else { // dataType === 'reservation'
            return translateReservationStatus(status) || status; // Use imported function
        }
    };

    const getActionTypeSeverity = (actionType) => {
        const severities = {
            visit: 'primary',
            call: 'info',
            email: 'info',
            meeting: 'primary',
            task: 'secondary',
            note: 'warn',
            other: 'secondary'
        };
        return severities[actionType] || 'info';
    };

    const getStatusSeverity = (status, dueDate, dataType) => {
        if (dataType === 'action') {
            const eStatus = getEffectiveActionStatus(status, dueDate);
            const severities = {
                pending: 'warn',
                scheduled: 'info',
                completed: 'success',
                cancelled: 'danger',
                rescheduled: 'primary',
                needs_follow_up: 'danger'
            };
            return severities[eStatus] || 'info';
        } else { // dataType === 'reservation'
            const severities = {
                hold: 'warn',
                provisory: 'info',
                confirmed: 'success',
                checked_in: 'success',
                checked_out: 'secondary',
                cancelled: 'danger',
                block: 'danger',
            };
            return severities[status] || 'info';
        }
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

    // Combined and Filtered Data
    const combinedData = computed(() => {
        const reservations = clientReservations.value ? clientReservations.value.map(res => ({
            ...res,
            dataType: 'reservation',
            formal_name: res.formal_name, // Facility name for reservations
            created_at: formatDate(new Date(res.created_at)),
            check_in: formatDate(new Date(res.check_in)),
            check_out: formatDate(new Date(res.check_out)),
            total_price: res.total_price * 1,
            // Fields specific to CRM actions but set to null for reservations
            subject: null, details: null, outcome: null, action_datetime: null, assigned_to: null, due_date: null,
        })) : [];

        const actions = crmActions.value ? crmActions.value.map(action => ({
            id: action.id,
            client_id: action.client_id,
            dataType: 'action',
            formal_name: action.subject, // Subject for CRM actions
            created_at: formatDateTime(new Date(action.action_datetime)), // Use action_datetime as "created_at" for sorting
            status: action.status, // Raw status for CRM actions
            type: action.action_type, // Raw action type for CRM actions
            details: action.details,
            outcome: action.outcome,
            action_datetime: action.action_datetime, // Keep original date for dialog
            assigned_to: action.assigned_to,
            due_date: action.due_date,
            client_name: action.client_name,
            client_name_kana: action.client_name_kana,
            // Fields specific to reservations but set to null for actions
            check_in: null, check_out: null, total_stays: null, client_role: null, total_price: 0,
        })) : [];

        // Combine and sort by date (created_at field for both)
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

    // --- Action Form Dialog Methods ---
    const openNewActionDialog = async () => {
        actionFormMode.value = 'create';
        actionDataForDialog.value = {
            client_id: clientId.value, // Pre-fill client_id from current page
            action_datetime: new Date(),
            status: 'pending',
            action_type: 'call',
            assigned_to: logged_user.value && logged_user.value[0] ? logged_user.value[0].id : null,
            subject: '',
            details: '',
            outcome: '',
            due_date: null,
        };
        isActionFormDialogVisible.value = true;
    };

    const openEditActionDialog = (actionData) => {
        actionFormMode.value = 'edit';
        // Pass a deep copy if actionData can be modified directly in dialog before save
        actionDataForDialog.value = { ...actionData };
        isActionFormDialogVisible.value = true;
    };

    const closeActionFormDialog = () => {
        isActionFormDialogVisible.value = false;
        actionDataForDialog.value = null; // Clear data when dialog closes
    };

    const handleSaveAction = async (formData) => {
        loadingData.value = true;
        try {
            if (!formData.id) {
                await addAction(formData);
                toast.add({ severity: "success", summary: "成功", detail: "新規アクション登録されました。", life: 3000 });
            } else {
                await editAction(formData.id, formData);
                toast.add({ severity: "info", summary: "編集", detail: "アクション編集されました。", life: 3000 });
            }
            await fetchData(); // Refresh data after save/edit
        } catch (error) {
            console.error('Failed to save action:', error);
            toast.add({ severity: "error", summary: "保存失敗", detail: error.message || "アクションの保存に失敗しました。", life: 3000 });
        } finally {
            loadingData.value = false;
            closeActionFormDialog();
        }
    };

    const deleteActionHandler = async (id) => {
        if (!id) {
            toast.add({ severity: "error", summary: "エラー", detail: "アクションIDが無効です", life: 3000 });
            return;
        }

        loadingData.value = true;
        try {
            await removeAction(id);
            toast.add({ severity: "success", summary: "成功", detail: "アクションが削除されました。", life: 3000 });
            await fetchData(); // Refresh data after deletion
        } catch (error) {
            console.error('Failed to delete action:', error);
            toast.add({ severity: "error", summary: "削除失敗", detail: error.message || "アクションの削除に失敗しました。", life: 3000 });
        } finally {
            loadingData.value = false;
        }
    };

    // --- DataTable row actions menu ---
    const actionMenu = ref();
    const currentActionItem = ref(null); // To store the action item for the menu
    const actionMenuItems = ref([
        { label: '編集', icon: 'pi pi-pencil', command: () => { if(currentActionItem.value) openEditActionDialog(currentActionItem.value); } },
        { label: '削除', icon: 'pi pi-trash', command: () => { if(currentActionItem.value) deleteActionHandler(currentActionItem.value.id); } }
    ]);

    const toggleActionMenu = (action, event) => {
        currentActionItem.value = action;
        actionMenu.value.toggle(event);
    };

    const fetchData = async () => {
        try {
            loadingData.value = true;
            const [reservations] = await Promise.all([
                fetchClientReservations(clientId.value),
                fetchClientActions(clientId.value),
            ]);
            clientReservations.value = reservations;
            crmActions.value = client_actions.value;
        } catch (error) {
            console.error("Error fetching client data:", error);
            toast.add({ severity: "error", summary: "データの取得失敗", detail: "クライアントの予約とアクション情報の取得に失敗しました。", life: 3000 });
        } finally {
            loadingData.value = false;
        }
    };

    onMounted(async () => {
        await fetchUser(); // Ensure logged_user is available
        if (logged_user.value && logged_user.value[0]) {
             // Fetch all users for 'assigned to' dropdown in dialog
            await fetchUsers();
        } else {
            console.error("Logged in user not found.");
            toast.add({ severity: "error", summary: "エラー", detail: "ログインユーザー情報を取得できませんでした。", life: 3000 });
            return; // Exit if no logged-in user
        }

        await fetchData(); // Initial data fetch
    });

</script>
<style scoped>
/* Add any custom styles if needed, Tailwind and PrimeVue handle most */
.p-card .p-card-content {
    padding-top: 0.5rem; /* Example: Adjust card content padding */
}
.p-datatable-sm .p-datatable-thead > tr > th {
    padding: 0.5rem 0.5rem; /* Smaller padding for table headers */
}
.p-datatable-sm .p-datatable-tbody > tr > td {
    padding: 0.5rem 0.5rem; /* Smaller padding for table cells */
}

.field {
    margin-bottom: 1rem; /* Add some spacing between form fields */
}
.field label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
}

/* Ensure SelectButton options are not too wide if labels are long */
:deep(.p-selectbutton .p-button) {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
}
</style>
