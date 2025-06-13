<template>
    <div class="p-4 min-h-screen">
        <div class="mb-4 flex justify-between items-center">
            <h1 class="font-semibold text-gray-700">やり取り一覧</h1>
            <Button label="新規アクション作成" icon="pi pi-plus" @click="openNewActionDialog" class="p-button-success" />
            <Button @click="handleManualSync"
                v-if="hasGoogleCalendarId && hasGoogleCalendarId"
                label="Googleカレンダー同期"
                icon="pi pi-sync"
                :loading="isSyncingCalendar"
                :disabled="isSubmitting || isSyncingCalendar"
                class="p-button-secondary"
            />
            <Button @click="setupDedicatedCalendar"
                v-if="logged_user && !hasGoogleCalendarId"
                label="Googleカレンダー作成"
                icon="pi pi-calendar-plus"
                class="p-button-primary mr-2"
                :loading="isSubmitting && !isSyncingCalendar"
                :disabled="isSubmitting || isSyncingCalendar"
            />
            <SelectButton
                v-model="selectedScope"
                :options="scopeOptions"
                optionLabel="label"
                optionValue="value"
            />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card class="hover:shadow-lg transition-shadow duration-300">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>🗓️ 今後の予定 ({{ scheduledActions.length }})</span>
                        <Button v-if="scheduledActions.length > 0" label="全て見る" icon="pi pi-external-link" @click="openModal('scheduled')" class="p-button-text p-button-sm" />
                    </div>
                </template>
                <template #content>
                    <div v-if="loading" class="text-center"><ProgressSpinner style="width:30px; height:30px" strokeWidth="6" /></div>
                    <div v-else-if="scheduledActions.length === 0" class="text-gray-500">予定されているアクションはありません。</div>
                    <div v-else>
                        <ul class="list-none p-0 m-0">
                            <li v-for="action in scheduledActions.slice(0, 3)" :key="action.id" class="py-1 border-b border-gray-200 last:border-b-0">
                                <p class="font-medium">{{ action.subject }}</p>
                                <p class="text-sm text-gray-600">{{ formatDate(action.action_datetime) }} - {{ action.client_name }}</p>
                            </li>
                        </ul>
                        <p v-if="scheduledActions.length > 3" class="text-sm text-blue-500 mt-2">他 {{ scheduledActions.length - 3 }} 件...</p>
                    </div>
                </template>
            </Card>

            <Card class="hover:shadow-lg transition-shadow duration-300">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>⏳ 保留中のタスク ({{ pendingActions.length }})</span>
                        <Button v-if="pendingActions.length > 0" label="全て見る" icon="pi pi-external-link" @click="openModal('pending')" class="p-button-text p-button-sm" />
                    </div>
                </template>
                <template #content>
                    <div v-if="loading" class="text-center"><ProgressSpinner style="width:30px; height:30px" strokeWidth="6" /></div>
                    <div v-else-if="pendingActions.length === 0" class="text-gray-500">保留中のアクションはありません。</div>
                    <div v-else>
                        <ul class="list-none p-0 m-0">
                            <li v-for="action in pendingActions.slice(0, 3)" :key="action.id" class="py-1 border-b border-gray-200 last:border-b-0">
                                <p class="font-medium">{{ action.subject }}</p>
                                <p class="text-sm text-gray-600">{{ action.client_name }}</p>
                            </li>
                        </ul>
                        <p v-if="pendingActions.length > 3" class="text-sm text-blue-500 mt-2">他 {{ pendingActions.length - 3 }} 件...</p>
                    </div>
                </template>
            </Card>

            <Card class="hover:shadow-lg transition-shadow duration-300">
                <template #title>
                    <div class="flex justify-between items-center">
                        <span>⚠️ フォローアップが必要 ({{ needsFollowUpActions.length }})</span>
                        <Button v-if="needsFollowUpActions.length > 0" label="全て見る" icon="pi pi-external-link" @click="openModal('needs_follow_up')" class="p-button-text p-button-sm" />
                    </div>
                </template>
                <template #content>
                    <div v-if="loading" class="text-center"><ProgressSpinner style="width:30px; height:30px" strokeWidth="6" /></div>
                    <div v-else-if="needsFollowUpActions.length === 0" class="text-gray-500">フォローアップが必要なアクションはありません。</div>
                    <div v-else>
                        <ul class="list-none p-0 m-0">
                            <li v-for="action in needsFollowUpActions.slice(0, 3)" :key="action.id" class="py-1 border-b border-gray-200 last:border-b-0">
                                <p class="font-medium text-red-600">{{ action.subject }}</p>
                                <p class="text-sm text-gray-600">期日: {{ formatDate(action.due_date) }} - {{ action.client_name }}</p>
                            </li>
                        </ul>
                        <p v-if="needsFollowUpActions.length > 3" class="text-sm text-blue-500 mt-2">他 {{ needsFollowUpActions.length - 3 }} 件...</p>
                    </div>
                </template>
            </Card>
        </div>

        <Card class="mt-6">
            <template #title>
                <p>全てのアクション</p>
            </template>
            <template #content>
                <DataTable :value="allActions" :loading="loading" responsiveLayout="scroll" paginator :rows="10" :rowsPerPageOptions="[5,10,20,50]"
                    sortMode="multiple" removableSort
                    v-model:filters="filters" filterDisplay="menu"
                    stateStorage="session" stateKey="dt-sales-interactions"
                    class="p-datatable-sm">
                    <Column field="action_type" header="タイプ" :sortable="true" style="min-width:100px">
                        <template #body="{data}">
                            <Tag style="background: transparent;" :value="translateActionType(data.action_type)" :severity="getActionTypeSeverity(data.action_type)" />
                        </template>
                        <template #filter="{filterModel,filterCallback}">
                            <Select v-model="filterModel.value" @change="filterCallback()" :options="actionTypeOptions" optionLabel="label" optionValue="value" placeholder="タイプを選択" class="p-column-filter" />
                        </template>
                    </Column>
                    <Column field="subject" header="件名" :sortable="true" style="min-width:200px">
                        <template #filter="{filterModel,filterCallback}">
                            <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="件名を検索"/>
                        </template>
                    </Column>
                    <Column field="client_name" header="クライアント" :sortable="true" style="min-width:150px">
                        <template #filter="{filterModel,filterCallback}">
                            <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="クライアントを検索"/>
                        </template>
                        <template #body="{data}">
                            <Button
                                @click="goToEditClientPage(data.client_id)"
                                severity="info"
                                class="p-button-rounded p-button-text p-button-sm"
                            >
                                <i class="pi pi-pencil"></i>
                            </Button>
                            {{ data.client_name }}
                        </template>
                    </Column>
                    <Column field="action_datetime" header="日時" :sortable="true" style="min-width:160px">
                        <template #body="{data}">
                            {{ formatDateTime(data.action_datetime) }}
                        </template>
                    </Column>
                    <Column field="due_date" header="期日" :sortable="true" style="min-width:160px">
                        <template #body="{data}">
                            {{ data.due_date ? formatDate(data.due_date) : 'N/A' }}
                        </template>
                    </Column>
                    <Column field="status" header="ステータス" :sortable="true" style="min-width:120px">
                        <template #body="{data}">
                            <Tag :value="translateStatus(data.status, data.due_date)" :severity="getStatusSeverity(data.status, data.due_date)" />
                        </template>
                        <template #filter="{filterModel,filterCallback}">
                            <Select v-model="filterModel.value" @change="filterCallback()" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="ステータスを選択" class="p-column-filter" />
                        </template>
                    </Column>
                    <Column header="Google" headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center;">
                        <template #body="{data}">
                            <a v-if="data.synced_with_google_calendar && data.google_calendar_html_link"
                               :href="data.google_calendar_html_link"
                               target="_blank"
                               rel="noopener noreferrer"
                               v-tooltip.top="'Googleカレンダーで開く'">
                                <i class="pi pi-calendar" style="color: #34A853; font-size: 1.2rem;"></i>
                            </a>
                            <i v-else-if="data.synced_with_google_calendar"
                               class="pi pi-calendar-check"
                               style="color: #1858A8; font-size: 1.2rem;"
                               v-tooltip.top="'Googleカレンダー同期済み'"></i>
                            <i v-else
                               class="pi pi-calendar-times"
                               style="color: #cccccc; font-size: 1.2rem;"
                               v-tooltip.top="'Googleカレンダー未同期'"></i>
                        </template>
                    </Column>
                    <Column field="assigned_to_name" header="担当者" :sortable="true" style="min-width:120px">
                        <template #filter="{filterModel,filterCallback}">
                            <InputText type="text" v-model="filterModel.value" @keydown.enter="filterCallback()" class="p-column-filter" placeholder="担当者を検索"/>
                        </template>
                    </Column>
                    <Column headerStyle="width: 5rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                        <template #body="slotProps">
                            <Button type="button" icon="pi pi-ellipsis-h" @click="toggleActionMenu(slotProps.data, $event)" aria-haspopup="true" aria-controls="overlay_menu" class="p-button-text"/>
                        </template>
                    </Column>
                </DataTable>
                <Menu ref="actionMenu" :model="actionMenuItems" :popup="true" />
            </template>
        </Card>
    </div>

    <Dialog v-model:visible="isModalVisible" :header="modalTitle" :style="{width: '75vw'}" :modal="true" position="bottom">
        <DataTable :value="modalData" responsiveLayout="scroll" paginator :rows="10" class="p-datatable-sm">
            <Column field="action_type" header="タイプ">
                <template #body="{data}">
                    <Tag style="background: transparent;" :value="translateActionType(data.action_type)" :severity="getActionTypeSeverity(data.action_type)" />
                </template>
            </Column>
            <Column field="subject" header="件名" :sortable="true"></Column>
            <Column field="client_name" header="クライアント" :sortable="true">
                <template #body="{data}">
                    <span>
                        <Button
                            @click="goToEditClientPage(data.client_id)"
                            severity="info"
                            class="p-button-rounded p-button-text p-button-sm"
                        >
                            <i class="pi pi-pencil"></i>
                        </Button>
                        {{ data.client_name }}
                    </span>
                </template>
            </Column>
            <Column field="action_datetime" header="日時" :sortable="true">
                <template #body="{data}">{{ formatDateTime(data.action_datetime) }}</template>
            </Column>
            <Column field="due_date" header="期日" :sortable="true">
                <template #body="{data}">{{ data.due_date ? formatDate(data.due_date) : 'N/A' }}</template>
            </Column>
            <Column field="status" header="ステータス" :sortable="true">
                <template #body="{data}">
                    <Tag :value="translateStatus(data.status, data.due_date)" :severity="getStatusSeverity(data.status, data.due_date)" />
                </template>
            </Column>
            <Column field="assigned_to_name" header="担当者" :sortable="true"></Column>
            <Column field="details" header="詳細" style="min-width:200px; white-space: pre-wrap;"></Column>
        </DataTable>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="closeModal" class="p-button-text"/>
        </template>
    </Dialog>

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
import { ref, computed, onMounted, watch } from "vue";
// Import the new SalesActionDialog component
import SalesActionDialog from './components/SalesActionDialog.vue';

