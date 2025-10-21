<template>
  <div class="card">    
    <div class="card-body">
      <div class="mb-4">
        <FloatLabel>
          <DatePicker v-model="selectedDate" inputId="log-date" class="w-full" dateFormat="yy/mm/dd" />
          <label for="log-date">日付を選択</label>
        </FloatLabel>
      </div>
      <div class="flex justify-content-end mb-4">
        <Button label="CSVエクスポート" icon="pi pi-download" @click="exportCsv" />
      </div>
      <DataTable ref="dt" :value="logs" :loading="loading" responsiveLayout="scroll" emptyMessage="選択した日付にログがありません。"
        paginator :rows="rows" :totalRecords="totalRecords" @page="onPage"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        currentPageReportTemplate="{first}-{last} of {totalRecords}">
        <Column field="id" header="ログID"></Column>
        <Column field="log_time" header="ログ時刻">
          <template #body="slotProps">
            {{ new Date(slotProps.data.log_time).toLocaleString() }}
          </template>
        </Column>
        <Column field="user_id" header="ユーザーID"></Column>
        <Column header="詳細">
          <template #body="slotProps">
            {{ slotProps.data.table_name }} - {{ slotProps.data.action }}
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import FloatLabel from 'primevue/floatlabel';
import Button from 'primevue/button'; // Import Button component
import { ref, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';
import { useSystemLogs } from '@/composables/useSystemLogs';

const toast = useToast();
const selectedDate = ref(new Date());
const { logs, loading, fetchLogs: systemLogsFetchLogs } = useSystemLogs();

const dt = ref(); // Reference to the DataTable
const rows = ref(10); // Number of rows per page
const totalRecords = ref(0); // Total number of records

const onPage = (event) => {
  rows.value = event.rows;
  // In a real application, you would re-fetch logs based on the new page and rows
  // For now, we'll just update the rows value.
  console.log('Pagination event:', event);
};

const loadLogs = async () => {
  const date = formatDate(selectedDate.value);
  const response = await systemLogsFetchLogs(date);
  totalRecords.value = response.totalRecords; // Assuming response contains totalRecords
};

onMounted(() => {
  loadLogs();
});

watch(selectedDate, (newDate) => {
  loadLogs();
});

const exportCsv = () => {
  dt.value.exportCSV();
};
</script>
