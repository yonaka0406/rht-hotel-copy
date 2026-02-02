<template>
  <div class="project-list-all-page">
    <ConfirmDialog />
    <Toast position="top-right" />
    <h1>PJ・工事一覧</h1>
    <!-- Search and Filter UI will go here -->
    <div class="search-filters my-4 flex justify-between items-center">
      <FloatLabel class="flex-grow mr-2">
        <InputText id="projectSearchTerm" class="w-full" v-model="localSearchTerm" @keyup.enter="applySearch" />
        <label for="projectSearchTerm">プロジェクト検索...</label>
      </FloatLabel>
      <!-- Add more filter components here later -->
      <Button label="検索" icon="pi pi-search" @click="applySearch" />
    </div>

    <!-- Project Add Form will go here (Step 3 of plan) -->
    <!-- Removed Accordion for Project Add Form -->
    <div class="toolbar-container my-4 flex justify-start">
        <Button label="新規プロジェクト追加" icon="pi pi-plus" class="p-button-success" @click="openAddNewProjectDialog" />
    </div>
    
    <Divider />

    <!-- Project List / Table will go here -->
    <div v-if="isLoadingAllProjects" class="loading-spinner">
      <ProgressSpinner />
    </div>
    <div v-else-if="allProjects.length === 0" class="no-projects">
      該当するプロジェクトが見つかりません。
    </div>
    <div v-else class="project-table-container">
      <DataTable :value="allProjects" :paginator="true" :rows="currentRowsPerPage"
                 :totalRecords="allProjectsTotalCount"
                 @page="onPageChange" lazy responsiveLayout="scroll"
                 class="p-datatable-sm"
                 stateStorage="session"
                 removableSort>
        <Column field="project_name" header="プロジェクト名" :sortable="true" style="min-width: 200px;">
          <template #body="slotProps">{{ slotProps.data.project_name }}</template>
        </Column>
        <Column field="derived_prime_contractor_name" header="元請け企業" :sortable="true" style="min-width: 150px;">
          <template #body="slotProps">
            <span v-if="slotProps.data.related_clients && Array.isArray(slotProps.data.related_clients)">
              {{
                getClientNameById(
                  (slotProps.data.related_clients.find(rc => rc.role === '元請業者') || {}).clientId
                )
              }}
            </span>
            <span v-else>N/A</span>
          </template>
        </Column>
        <Column field="bid_date" header="入札日" :sortable="true" dataType="date">
          <template #body="slotProps">{{ formatDateDisplay(slotProps.data.bid_date) }}</template>
        </Column>
        <Column field="budget" header="予算" :sortable="true" dataType="numeric">
          <template #body="slotProps">{{ formatCurrency(slotProps.data.budget) }}</template>
        </Column>
        <Column field="order_source" header="発注元" :sortable="true">
          <template #body="slotProps">{{ slotProps.data.order_source }}</template>
        </Column>
        <Column field="project_location" header="工事場所" :sortable="true">
          <template #body="slotProps">{{ slotProps.data.project_location }}</template>
        </Column>
        <Column field="start_date" header="開始日" :sortable="true" dataType="date">
          <template #body="slotProps">{{ formatDateDisplay(slotProps.data.start_date) }}</template>
        </Column>
        <Column field="end_date" header="終了日" :sortable="true" dataType="date">
          <template #body="slotProps">{{ formatDateDisplay(slotProps.data.end_date) }}</template>
        </Column>
        <Column field="target_store" header="対象店舗" :sortable="true">
          <template #body="slotProps">
            <div v-if="Array.isArray(slotProps.data.target_store) && slotProps.data.target_store.length > 0" class="flex flex-wrap gap-1">
              <Tag
                v-for="(hotel, index) in slotProps.data.target_store"
                :key="hotel.hotelId || index"
                :value="hotel.formal_name"
                severity="info"
              ></Tag>
            </div>
            <span v-else>N/A</span>
          </template>
        </Column>
        <Column header="操作" style="min-width: 130px; text-align: center;">
          <template #body="slotProps">
            <SplitButton
              label="編集"
              icon="pi pi-pencil"
              @click="() => handleEditProject(slotProps.data)"
              :model="projectActionItems.map(item => ({ ...item, command: () => item.command(slotProps.data) }))"
              class="p-button-sm p-button-raised p-button-rounded"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <Dialog
      v-model:visible="displayProjectDialog"
      :header="projectDialogHeader"
      :modal="true"
      :style="{ width: '70vw', 'min-width': '600px', 'max-width': '900px' }"
      @hide="onDialogClose"
      :draggable="false"
      position="top"
      class="p-fluid"
    >
      <ProjectFormDialog
        v-if="displayProjectDialog"
        :projectDataToEdit="projectToEdit"
        @close-dialog="onDialogClose"
        @project-saved="onProjectSaved"
        :currentClientId="null"
        />
    </Dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectStore } from '@/composables/useProjectStore';