// Primevue
import { Card, Dialog, Menu, InputText, DatePicker, Textarea, AutoComplete, Select, SelectButton, Button, DataTable, Column, Tag, ProgressSpinner } from 'primevue';
import { FilterMatchMode } from '@primevue/core/api';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

// Stores
import { useUserStore } from '@/composables/useUserStore';
const { users, logged_user, fetchUsers, fetchUser, createUserCalendar, triggerCalendarSyncStore } = useUserStore();
import { useClientStore } from '@/composables/useClientStore';
const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();
import { useCRMStore } from '@/composables/useCRMStore';
const { user_actions, actions, fetchUserActions, fetchAllActions, addAction, editAction, removeAction } = useCRMStore();

// --- Reactive State ---
const selectedScope = ref('user');
const loggedInUserId = ref(null);
const hasGoogleCalendarId = computed(() => {
    if (!logged_user.value) return false;
    if(logged_user.value[0] && logged_user.value[0].google_calendar_id) return true;
    return false;
});
const scopeOptions = ref([
    { label: '自身', value: 'user' },
    { label: '全体', value: 'all' }
]);
const loading = ref(false);
const allRawActions = ref([]);

// Data for cards - computed from allRawActions
const scheduledActions = computed(() => allRawActions.value
    .filter(a => a.status === 'scheduled' && new Date(a.action_datetime) >= new Date()).sort((a,b) => new Date(a.action_datetime) - new Date(b.action_datetime))
);
const pendingActions = computed(() => allRawActions.value
    .filter(a => a.status === 'pending' && (!a.due_date || new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0)) ) ).sort((a,b) => (a.due_date && b.due_date) ? (new Date(a.due_date) - new Date(b.due_date)) : !a.due_date ? 1 : -1)
);
const needsFollowUpActions = computed(() => allRawActions.value
    .filter(a => a.due_date && new Date(a.due_date) < new Date(new Date().setHours(0,0,0,0)) && a.status !== 'completed' && a.status !== 'cancelled').sort((a,b) => new Date(a.due_date) - new Date(b.due_date))
);

