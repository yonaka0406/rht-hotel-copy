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

    <Dialog v-model:visible="isActionFormDialogVisible"
        :header="actionFormMode === 'create' ? '新規アクション作成' : 'アクション編集'"
        :modal="true" :style="{width: '60vw'}" @hide="closeActionFormDialog" class="p-fluid"
    >
        <form @submit.prevent="handleSaveAction" class="flex flex-col gap-y-3"> 
            <div class="field">
                <label for="client">クライアント</label>                
                <AutoComplete
                    v-model="selectedClientObjectForForm"
                    :suggestions="filteredClientsForForm"
                    optionLabel="display_name" 
                    @complete="searchClientsInForm"
                    placeholder="クライアントを選択・検索"
                    :disabled="actionFormMode === 'edit' && !!currentActionFormData.client_id"
                    :loading="clientsIsLoading"
                    forceSelection
                    dropdown
                    style="width: 100%;"
                    panelClass="max-h-60 overflow-y-auto" 
                >
                    <template #option="slotProps">
                    <div class="client-option-item p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                        <p class="font-medium">
                        <i v-if="slotProps.option.is_legal_person" class="pi pi-building mr-2 text-gray-500"></i>
                        <i v-else class="pi pi-user mr-2 text-gray-500"></i>
                        {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                        <span v-if="slotProps.option.name_kana" class="text-sm text-gray-500"> ({{ slotProps.option.name_kana }})</span>
                        </p>
                        <div class="flex items-center gap-x-3 mt-1 text-xs">
                        <span v-if="slotProps.option.phone" class="text-sky-700"><i class="pi pi-phone mr-1"></i>{{ slotProps.option.phone }}</span>
                        <span v-if="slotProps.option.email" class="text-sky-700"><i class="pi pi-at mr-1"></i>{{ slotProps.option.email }}</span>
                        <span v-if="slotProps.option.fax" class="text-sky-700"><i class="pi pi-send mr-1"></i>{{ slotProps.option.fax }}</span>
                        </div>
                    </div>
                    </template>
                    <template #empty>
                    <div class="p-3 text-center text-gray-500">該当するクライアントが見つかりません。</div>
                    </template>
                </AutoComplete>
            </div>

            <div class="field">
                <label for="actionDateTime">日時</label>
                <DatePicker id="actionDateTime" v-model="currentActionFormData.action_datetime" :showTime="true" :showSeconds="false" hourFormat="24" dateFormat="yy/mm/dd" style="width: 100%;"/>
            </div>

            <div class="field">
                <label for="subject">件名</label>
                <InputText id="subject" v-model.trim="currentActionFormData.subject" fluid />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <div class="field">
                    <label for="actionType">アクションタイプ</label>
                    <Select id="actionType" v-model="currentActionFormData.action_type" :options="actionTypeOptions" optionLabel="label" optionValue="value" placeholder="タイプを選択" style="width: 100%;"/>
                </div>
                <div class="field">
                    <label for="status">ステータス</label>
                    <Select id="status" v-model="currentActionFormData.status" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="ステータスを選択" style="width: 100%;"/>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <div class="field">
                    <label for="assignedTo">担当者</label>
                    <Select id="assignedTo" v-model="currentActionFormData.assigned_to" :options="users" optionLabel="name" optionValue="id" placeholder="担当者を選択" :filter="true" :showClear="true" style="width: 100%;"/>
                </div>
                <div class="field">
                    <label for="dueDate">期日</label>
                    <DatePicker id="dueDate" v-model="currentActionFormData.due_date" dateFormat="yy/mm/dd" :showTime="false" style="width: 100%;"/>
                </div>
            </div>
            <div class="field">
                <label for="details">詳細</label>
                <Textarea id="details" v-model="currentActionFormData.details" rows="3" fluid/>
            </div>

            <div class="field">
                <label for="outcome">結果</label>
                <Textarea id="outcome" v-model="currentActionFormData.outcome" rows="2" fluid/>
            </div>

            <div class="flex justify-end gap-2 mt-4">
                <Button label="キャンセル" icon="pi pi-times" class="p-button-text p-button-danger" @click="closeActionFormDialog" />
                <Button type="submit" :label="actionFormMode === 'create' ? '作成' : '保存'" icon="pi pi-check" class="p-button-text" />
            </div>
        </form>
    </Dialog>
</template>
  
<script setup>
    // Vue    
    import { ref, computed, onMounted, watch } from "vue";
    
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
        if (!logged_user) return;        
        if(logged_user.value[0] && logged_user.value[0].google_calendar_id) return true;
        return false;
    });
    const scopeOptions = ref([
        { label: '自身', value: 'user' },
        { label: '全体', value: 'all' }
    ]);
    const loading = ref(false);
    const allRawActions = ref([]);

    // --- AutoComplete State for Client Selection in Form ---
    const selectedClientObjectForForm = ref(null); // v-model for AutoComplete, stores the selected client object
    const filteredClientsForForm = ref([]); // Suggestions for AutoComplete

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

    // Modal State
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

    // Translation Mappings
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
    // Options for filters and forms    
    const actionTypeOptions = ref(
        Object.entries(actionTypeTranslations).map(([value, label]) => ({ label, value }))
    );
    const statusOptions = ref(
        Object.entries(statusTranslations)
            .filter(([value, label]) => value !== 'needs_follow_up') // Filter out 'needs_follow_up'
            .map(([value, label]) => ({ label, value }))
    );

    // --- Normalization Helper Functions ---
    const normalizeKana = (str) => {
    if (!str) return '';
        let normalizedStr = str.normalize('NFKC');
        normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => String.fromCharCode(char.charCodeAt(0) + 0x60));
        normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEC0));
        return normalizedStr;
    };
    const normalizePhone = (phone) => {
        if (!phone) return '';
        let normalized = phone.replace(/\D/g, '');
        normalized = normalized.replace(/^0+/, '');
        return normalized;
    };

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

    // Helper functions for translation
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

    // Action Form Dialog State
    const isActionFormDialogVisible = ref(false);
    const actionFormMode = ref('create'); // 'create' or 'edit'
    const initialActionFormData = { // For resetting the form
        id: null,
        client_id: null,
        action_type: 'call', // Default action type
        action_datetime: new Date(),
        subject: '',
        details: '',
        outcome: '',
        assigned_to: null,
        due_date: null,
        status: 'pending' // Default status
    };
    const currentActionFormData = ref({ ...initialActionFormData });

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

    // --- Client Search for AutoComplete in Form ---
    const searchClientsInForm = (event) => {
        const query = event.query.toLowerCase();
        const normalizedQuery = normalizePhone(query);
        const isNumericQuery = /^\d+$/.test(normalizedQuery);

        if (!clients.value || !Array.isArray(clients.value)) {
            filteredClientsForForm.value = [];
            return;
        }

        let results = clients.value.filter((client) => {
            const clientName = client.name || '';
            const clientNameKana = client.name_kana || '';
            const clientNameKanji = client.name_kanji || '';
            const clientEmail = client.email || '';
            const clientPhone = client.phone || '';
            const clientFax = client.fax || '';

            const matchesName =
                clientName.toLowerCase().includes(query) ||
                (clientNameKana && normalizeKana(clientNameKana).toLowerCase().includes(normalizeKana(query))) ||
                clientNameKanji.toLowerCase().includes(query);

            const matchesPhoneFax = isNumericQuery &&
                ((clientFax && normalizePhone(clientFax).includes(normalizedQuery)) ||
                 (clientPhone && normalizePhone(clientPhone).includes(normalizedQuery)));
            
            const matchesEmail = clientEmail.toLowerCase().includes(query);
            
            return matchesName || matchesPhoneFax || matchesEmail;
        });
        
        // Add display_name to results for AutoComplete input field rendering via optionLabel
        filteredClientsForForm.value = results.map(client => ({
            ...client,
            display_name: client.name_kanji || client.name || `ID: ${client.id}` // Fallback display name
        }));
    };

    // Watch for changes in selectedClientObjectForForm to update currentActionFormData.client_id
    watch(selectedClientObjectForForm, (newVal) => {
        if (newVal && typeof newVal === 'object' && newVal.id) {
            currentActionFormData.value.client_id = newVal.id;
        } else if (!newVal && currentActionFormData.value.client_id !== null) { 
            // Cleared or not an object, and client_id was previously set
            currentActionFormData.value.client_id = null;
        }
    });

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

    // --- Action Form Dialog Methods --- 
    const openNewActionDialog = () => {
        actionFormMode.value = 'create';
        currentActionFormData.value = {
            ...initialActionFormData,
            action_datetime: new Date(),
            due_date: null,
            assigned_to: logged_user.value && logged_user.value[0] ? logged_user.value[0].id : null
        };
        selectedClientObjectForForm.value = null;
        isActionFormDialogVisible.value = true;
    };
    const openEditActionDialog = (actionData) => {
        actionFormMode.value = 'edit';        
        currentActionFormData.value = {
            ...actionData,
            action_datetime: actionData.action_datetime ? new Date(actionData.action_datetime) : null,
            due_date: actionData.due_date ? new Date(actionData.due_date) : null,
        };
        if (currentActionFormData.value.client_id && clients.value) {
            const clientObj = clients.value.find(c => c.id === currentActionFormData.value.client_id);
            if (clientObj) {
                selectedClientObjectForForm.value = { 
                    ...clientObj, 
                    display_name: clientObj.name_kanji || clientObj.name || `ID: ${clientObj.id}`
                };
            } else {
                selectedClientObjectForForm.value = null; // Client not found in current list
                 toast.add({ severity: "warn", summary: "注意", detail: "関連クライアントが見つかりませんでした。リストを更新してください。", life: 4000 });
            }
        } else {
            selectedClientObjectForForm.value = null;
        }
        isActionFormDialogVisible.value = true;
    };
    const closeActionFormDialog = () => {
        isActionFormDialogVisible.value = false;
        selectedClientObjectForForm.value = null;        
    };
    const handleSaveAction = async () => {
        console.log("Saving action:", currentActionFormData.value);
        // --- Form Validation ---
        const { client_id, subject, assigned_to, id } = currentActionFormData.value;
        if (!client_id) {
            toast.add({ severity: "error", summary: "エラー", detail: "クライアントを選択してください", life: 3000 });
            return;
        }
        if (!subject) {
            toast.add({ severity: "error", summary: "エラー", detail: "件名を記入してください", life: 3000 });
            return;
        }
        if (!assigned_to) {
            toast.add({ severity: "error", summary: "エラー", detail: "担当者を選択してください", life: 3000 });
            return;
        }
        
        loading.value = true;
        
        try {
            if (!id) {                
                await addAction(currentActionFormData.value); // This now comes from useCRMStore
                toast.add({ severity: "success", summary: "Success", detail: "新規アクション登録されました。", life: 3000 });
            } else {                
                await editAction(id, currentActionFormData.value); // This now comes from useCRMStore
                toast.add({ severity: "info", summary: "Edit", detail: "アクション編集されました。", life: 3000 });
            }

            closeActionFormDialog();

            if(selectedScope.value === 'user'){
                await fetchUserActions(loggedInUserId.value);        
                allRawActions.value = user_actions.value;    
            } else {
                await fetchAllActions();
                allRawActions.value = actions.value;
            }        
        } catch (error) {
            console.error('Failed to save action:', error);
            toast.add({ severity: "error", summary: "保存失敗", detail: error.message || "アクションの保存に失敗しました。", life: 3000 });
        } finally {
            loading.value = false;
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

            if (selectedScope.value === 'user') {
                await fetchUserActions(loggedInUserId.value);
                allRawActions.value = user_actions.value;
            } else {
                await fetchAllActions();
                allRawActions.value = actions.value;
            }

        } catch (error) {
            console.error('Failed to delete action:', error);
            toast.add({ severity: "error", summary: "削除失敗", detail: error.message || "アクションの削除に失敗しました。", life: 3000 });
        } finally {
            loading.value = false;
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
        await fetchUser();
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
            // Optionally, display more details from response.details if needed
            if (response.details) {
            console.log("Sync details:", response.details);
            // Could add more toasts for created/updated/failed counts
            let detailMsg = `Created: ${response.details.actionsCreated}, Updated: ${response.details.actionsUpdated}, Failed: ${response.details.actionsFailed}`;
                toast.add({ severity: 'info', summary: 'Sync Stats', detail: detailMsg, life: 6000 });
            }
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

    // --- Lifecycle Hooks & Watchers ---
    onMounted( async () => {     
        loading.value = true;   
        try {
            await fetchUser();
            if (logged_user.value && logged_user.value[0]) {
                loggedInUserId.value = logged_user.value[0].id;
                 // Set default assigned_to for new actions if not already set
                if (initialActionFormData.assigned_to === null) {
                    initialActionFormData.assigned_to = logged_user.value[0].id;
                }
            } else {
                console.error("Logged in user not found.");
                toast.add({ severity: "error", summary: "エラー", detail: "ログインユーザー情報を取得できませんでした。", life: 3000 });
                loading.value = false;
                return;
            }
            await fetchUsers(); 

            if (selectedScope.value === 'user') {
                await fetchUserActions(loggedInUserId.value);    
                allRawActions.value = [...user_actions.value];
            } else {
                await fetchAllActions();
                allRawActions.value = [...actions.value];
            }

            if (!clients.value || clients.value.length === 0) {
                if (setClientsIsLoading) setClientsIsLoading(true);                 
                try {
                    const clientsTotalPages = await fetchClients(1); // Assuming fetchClients returns total pages or similar
                    // This logic might need adjustment based on actual fetchClients behavior (e.g., if it fetches all at once)
                    if (typeof clientsTotalPages === 'number' && clientsTotalPages > 1) { 
                        for (let page = 2; page <= clientsTotalPages; page++) {
                            await fetchClients(page);
                        }    
                    }    
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

    watch(selectedScope, async (newScope) => {  
        loading.value = true;
        allRawActions.value = [];
        try {
            if (newScope === 'user') {
                await fetchUserActions(loggedInUserId.value);
                allRawActions.value = user_actions.value;
            } else {
                await fetchAllActions();
                allRawActions.value = actions.value;
            }        
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
    .client-option-item:hover {
        background-color: #f9fafb; /* Tailwind gray-50 */
    }
</style>