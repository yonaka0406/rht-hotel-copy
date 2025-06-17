<template>
  <div class="project-list-all-page">
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
    <div class="add-project-form-container my-4">
      <ProjectAddForm @project-added="handleProjectAdded" />
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
      <DataTable :value="allProjects" :paginator="true" :rows="currentRowsPerPage" :totalRecords="allProjectsTotalCount"
                 @page="onPageChange" lazy responsiveLayout="scroll" class="p-datatable-sm">
        <Column field="project_name" header="プロジェクト名" :sortable="true" style="min-width: 200px;"></Column>
        <Column field="bid_date" header="入札日" :sortable="true">
            <template #body="slotProps">{{ formatDateDisplay(slotProps.data.bid_date) }}</template>
        </Column>
        <Column field="order_source" header="発注元" :sortable="true"></Column>
        <Column field="project_location" header="工事場所" :sortable="true"></Column>
        <Column field="target_store" header="対象店舗" :sortable="true">
          <template #body="slotProps">
            <pre>{{ formatJsonDisplay(slotProps.data.target_store) }}</pre>
          </template>
        </Column>
        <Column field="budget" header="予算" :sortable="true">
           <template #body="slotProps">{{ formatCurrency(slotProps.data.budget) }}</template>
        </Column>
        <Column field="assigned_work_content" header="作業内容" :sortable="true" style="white-space: pre-wrap; min-width: 250px;"></Column>
        <Column field="specific_specialized_work_applicable" header="専門工事該当" :sortable="true" style="min-width: 150px;">
          <template #body="slotProps">{{ slotProps.data.specific_specialized_work_applicable ? '該当' : '非該当' }}</template>
        </Column>
        <Column field="start_date" header="開始日" :sortable="true">
            <template #body="slotProps">{{ formatDateDisplay(slotProps.data.start_date) }}</template>
        </Column>
        <Column field="end_date" header="終了日" :sortable="true">
            <template #body="slotProps">{{ formatDateDisplay(slotProps.data.end_date) }}</template>
        </Column>
        <Column field="created_at" header="作成日時" :sortable="true" style="min-width: 150px;">
            <template #body="slotProps">{{ formatDateTimeDisplay(slotProps.data.created_at) }}</template>
        </Column>
         <!-- Consider adding an actions column for edit/view details later -->
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProjectStore } from '@/composables/useProjectStore'; 
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ProgressSpinner from 'primevue/progressspinner';
import Divider from 'primevue/divider';
import FloatLabel from 'primevue/floatlabel'; // Import FloatLabel
import ProjectAddForm from '@/pages/CRM/components/ProjectAddForm.vue'; // Import ProjectAddForm

const projectStore = useProjectStore();
// Destructure reactive properties and methods from the store
// Need to use store directly or toRefs for reactive updates from the store
const { allProjects, isLoadingAllProjects, allProjectsTotalCount, fetchAllProjects } = projectStore;

const localSearchTerm = ref('');
const currentPage = ref(1); // Tracks the current page number for the API request
const currentRowsPerPage = ref(10); // Default rows per page

const loadProjects = async () => {
  await fetchAllProjects({
    page: currentPage.value,
    limit: currentRowsPerPage.value,
    searchTerm: localSearchTerm.value,
    // filters: {} // Add filters later if implemented
  });
};

onMounted(() => {
  loadProjects(); // Load initial data
});

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

const handleProjectAdded = () => {
  // Optionally, show a toast or message
  console.log('Project added event received, refreshing project list...');
  currentPage.value = 1; // Reset to first page to ensure the new item is visible
  loadProjects();
};

const formatJsonDisplay = (data) => {
  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data, null, 2);
  }
  if (typeof data === 'string') { // If it's a string, try to parse then stringify nicely
      try {
          return JSON.stringify(JSON.parse(data), null, 2);
      } catch (e) {
          // If parsing fails, return the original string
          return data;
      }
  }
  return String(data); // Fallback for other types
};

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

const formatDateTimeDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.project-list-all-page {
  padding: 1rem;
}
.search-filters {
  /* Tailwind 'my-4' handles margin, specific margin-bottom here might be redundant or override */
  /* display: flex; already handled by Tailwind flex */
  /* justify-content: space-between; already handled by Tailwind justify-between */
}
.add-project-form-container {
  /* Tailwind 'my-4' handles margin */
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