// Data for main table - can be same as allRawActions or further filtered if needed
const allActions = computed(() => allRawActions.value);

// Modal State for action lists
const isModalVisible = ref(false);
const modalTitle = ref('');
const modalData = ref([]);

// DataTable Filters
const filters = ref({
    'global': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'action_type': { value: null, matchMode: FilterMatchMode.EQUALS },
    'subject': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'client_name': { value: null, matchMode: FilterMatchMode.CONTAINS },
    'status': { value: null, matchMode: FilterMatchMode.EQUALS },
    'assigned_to_name': {value: null, matchMode: FilterMatchMode.CONTAINS}
});

// Translation Mappings (Kept in parent as they are used by DataTable columns)
const actionTypeTranslations = {
    'visit': '訪問',
    'call': '電話',
    'email': 'メール',
    'meeting': '会議',
    'task': 'タスク',
    'note': 'メモ'
};
const statusTranslations = {
    'pending': '保留中',
    'scheduled': '予定',
    'completed': '完了',
    'cancelled': 'キャンセル',
    'rescheduled': '再スケジュール',
    'needs_follow_up': '要フォローアップ'
};

// Options for filters and forms (Passed to dialog)
const actionTypeOptions = ref(
    Object.entries(actionTypeTranslations).map(([value, label]) => ({ label, value }))
);
const statusOptions = ref(
    Object.entries(statusTranslations)
        .filter(([value, label]) => value !== 'needs_follow_up') // Filter out 'needs_follow_up' from selectable options
        .map(([value, label]) => ({ label, value }))
);

