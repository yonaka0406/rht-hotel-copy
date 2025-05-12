<template>
    
    <div class="p-4 min-h-screen">
        <div class="mb-4 flex justify-between items-center">
            <h1 class="font-semibold text-gray-700">やり取り一覧</h1>
            <Button label="新規アクション作成" icon="pi pi-plus" @click="openNewActionDialog" class="p-button-success" />
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
                            <Tag :value="translateActionType(data.action_type)" :severity="getActionTypeSeverity(data.action_type)" />
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
                    </Column>
                    <Column field="action_datetime" header="日時" :sortable="true" style="min-width:160px">
                        <template #body="{data}">
                            {{ formatDate(data.action_datetime) }}
                        </template>
                    </Column>
                    <Column field="due_date" header="期日" :sortable="true" style="min-width:160px">
                        <template #body="{data}">
                            {{ data.due_date ? formatDate(data.due_date) : 'N/A' }}
                        </template>
                    </Column>
                    <Column field="status" header="ステータス" :sortable="true" style="min-width:120px">
                         <template #body="{data}">
                            <Tag :value="translateStatus(data.status)" :severity="getStatusSeverity(data.status)" />
                        </template>
                        <template #filter="{filterModel,filterCallback}">
                            <Select v-model="filterModel.value" @change="filterCallback()" :options="statusOptions" optionLabel="label" optionValue="value" placeholder="ステータスを選択" class="p-column-filter" />
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
                    <Tag :value="translateActionType(data.action_type)" :severity="getActionTypeSeverity(data.action_type)" />
                </template>
            </Column>
            <Column field="subject" header="件名" :sortable="true"></Column>
            <Column field="client_name" header="クライアント" :sortable="true"></Column>
            <Column field="action_datetime" header="日時" :sortable="true">
                <template #body="{data}">{{ formatDate(data.action_datetime) }}</template>
            </Column>
            <Column field="due_date" header="期日" :sortable="true">
                    <template #body="{data}">{{ data.due_date ? formatDate(data.due_date) : 'N/A' }}</template>
            </Column>
            <Column field="status" header="ステータス" :sortable="true">
                    <template #body="{data}">
                    <Tag :value="translateStatus(data.status)" :severity="getStatusSeverity(data.status)" />
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
                <Select id="client" v-model="currentActionFormData.client_id" :options="clients" optionLabel="name" optionValue="id" placeholder="クライアントを選択" :filter="true" :loading="clientsIsLoading" :showClear="true" :disabled="actionFormMode === 'edit' && !!currentActionFormData.client_id" style="width: 100%;"></Select>
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
    import { Card, Dialog, Menu, InputText, DatePicker, Textarea, Select, SelectButton, Button, DataTable, Column, Tag, ProgressSpinner } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';
    
    // Stores
    import { useUserStore } from '@/composables/useUserStore';
    const { users, logged_user, fetchUsers, fetchUser } = useUserStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, clientsIsLoading, fetchClients, setClientsIsLoading } = useClientStore();
    
    // --- Reactive State ---
    const selectedScope = ref('user');
    const scopeOptions = ref([
        { label: '自身', value: 'user' },
        { label: '全体', value: 'all' }
    ]);
    const loading = ref(false);
    const allRawActions = ref([]);

    // Data for cards - computed from allRawActions
    const scheduledActions = computed(() => allRawActions.value.filter(a => a.status === 'scheduled' && new Date(a.action_datetime) >= new Date()).sort((a,b) => new Date(a.action_datetime) - new Date(b.action_datetime)));
    const pendingActions = computed(() => allRawActions.value.filter(a => a.status === 'pending' && (!a.due_date || new Date(a.due_date) >= new Date(new Date().setHours(0,0,0,0)) ) ).sort((a,b) => (a.due_date && b.due_date) ? (new Date(a.due_date) - new Date(b.due_date)) : !a.due_date ? 1 : -1));
    const needsFollowUpActions = computed(() => allRawActions.value.filter(a => a.due_date && new Date(a.due_date) < new Date(new Date().setHours(0,0,0,0)) && a.status !== 'completed' && a.status !== 'cancelled').sort((a,b) => new Date(a.due_date) - new Date(b.due_date)));

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
        Object.entries(statusTranslations).map(([value, label]) => ({ label, value }))
    );

    // Helper functions for translation
    const translateActionType = (typeKey) => actionTypeTranslations[typeKey] || typeKey;
    const translateStatus = (statusKey) => statusTranslations[statusKey] || statusKey;

    // DataTable row actions menu
    const actionMenu = ref();
    const currentActionItem = ref(null); // To store the action item for the menu    
    const actionMenuItems = ref([
        { label: '編集', icon: 'pi pi-pencil', command: () => { if(currentActionItem.value) openEditActionDialog(currentActionItem.value); } },
        { label: '削除', icon: 'pi pi-trash', command: () => { console.log('Delete action:', currentActionItem.value); /* Implement delete logic */ } }        
    ]);

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
        assigned_to: null, // Consider defaulting to logged-in user in create mode
        due_date: null,
        status: 'pending' // Default status
    };
    const currentActionFormData = ref({ ...initialActionFormData });

    const toggleActionMenu = (action, event) => {
        currentActionItem.value = action;
        actionMenu.value.toggle(event);
    };

    // --- Methods ---
    const fetchData = async () => {
        loading.value = true;
        console.log(`Workspaceing data for scope: ${selectedScope.value}`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        const mockData = [
            { id: 'uuid1', client_id: 'clientA_id', client_name: '株式会社A建設', action_type: 'meeting', action_datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), subject: '次期プロジェクト打ち合わせ', details: '詳細内容1', outcome: '', assigned_to: 1, assigned_to_name: '田中 太郎', due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), status: 'scheduled' },
            { id: 'uuid2', client_id: 'clientB_id', client_name: '合同会社B工業', action_type: 'call', action_datetime: new Date().toISOString(), subject: '見積もりフォローアップ', details: '詳細内容2', outcome: '担当者不在', assigned_to: 1, assigned_to_name: '田中 太郎', due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), status: 'needs_follow_up' },
            { id: 'uuid3', client_id: 'clientC_id', client_name: 'Cサービス株式会社', action_type: 'task', action_datetime: new Date().toISOString(), subject: '提案資料作成', details: '詳細内容3', outcome: '', assigned_to: 2, assigned_to_name: '佐藤 花子', due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' },
        ];

        if (selectedScope.value === 'user') {
            const loggedInUserId = 1; // Replace with actual logged-in user ID
            allRawActions.value = mockData.filter(a => a.assigned_to === loggedInUserId);
        } else {
            allRawActions.value = mockData;
        }
        loading.value = false;
    };
    
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // Using Japan standard time for formatting display, adjust if needed
        return date.toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
    };

    const getActionTypeSeverity = (actionType) => {
        const severities = {
            visit: 'info',
            call: 'success',
            email: 'warning',
            meeting: 'primary',
            task: 'secondary',
            note: 'contrast'
        };
        return severities[actionType] || 'info';
    };

    const getStatusSeverity = (status) => {
        const severities = {
            pending: 'warning',
            scheduled: 'info',
            completed: 'success',
            cancelled: 'danger',
            rescheduled: 'primary',
            needs_follow_up: 'danger'
        };
        return severities[status] || 'info';
    };


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

    // Action Form Dialog Methods    
    const openNewActionDialog = () => {
        actionFormMode.value = 'create';
        currentActionFormData.value = {
            ...initialActionFormData,
            action_datetime: new Date(),
            due_date: null,
            assigned_to: logged_user.value?.id || null
        };
        isActionFormDialogVisible.value = true;
    };

    const openEditActionDialog = (actionData) => {
        actionFormMode.value = 'edit';        
        currentActionFormData.value = {
            ...actionData,
            action_datetime: actionData.action_datetime ? new Date(actionData.action_datetime) : null,
            due_date: actionData.due_date ? new Date(actionData.due_date) : null,
        };
        isActionFormDialogVisible.value = true;
    };

    const closeActionFormDialog = () => {
        isActionFormDialogVisible.value = false;
        // It's good practice to reset the form data when closing
        // currentActionFormData.value = { ...initialActionFormData }; // Or just let it be overwritten on next open
    };

    const handleSaveAction = async () => {
        console.log("Saving action:", currentActionFormData.value);
        // Add form validation here (e.g., using Vuelidate or custom checks)
        // Example: if (!currentActionFormData.value.client_id || !currentActionFormData.value.subject) { alert("Client and Subject are required!"); return; }

        // --- !!! REPLACE WITH ACTUAL API CALL !!! ---
        // const payload = { ...currentActionFormData.value };
        // if (actionFormMode.value === 'create') {
        //     // await api.createAction(payload);
        //     console.log("Simulating API create call with payload:", payload);
        // } else {
        //     // await api.updateAction(payload.id, payload);
        //      console.log("Simulating API update call for ID:", payload.id, "with payload:", payload);
        // }

        // Simulate API call
        loading.value = true; // You might want a specific loading state for the form
        await new Promise(resolve => setTimeout(resolve, 700));
        loading.value = false;

        closeActionFormDialog();
        fetchData(); // Refresh the main actions list
        // Optionally, show a success toast message
    };

    // --- Lifecycle Hooks & Watchers ---
    onMounted( async () => {
        // Fetch CRM actions
        fetchData();

        // Fetch users
        await fetchUser();
        await fetchUsers();

        // Fetch clients if not already loaded
        if (clients.value && clients.value.length === 0) {
            if (setClientsIsLoading) setClientsIsLoading(true);                                 
            try {
                const clientsTotalPages = await fetchClients(1);
                // Fetch clients for all pages                
                for (let page = 2; page <= clientsTotalPages; page++) {
                    await fetchClients(page);
                }                
            } catch (error) {
                console.error("Failed to fetch clients:", error);                
            } finally {
                if (setClientsIsLoading) setClientsIsLoading(false);
            }
        }        
    });

    watch(selectedScope, () => {
        fetchData(); // Re-fetch data when scope changes
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