import { useClientStore } from '@/composables/useClientStore'; // Import useClientStore
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Divider from 'primevue/divider';
import FloatLabel from 'primevue/floatlabel'; // Import FloatLabel
import Tag from 'primevue/tag'; // Import Tag
import SplitButton from 'primevue/splitbutton'; // Import SplitButton
import Dialog from 'primevue/dialog'; // Import Dialog
import { useConfirm } from 'primevue/useconfirm'; // Import useConfirm
import ConfirmDialog from 'primevue/confirmdialog'; // Import ConfirmDialog
import { useToast } from 'primevue/usetoast'; // Import useToast
import Toast from 'primevue/toast'; // Import Toast
import ProjectFormDialog from '@/pages/CRM/components/ProjectFormDialog.vue'; // Updated import

const projectStore = useProjectStore();
const confirm = useConfirm();
const toast = useToast(); // Get toast service instance

// Destructure reactive properties and methods from the store
const {
    allProjects,
    isLoadingAllProjects,
    allProjectsTotalCount,
    fetchAllProjects,
    deleteProjectById
} = projectStore;

const clientStore = useClientStore();
const { clients: allClientsList, fetchAllClientsForFiltering: fetchAllClientsListAction } = clientStore; // Destructure client list and fetch action

const localSearchTerm = ref('');
const currentPage = ref(1);
const currentRowsPerPage = ref(10);

const displayProjectDialog = ref(false);
const projectToEdit = ref(null);
const dialogMode = computed(() => projectToEdit.value && projectToEdit.value.id ? 'edit' : 'add');
const projectDialogHeader = computed(() => dialogMode.value === 'edit' ? 'プロジェクト編集' : '新規プロジェクト追加');

const loadProjects = async () => {
  await fetchAllProjects({
    page: currentPage.value,
    limit: currentRowsPerPage.value,
    searchTerm: localSearchTerm.value
  });
};

onMounted(async () => { // Make onMounted async
  await loadProjects(); // Load initial project data
});

const clientNamesCache = ref({});
const getClientNameById = (clientId) => {
  if (!clientId) return '該当なし';
  if (clientNamesCache.value[clientId]) return clientNamesCache.value[clientId];

  // Trigger fetch if not in cache
  fetchClientName(clientId);
  return '読み込み中...';
};