const getEffectiveStatus = (action, due_date) => {
    const now = new Date();
    now.setHours(0,0,0,0); // Start of today for due_date comparison

    if (action === 'completed' || action === 'cancelled') {
        return action;
    }
    if (due_date && new Date(due_date) < now) {
        return 'needs_follow_up';
    }
    return action;
};

// Helper functions for translation (Kept in parent as used by DataTable)
const translateActionType = (typeKey) => actionTypeTranslations[typeKey] || typeKey;
const translateStatus = (status, due_date) => {
    const eStatus = getEffectiveStatus(status, due_date);
    return statusTranslations[eStatus] || status;
};

// DataTable row actions menu
const actionMenu = ref();
const currentActionItem = ref(null); // To store the action item for the menu
const actionMenuItems = ref([
    { label: '編集', icon: 'pi pi-pencil', command: () => { if(currentActionItem.value) openEditActionDialog(currentActionItem.value); } },
    { label: '削除', icon: 'pi pi-trash', command: () => { if(currentActionItem.value) deleteActionHandler(currentActionItem.value.id); } }
]);
const goToEditClientPage = (clientId) => {
    window.open(`/crm/clients/edit/${clientId}`, '_blank');
};

const toggleActionMenu = (action, event) => {
    currentActionItem.value = action;
    actionMenu.value.toggle(event);
};

// --- Date Formatting Helpers ---
const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Using Japan standard time for formatting display, adjust if needed
    return date.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
};
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format without the hour and minute
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Tokyo'
    });
};

// --- Severity Helpers for Tags ---
const getActionTypeSeverity = (actionType) => {
    const severities = {
        visit: 'primary',
        call: 'info',
        email: 'info',
        meeting: 'primary',
        task: 'secondary',
        note: 'warn'
    };
    return severities[actionType] || 'info';
};
const getStatusSeverity = (status, due_date) => {
    const eStatus = getEffectiveStatus(status, due_date);
    const severities = {
        pending: 'warn',
        scheduled: 'info',
        completed: 'success',
        cancelled: 'danger',
        rescheduled: 'primary',
        needs_follow_up: 'danger'
    };
    return severities[eStatus] || 'info';
};

// --- Action Form Dialog State and Methods (Updated for component usage) ---
const isActionFormDialogVisible = ref(false);
const actionFormMode = ref('create'); // 'create' or 'edit'
const actionDataForDialog = ref(null); // Data passed to the SalesActionDialog for editing

const openNewActionDialog = () => {
    actionFormMode.value = 'create';
    actionDataForDialog.value = {
        action_datetime: new Date(),
        status: 'pending',
        action_type: 'call',
        assigned_to: logged_user.value && logged_user.value[0] ? logged_user.value[0].id : null,
    };
    isActionFormDialogVisible.value = true;
};

const openEditActionDialog = (action) => {
    actionFormMode.value = 'edit';
    actionDataForDialog.value = { ...action }; // Pass a copy of the action data
    isActionFormDialogVisible.value = true;
};

const closeActionFormDialog = () => {
    isActionFormDialogVisible.value = false;
    actionDataForDialog.value = null; // Clear data when dialog closes
};

// This method now handles the 'save-action' event from SalesActionDialog
const handleSaveAction = async (formData) => {
    console.log("Action data received from dialog:", formData);
    loading.value = true;

    try {
        if (!formData.id) {
            await addAction(formData);
            toast.add({ severity: "success", summary: "Success", detail: "新規アクション登録されました。", life: 3000 });
        } else {
            await editAction(formData.id, formData);
            toast.add({ severity: "info", summary: "Edit", detail: "アクション編集されました。", life: 3000 });
        }

        // Refresh data after save/edit
        await fetchDataBasedOnScope();

    } catch (error) {
        console.error('Failed to save action:', error);
        toast.add({ severity: "error", summary: "保存失敗", detail: error.message || "アクションの保存に失敗しました。", life: 3000 });
    } finally {
        loading.value = false;
        closeActionFormDialog(); // Close dialog after successful save
    }
};

const deleteActionHandler = async (id) => {
    if (!id) {
        toast.add({ severity: "error", summary: "エラー", detail: "アクションIDが無効です", life: 3000 });
        return;
    }

    loading.value = true;
    try {
        await removeAction(id); // This now comes from useCRMStore

        toast.add({ severity: "success", summary: "Success", detail: "アクションが削除されました。", life: 3000 });

        await fetchDataBasedOnScope(); // Refresh data after deletion

    } catch (error) {
        console.error('Failed to delete action:', error);
        toast.add({ severity: "error", summary: "削除失敗", detail: error.message || "アクションの削除に失敗しました。", life: 3000 });
    } finally {
        loading.value = false;
    }
};

// Helper to fetch data based on selectedScope
const fetchDataBasedOnScope = async () => {
    if (selectedScope.value === 'user') {
        await fetchUserActions(loggedInUserId.value);
        allRawActions.value = [...user_actions.value];
    } else {
        await fetchAllActions();
        allRawActions.value = [...actions.value];
    }
};