const fetchClientName = async (clientId) => {
  if (clientNamesCache.value[clientId]) return;
  clientNamesCache.value[clientId] = '...'; // Placeholder to prevent duplicate fetches

  const authToken = localStorage.getItem('authToken');
  try {
    const response = await fetch(`/api/client/${clientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('Fetch failed');
    const result = await response.json();
    const client = result.client;
    clientNamesCache.value[clientId] = client.name_kanji || client.name_kana || client.name || '不明';
  } catch (error) {
    console.error('Failed to fetch client name:', error);
    clientNamesCache.value[clientId] = 'エラー';
  }
};

const applySearch = () => {
  currentPage.value = 1; // Reset to first page on new search/filter
  loadProjects();
};

const onPageChange = (event) => {
  // event.page is 0-indexed, API expects 1-indexed
  currentPage.value = event.page + 1; 
  currentRowsPerPage.value = event.rows;
  loadProjects();
};
/*
const handleProjectAdded = () => { // This function might be replaced by onProjectSaved
  console.log('Project added event received (handleProjectAdded), refreshing project list...');
  currentPage.value = 1;
  loadProjects();
};
*/
const openAddNewProjectDialog = () => {
  projectToEdit.value = null;
  displayProjectDialog.value = true;
};

const handleEditProject = (project) => {
  console.log('Opening edit dialog for project:', project);
  projectToEdit.value = { ...project };
  displayProjectDialog.value = true;
};

const onDialogClose = () => {
  displayProjectDialog.value = false;
  projectToEdit.value = null;
};

const onProjectSaved = () => {
  onDialogClose();
  loadProjects();
  // Toast for save can be added here if not handled inside ProjectFormDialog, or if a generic message is preferred.
  // toast.add({ severity: 'success', summary: '成功', detail: 'プロジェクトが保存されました。', life: 3000 });
};

const handleDeleteProject = (project) => {
  confirm.require({
    message: `プロジェクト「${project.project_name}」を削除してもよろしいですか？この操作は元に戻せません。`, // Are you sure you want to delete project X? This action cannot be undone.
    header: '削除の確認', // Delete Confirmation
    icon: 'pi pi-info-circle',
    rejectClass: 'p-button-text p-button-text',
    acceptClass: 'p-button-danger',
    acceptLabel: 'はい、削除します', // Yes, delete
    rejectLabel: 'キャンセル', // Cancel
    accept: async () => { // Make accept callback async
      try {
        await deleteProjectById(project.id); // Call the store action
        toast.add({
          severity: 'success',
          summary: '成功', // Success
          detail: `プロジェクト「${project.project_name}」が削除されました。`, // Project X was deleted.
          life: 3000
        });
        loadProjects(); // Refresh the project list
      } catch (error) {
        console.error('Failed to delete project:', error);
        toast.add({
          severity: 'error',
          summary: 'エラー', // Error
          detail: error.message || 'プロジェクトの削除に失敗しました。', // Failed to delete project.
          life: 5000
        });
      }
      confirm.close();
    },
    reject: () => {
      console.log('User rejected deletion for project:', project);
      toast.add({ severity: 'info', summary: 'キャンセルされました', detail: '削除処理はキャンセルされました。', life: 3000 }); // Deletion cancelled.
      confirm.close();
    }
  });
};

const projectActionItems = ref([
  {
    label: '削除', // Delete
    icon: 'pi pi-trash',
    command: (project) => handleDeleteProject(project) // Command will be called with the project
  }
]);

const formatCurrency = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return '';
  const number = parseFloat(value);
  if (isNaN(number)) return '';
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(number);
};

const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid after parsing
    if (isNaN(date.getTime())) {
        return ''; // Or return the original string, or a specific message
    }
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

</script>

<style scoped>
.project-list-all-page {
  padding: 1rem;
}
.loading-spinner, .no-projects {
  text-align: center;
  margin-top: 2rem;
}
.p-datatable-sm :deep(.p-datatable-thead > tr > th) {
    padding: 0.5rem;
}
.p-datatable-sm :deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem;
    vertical-align: top; /* Align content to the top for cells with pre-wrap */
}
pre {
  white-space: pre-wrap;       /* Since CSS 2.1 */
  word-wrap: break-word;       /* Internet Explorer 5.5+ */
  margin: 0;                   /* Reset default pre margin */
  font-family: inherit;        /* Inherit font from DataTable */
}
</style>