// --- Google Calendar ---
const isSubmitting = ref(false);
const isSyncingCalendar = ref(false);
const setupDedicatedCalendar = async () => {
    if (isSubmitting.value || isSyncingCalendar.value) return;
    isSubmitting.value = true;

    try {
        await createUserCalendar();
        await fetchUser(); // Re-fetch user to update hasGoogleCalendarId
        toast.add({ severity: 'success', summary: 'Success', detail: 'Googleカレンダー作成されました。', life: 3000 });
    } catch (err) {
        const error = err.message || 'Failed to setup dedicated calendar.';
        toast.add({ severity: 'error', summary: 'Setup Error', detail: error, life: 3000 });
    } finally {
        isSubmitting.value = false;
    }
};
const handleManualSync = async () => {
    if (isSubmitting.value || isSyncingCalendar.value) return;
    isSyncingCalendar.value = true;

    try {
        const response = await triggerCalendarSyncStore();
        toast.add({
            severity: 'success',
            summary: 'Calendar Sync',
            detail: response.message || 'Synchronization with Google Calendar has completed.',
            life: 5000
        });
        if (response.details) {
            console.log("Sync details:", response.details);
            let detailMsg = `Created: ${response.details.actionsCreated}, Updated: ${response.details.actionsUpdated}, Failed: ${response.details.actionsFailed}`;
            toast.add({ severity: 'info', summary: 'Sync Stats', detail: detailMsg, life: 6000 });
        }
        await fetchDataBasedOnScope(); // Refresh data after sync
    } catch (err) {
        toast.add({
            severity: 'error',
            summary: 'Sync Error',
            detail: err.message || 'Could not sync with Google Calendar.',
            life: 5000
        });
    } finally {
        isSyncingCalendar.value = false;
    }
};

// --- Modal Methods for Action Lists ---
const openModal = (type) => {
    switch (type) {
        case 'scheduled':
            modalTitle.value = '今後の予定 アクション';
            modalData.value = scheduledActions.value;
            break;
        case 'pending':
            modalTitle.value = '保留中のアクション';
            modalData.value = pendingActions.value;
            break;
        case 'needs_follow_up':
            modalTitle.value = 'フォローアップが必要なアクション';
            modalData.value = needsFollowUpActions.value;
            break;
    }
    isModalVisible.value = true;
};

const closeModal = () => {
    isModalVisible.value = false;
    modalTitle.value = '';
    modalData.value = [];
};

// --- Lifecycle Hooks & Watchers ---
onMounted( async () => {
    loading.value = true;
    try {
        await fetchUser();
        if (logged_user.value && logged_user.value[0]) {
            loggedInUserId.value = logged_user.value[0].id;
        } else {
            console.error("Logged in user not found.");
            toast.add({ severity: "error", summary: "エラー", detail: "ログインユーザー情報を取得できませんでした。", life: 3000 });
            loading.value = false;
            return;
        }
        await fetchUsers(); // Fetch all users for 'assigned to' dropdown

        // Fetch initial actions based on scope
        await fetchDataBasedOnScope();

        // Fetch all clients if not already loaded (for AutoComplete)
        if (!clients.value || clients.value.length === 0) {
            if (setClientsIsLoading) setClientsIsLoading(true);
            try {
                // Assuming fetchClients fetches all clients when called without pagination params
                await fetchClients(); // Adjust this based on your actual fetchClients implementation
            } catch (error) {
                console.error("Failed to fetch clients:", error);
            } finally {
                if (setClientsIsLoading) setClientsIsLoading(false);
            }
        }
    } catch (error) {
        console.error("Error during onMounted:", error);
        toast.add({ severity: "error", summary: "初期化エラー", detail: "データの読み込みに失敗しました。", life: 3000 });
    } finally {
        loading.value = false;
    }
});

// Watch for scope changes to re-fetch actions
watch(selectedScope, async (newScope) => {
    loading.value = true;
    allRawActions.value = []; // Clear current actions before fetching new ones
    try {
        await fetchDataBasedOnScope();
    } catch (error) {
       console.error(`Failed to fetch actions for scope '${newScope}':`, error);
    } finally {
        loading.value = false;
    }
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
/* The client-option-item hover style was moved to SalesActionDialog.vue */
</style>
